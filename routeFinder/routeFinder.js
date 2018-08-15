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
var gAccessPointMarker;
var gDrawingManager;
var measureTool;
var gDistanceMeasureMode;

function initialize() {
	gDirectionsService = new google.maps.DirectionsService();
	gLatlngbounds = new google.maps.LatLngBounds();
	gPanelId = ["police", "hospital", "fire"];
	rendererToDisplay = gDirectionsRenderer;
	gAccessPointMarker = null;
	gDistanceMeasureMode = 0;
	// create a google map object centered on Kentucky
	gMap = new google.maps.Map(document.getElementById("map-canvas"), {
		center: new google.maps.LatLng(37.83, -85.75), // KY coordinates
		zoom: 8,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		mapTypeControl: true,
		disableDoubleClickZoom: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
		},

	});

	// Load KML layer that defines the study area
	gKmzLayer = new google.maps.KmlLayer('http://www2.ca.uky.edu/forestry/loggingEPLroutes/assets/kml-data/StudyArea.zip', {
		clickable: false,
		suppressInfoWindows: true,
		preserveViewport: true
	});

	gKmzLayer.setMap(gMap);

	populateAndDisplayMarkers();

	addEventListenerOnMap();

	// Hide directions panel on map load. Panel only needs to be shown when calculate routes
	document.getElementById("panel-header").style.display = "none";
	document.getElementById("panel-body").style.display = "none";
	measureTool = new MeasureTool(gMap, {
		showSegmentLength: false,
		unit: MeasureTool.UnitTypeId.IMPERIAL 
	  });
	
	  measureTool.addListener('measure_start', function() {
		gDistanceMeasureMode = 1;
	  });
	  measureTool.addListener('measure_end', function() {
		gDistanceMeasureMode = 0;
	  });
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
		origin: start,
		destination: end,
		travelMode: google.maps.TravelMode.DRIVING
	};

	// call google directions service
	gDirectionsService.route(request, function (result, status) {
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

		if (gCallback == 0) { // once we calculated "gNumberOfPoints" routes, call a function to calculate the 3 closest
			// sort the array from shortest time to longest
			gDirectionsRenderer.sort(_sortDirections);
			gDirectionsRenderer2.sort(_sortDirections);
			gDirectionsRenderer3.sort(_sortDirections);
			// remove all the unneeded routes from array, we only want "gNumberOfRoutes" points
			gDirectionsRenderer.splice(gNumberOfRoutes, gNumberOfPoints - gNumberOfRoutes);
			
			if(gDirectionsRenderer2.length > 0){
				gDirectionsRenderer[1] = gDirectionsRenderer2[0];	
			}
			if(gDirectionsRenderer3.length > 0){
				gDirectionsRenderer[2] = gDirectionsRenderer3[0];
			}
			
			for(var i = gDirectionsRenderer2.length -1 ; i>= 0; i--){
				gDirectionsRenderer2[i] = null;
				gDirectionsRenderer2.pop();
			}

			for(var i = gDirectionsRenderer3.length -1 ; i>= 0; i--){
				gDirectionsRenderer3[i] = null;
				gDirectionsRenderer3.pop();
			}

			displayClosest(gDirectionsRenderer);

			document.getElementById("panel-header").style.display = "block";
			document.getElementById("panel-body").style.display = "flex";

			var buttonIds = [];
			buttonIds[0] = "police_button";
			buttonIds[1] = "hospital_button";
			buttonIds[2] = "fire_button";
			
			var buttonNames = [];
			buttonNames[0] = "Police Station - Optimized Route";
			buttonNames[1] = "Hospital - Optimized Route";
			buttonNames[2] = "Fire Department - Optimized Route";

			for(var i = 0; i < gDirectionsRenderer.length; i++){
				gDirectionsRenderer[i].setPanel(document.getElementById(gPanelId[i]));
				document.getElementById(buttonIds[i]).innerHTML = buttonNames[i];
			}
			
			var position = gDirectionsRenderer[0].directions.routes[0].legs[0].end_location;

			if (gAccessPointMarker == null){
				gAccessPointMarker = new google.maps.Marker({
					draggable: true,
					position: position,
					map: gMap,
					zIndex:1500,
					icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
				});

				// create an infowindow to display the address of the marker
				var infoWindow = new google.maps.InfoWindow({
					content: '<div style="width: 180px">Access Point<br />Lat: ' + position.lat().toFixed(4) + ' Long: ' + position.lng().toFixed(4) + '</div>'
				});


				// add click event to open infowindow when marker is clicked
				google.maps.event.addListener(gAccessPointMarker, 'click', function (event) {
					infoWindow.open(gMap, gAccessPointMarker);
				});
				google.maps.event.addListener(gAccessPointMarker, 'dragend', function () {
					gCallback = 3 * gNumberOfPoints;
					for (var i = gDirectionsRenderer.length-1; i >= 0; i--){
						if (gDirectionsRenderer[i] != null){
							gDirectionsRenderer[i].setMap(null);
							gDirectionsRenderer[i].setPanel(null);
							if(gDirectionsRenderer[i].infoWindow != null){
								gDirectionsRenderer[i].infoWindow.close();
							}
							gDirectionsRenderer[i] = null;
						}
						gDirectionsRenderer.pop();
						
					}
					calcNClosestRoute(gAccessPointMarker);

				});
				/*var marker = new google.maps.Marker({
					draggable: true,
					position: position,
					map: gMap,
					zIndex:500,
					icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
				});

				// create an infowindow to display the address of the marker
				var infoWindow = new google.maps.InfoWindow({
					content: '<div style="width: 180px">Access Point<br />Lat: ' + position.lat().toFixed(4) + ' Long: ' + position.lng().toFixed(4) + '</div>'
				});


				// add click event to open infowindow when marker is clicked
				google.maps.event.addListener(marker, 'click', function (event) {
					infoWindow.open(gMap, marker);
				});
				google.maps.event.addListener(marker, 'dragend', function () {

				});*/
			}else{
				gAccessPointMarker.setPosition(position);
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

	for (var i = 0; i < directionsRenderer.length; i++) {
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

	if (i == 0) {
		text = "police_button"
	}
	else if (i == 1) {
		text = "hospital_button";
	}
	else if (i == 2) {
		text = "fire_button";
	}

	// blabla
	google.maps.event.addListener(directionsRenderer[route], 'directions_changed', function (event) {
		updateText(directionsRenderer, route, null);

		document.getElementById(text).innerHTML = document.getElementById(text).innerHTML.split("-")[0] + " - User Modified Route";

		// open route infowindow
		directionsRenderer[route].infoWindow.open(gMap);
	});
}


function calcNClosestRoute(accessMarker){
	gClosestPolice = findClosest(accessMarker.getPosition(), gNumberOfPoints, gMarkers);
	gClosestFireStation = findClosest(accessMarker.getPosition(), gNumberOfPoints, gMarkers2);
	gClosestHospital = findClosest(accessMarker.getPosition(), gNumberOfPoints, gMarkers3);

	for (var i = 0; i < gNumberOfPoints; i++) {
		calcRoute(gClosestPolice[i].position, accessMarker.position, i, gDirectionsRenderer);
		calcRoute(gClosestFireStation[i].position, accessMarker.position, i, gDirectionsRenderer2);
		calcRoute(gClosestHospital[i].position, accessMarker.position, i, gDirectionsRenderer3);
	}
}
/**
* Calculate routes to closest locations
*/
function calcAllRoutes() {
	// set marker not draggable once the routes calculation starts
	gUserMarker.draggable = false;

	// clear click event listeners on map so the marker doesn't change position anymore
	google.maps.event.clearListeners(gMap, 'click');
	calcNClosestRoute(gUserMarker);

	// add user marker to bounds object
	gLatlngbounds.extend(gUserMarker.position);

	// If enabled, disable the "Calculate routes" button
	if (!document.getElementById('calc_route').disabled) {
		document.getElementById('calc_route').disabled = true;
	}

	// enable reverse routes button
	if (document.getElementById('reverse').disabled) {
		document.getElementById('reverse').disabled = false;
	}
}

/**
* Reverse directions
*/
function reverseDirections() {
	var endPoints = [gClosestPolice[0].position, gClosestFireStation[0].position, gClosestHospital[0].position];
	var rendererToRemove;

	if (document.getElementById("directions-text").innerHTML == "from") {
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
			origin: gAccessPointMarker.position,
			destination: endPoints[i],
			travelMode: google.maps.TravelMode.DRIVING
		};

		if (gDirectionsRenderer2[0] == null) {
			// call google directions service
			gDirectionsService.route(request, buildDCallback(i));
		}
		else {
			openAfterReverse(rendererToDisplay, i);
		}
	}
}

function buildDCallback(i) {
	return function (result, status) {
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

function addEventListenerOnMap(){
	// add click event to place a marker on the map
	google.maps.event.addListener(gMap, 'click', function (event) {
		if(gDistanceMeasureMode == 0){
			gUserMarker = placeMarker(event.latLng, gUserMarker, gMap);
			
			// enable the "Calculate routes" button
			if (document.getElementById('calc_route').disabled) {
				document.getElementById('calc_route').disabled = false;
			}
		}
		
	});
}

function resetDirectionRenderer(directionRenderer){
	for(var i = directionRenderer.length -1; i >= 0 ;i-- ){
		directionRenderer[i].setPanel(null);
		directionRenderer[i].setMap(null)
		directionRenderer[i].infoWindow.close();
		directionRenderer[i] = null;
		directionRenderer.pop();
	}
}

function clearmap(){
	resetDirectionRenderer(gDirectionsRenderer);
	resetDirectionRenderer(gDirectionsRenderer2);
	resetDirectionRenderer(gDirectionsRenderer3);
	resetDirectionRenderer(rendererToDisplay);
	
	rendererToDisplay = gDirectionsRenderer;
	google.maps.event.clearListeners(gMap, 'click');
	addEventListenerOnMap();
	if (gUserMarker != null){
		gUserMarker.setMap(null);
		gUserMarker = null;
	}
	if (gAccessPointMarker != null){
		gAccessPointMarker.setMap(null);
		gAccessPointMarker = null;
	}
	
	document.getElementById("panel-header").style.display = "none";
	document.getElementById("panel-body").style.display = "none";
	if (!document.getElementById('calc_route').disabled) {
		document.getElementById('calc_route').disabled = true;
	}
	gClosestPolice = [];
	gClosestFireStation = [];
	gClosestHospital = [];
	gCallback = 3 * gNumberOfPoints;
	measureTool.end();


}
google.maps.event.addDomListener(window, 'load', initialize);


