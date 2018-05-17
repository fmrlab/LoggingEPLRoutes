var gMap; // main google map
var gDirectionsService;
var gDirectionsRenderer = [];
var gDirectionsRenderer2 = [];
var gDirectionsRenderer3 = [];
var gUserMarker; // user clicked marker
var gLatlngbounds; // bounds object to include all points in routes to zoom in
var gClosestPolice = [];
var gClosestFireStation = [];
var gClosestHospital = [];
var gPolylineOptionsRoute1; // polyline options to use a different color for the closest route
var gNumberOfRoutes = 1; // how many of the closest routes to display
var gNumberOfPoints = 6; // how many of the closest points to collect
var gCallback = 3 * gNumberOfPoints;
var gKmzLayer;
var gPanelId;
var rendererToDisplay;

function initialize() {
	gDirectionsService = new google.maps.DirectionsService();
	gLatlngbounds = new google.maps.LatLngBounds();
	gPanelId = [ "police", "hospital", "fire" ];
	rendererToDisplay = gDirectionsRenderer;

	// create a google map object centered on Kentucky
	gMap = new google.maps.Map(document.getElementById("map-canvas"),{
		center: new google.maps.LatLng(37.6000, -84.1000), // KY coordinates
		zoom: 8,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
		},

	});

	// Load KML layer that defines the study area
	gKmzLayer = new google.maps.KmlLayer('http://www2.ca.uky.edu/forestry/loggingEPLroutes/assets/kml-data/StudyArea_Black.zip', { 
		clickable: false, 
		suppressInfoWindows: true, 
		preserveViewport: true 
	});
	
	gKmzLayer.setMap(gMap);

	populateAndDisplayMarkers();

	// add click event to place a marker on the map
	google.maps.event.addListener(gMap, 'click', function(event) {
		gUserMarker = placeMarker(event.latLng, gUserMarker, gMap);

		// enable the "Calculate routes" button
		if(document.getElementById('calc_route').disabled) {
			document.getElementById('calc_route').disabled = false;
		}
	});

	// Hide directions panel on map load. Panel only needs to be shown when calculate routes
	document.getElementById("panel-header").style.display = "none";
	document.getElementById("panel-body").style.display = "none";
}

/**
* Calculate route
* @param {google.maps.LatLng} start
* @param {google.maps.LatLng} end
* @param {Integer} routeNum
* @param {google.maps.DirectionsRenderer} directionsRenderer
*/
function calcRoute(start, end, routeNum, directionsRenderer) {
	// create a request object for the directions service call
	var request = {
		origin:start,
		destination:end,
		travelMode: google.maps.TravelMode.DRIVING
	};

	// call google directions service
	gDirectionsService.route(request, function(result, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			// call google directions renderer
			directionsRenderer[routeNum] = new google.maps.DirectionsRenderer({
				directions: result,
				preserveViewport: true, // don't change the view
				suppressMarkers: true, // don't add markers at the start and end
				draggable: true,
			});
		}
		gCallback--; // decrease the callback number

		if(gCallback == 0) { // once we calculated "gNumberOfPoints" routes, call a function to calculate the 3 closest
			// sort the array from shortest time to longest
			gDirectionsRenderer.sort(_sortDirections);

			// remove all the unneeded routes from array, we only want "gNumberOfRoutes" points
			gDirectionsRenderer.splice(gNumberOfRoutes, gNumberOfPoints - gNumberOfRoutes);

			gDirectionsRenderer[1] = gDirectionsRenderer2[0];
			gDirectionsRenderer[2] = gDirectionsRenderer3[0];
			gDirectionsRenderer2[0] = null;
			gDirectionsRenderer2[1] = null;
			gDirectionsRenderer2[2] = null;

			displayClosest(gDirectionsRenderer);

			document.getElementById("panel-header").style.display = "block";
			document.getElementById("panel-body").style.display = "flex";

			gDirectionsRenderer[0].setPanel(document.getElementById(gPanelId[0]));
			document.getElementById("police_button").innerHTML = "Police Station - Optimized Route";
			gDirectionsRenderer[1].setPanel(document.getElementById(gPanelId[1]));
			document.getElementById("hospital_button").innerHTML = "Hospital - Optimized Route";
			gDirectionsRenderer[2].setPanel(document.getElementById(gPanelId[2]));
			document.getElementById("fire_button").innerHTML = "Fire Department - Optimized Route";

			var position = directionsRenderer[0].directions.routes[0].legs[0].end_location;

			if(Math.abs(end.lat() - position.lat()) > 0.001 || Math.abs(end.lng() - position.lng()) > 0.001) {
				var marker = new google.maps.Marker({
					draggable: false,
					position: position,
					map: gMap,
					icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
					zIndex: -1
				});

				// create an infowindow to display the address of the marker
				var infoWindow = new google.maps.InfoWindow({
					content: '<div style="width: 180px">Access Point<br />Lat: ' + position.lat().toFixed(4) + ' Long: ' + position.lng().toFixed(4) + '</div>'
				});


				// add click event to open infowindow when marker is clicked
				google.maps.event.addListener(marker, 'click', function(event) {
					infoWindow.open(gMap, marker);
				});
			}
		}
	});
}

/**
* Calculate and display closest routes out of all the calculated routes
* @param {google.maps.DirectionsRenderer} directionsRenderer
*/
function displayClosest(directionsRenderer) {

	// change the polyline options(change color) for route one
	//directionsRenderer[0].setOptions({polylineOptions: gPolylineOptionsRoute1});

	for(var i = 0; i < directionsRenderer.length; i++) {
		// create infowindow for route
		directionsRenderer[i].infoWindow = new InfoBubble({
			maxWidth: 250,
			maxHeight: 100,
			content: null,
			position: new google.maps.LatLng(0, 0),
			shadowStyle: 1,
			padding: 0,
			backgroundColor: 'rgb(57,57,57)',
			borderRadius: 4,
			arrowSize: 10,
			borderWidth: 1,
			borderColor: '#2c2c2c',
			disableAutoPan: true,
			arrowPosition: 30,
			arrowStyle: 2
		});

		updateText(directionsRenderer, i, null);

		// open route infowindow
		directionsRenderer[i].infoWindow.open(gMap);

		addRouteClickListener(i, directionsRenderer);
		gLatlngbounds.extend(directionsRenderer[i].directions.routes[0].legs[0].start_location);
		// set the route on the map
		directionsRenderer[i].setMap(gMap);
	}
	// zoom to include all points in bounds object(all routes displayed in map)
	gMap.fitBounds(gLatlngbounds);
}



/**
* Add listener to route polyline
* @param {Integer} i
* @param {google.maps.DirectionsRenderer} directionsRenderer
*/
function addRouteClickListener(i, directionsRenderer) {
	var route = i;
	var text = "undefined";

	if(i == 0) {
		text = "police_button"
	}
	else if (i == 1) {
		text = "hospital_button";
	}
	else if(i == 2) {
		text = "fire_button";
	}

	// blabla
	google.maps.event.addListener(directionsRenderer[route], 'directions_changed', function(event){
		updateText(directionsRenderer, route, null);

		document.getElementById(text).innerHTML = document.getElementById(text).innerHTML.split("-")[0] + " - User Modified Route";

		// open route infowindow
		directionsRenderer[route].infoWindow.open(gMap);
	});
}

/**
* Calculate routes to closest locations
*/
function calcAllRoutes() {
	// set marker not draggable once the routes calculation starts
	gUserMarker.draggable = false;

	// clear click event listeners on map so the marker doesn't change position anymore
	google.maps.event.clearListeners(gMap, 'click');

	gClosestPolice = findClosest(gUserMarker.getPosition(), gNumberOfPoints, gMarkers);
	gClosestFireStation = findClosest(gUserMarker.getPosition(), gNumberOfPoints, gMarkers2);
	gClosestHospital = findClosest(gUserMarker.getPosition(), gNumberOfPoints, gMarkers3);

	for (var i = 0; i < gNumberOfPoints; i++) {
		calcRoute(gClosestPolice[i].position, gUserMarker.position, i, gDirectionsRenderer);
		calcRoute(gClosestFireStation[i].position, gUserMarker.position, i, gDirectionsRenderer2);
		calcRoute(gClosestHospital[i].position, gUserMarker.position, i, gDirectionsRenderer3);
	}

	// add user marker to bounds object
	gLatlngbounds.extend(gUserMarker.position);

	// If enabled, disable the "Calculate routes" button
	if(!document.getElementById('calc_route').disabled) {
		document.getElementById('calc_route').disabled = true;
	}

	// enable reverse routes button
	if(document.getElementById('reverse').disabled) {
		document.getElementById('reverse').disabled = false;
	}
}

/**
* Reverse directions
*/
function reverseDirections() {
	var endPoints = [ gClosestPolice[0].position, gClosestFireStation[0].position, gClosestHospital[0].position ];
	var rendererToRemove;

	if(document.getElementById("directions-text").innerHTML == "from") {
		document.getElementById("directions-text").innerHTML = "to";
		rendererToDisplay = gDirectionsRenderer;
		rendererToRemove = gDirectionsRenderer2;
	}
	else {
		document.getElementById("directions-text").innerHTML = "from";
		rendererToDisplay = gDirectionsRenderer2;
		rendererToRemove = gDirectionsRenderer;
	}

	for (var i = 0; i < 3; i++) {
		rendererToRemove[i].setMap(null);
		rendererToRemove[i].setPanel(null);
		rendererToRemove[i].infoWindow.close();

		// create a request object for the directions service call
		var request = {
			origin: gUserMarker.position,
			destination: endPoints[i],
			travelMode: google.maps.TravelMode.DRIVING
		};

		if(gDirectionsRenderer2[0] == null) {
			// call google directions service
			gDirectionsService.route(request, buildDCallback(i));
		}
		else {
			openAfterReverse(rendererToDisplay, i);
		}
	}
}

function buildDCallback(i) {
	return function(result, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				// call google directions renderer
				gDirectionsRenderer2[i] = new google.maps.DirectionsRenderer({
					directions: result,
					preserveViewport: true, // don't change the view
					suppressMarkers: true, // don't add markers at the start and end
					draggable: true,
				});
			}
			else {
				console.log("failed: " + i);
			}
			gDirectionsRenderer2[i].infoWindow = new InfoBubble({
				maxWidth: 250,
				maxHeight: 100,
				content: null,
				position: new google.maps.LatLng(0, 0),
				shadowStyle: 1,
				padding: 0,
				backgroundColor: 'rgb(57,57,57)',
				borderRadius: 4,
				arrowSize: 10,
				borderWidth: 1,
				borderColor: '#2c2c2c',
				disableAutoPan: true,
				arrowPosition: 30,
				arrowStyle: 2
			});
			openAfterReverse(rendererToDisplay, i);
		};
}

function openAfterReverse(renderer, route) {
	updateText(renderer, route, null);
	renderer[route].infoWindow.open(gMap);
	addRouteClickListener(route, renderer);
	renderer[route].setMap(gMap);
	renderer[route].setPanel(document.getElementById(gPanelId[route]));
}

google.maps.event.addDomListener(window, 'load', initialize);

