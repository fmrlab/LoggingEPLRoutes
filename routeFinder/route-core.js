/**
* Geocode the position of a latitude and longitude set. This function turns
* the set into an address. 
* @param {google.maps.Marker} marker
* @param {google.maps.LatLng} pos
*/
function geocodePosition(marker, pos) {
	var positionString;
	var geocoder = new google.maps.Geocoder();
	
	geocoder.geocode({latLng: pos}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			// update the marker's infowindow information with the formatted address
			updateInfoWindow(marker, "Logging Site<br />" + results[0].formatted_address.slice(0, results[0].formatted_address.length - 5) + "<br />Lat: " + pos.lat().toFixed(4) + " Long: " + pos.lng().toFixed(4));
		}
		else { // there was an error decoding the address
			Alert('Cannot determine address at this location:' + status);
		}
	});
}

/**
* Update the content of an info window
* @param {google.maps.Marker} marker
* @param {String} contentString
*/
function updateInfoWindow(marker, contentString) {
	// change the content of the infowindow
	marker.infoWindow.setContent(contentString);
	// open the infowindow with the updated information
	marker.infoWindow.open(gMap, marker);
}

/**
* Convert to radians
* @param {Integer} x
* @return {Integer} x*Math.PI/180
*/
function converToRadians(x) {
	return x*Math.PI/180;
}

/**
* Find the closest mill location
* @param {google.maps.LatLng} location
* @param {Integer} points
* @param {Array.<google.maps.Marker>} destinations
*/
function findClosest(location, points, destinations) {
	var lat = location.lat(); // get user marker latitude
	var lng = location.lng(); // get user marker longitude
	var R = 6371; // radius of earth in km
    var distances = [];
	var closestDist = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
	var closestRoutes = [];
	
	closestDist.MAX_LENGTH = points;
	
	closestDist.addAndShift = function(number, position) {
		if(position < this.MAX_LENGTH) {
			for(var i = this.MAX_LENGTH - 1; i > position; i--) {
				this[i] = this[i - 1];
			}
			this[position] = number;			
		}
	};

    for(var i=0; i < destinations.length; i++ ) {
        var mlat = destinations[i].position.lat(); // get possible destination latitude
        var mlng = destinations[i].position.lng(); // get possible destination longitude
        var dLat  = converToRadians(mlat - lat);
        var dLong = converToRadians(mlng - lng);
		
		// calculate distance between 2 points using haversine formula
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(converToRadians(lat)) * Math.cos(converToRadians(lat)) * Math.sin(dLong/2) * Math.sin(dLong/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;
        distances[i] = d;
		
		// check if current iteration is closer than either 1st, 2nd or 3rd closest 
        for(var j = 0; j < points; j++) {
			if ( closestDist[j] == -1 || d < distances[closestDist[j]] ) {
				closestDist.addAndShift(i, j);
				break;
			}
		}
    }
	
	for(var i = 0; i < points; i++) {
		closestRoutes[i] = destinations[closestDist[i]];
	}
	
	return closestRoutes;
}

/**
* Helper function to sort routes array using the duration of the route
* @param {Integer} a
* @param {Integer} b
*/
function _sortDirections(a,b) {
  if (a.directions.routes[0].legs[0].duration.value < b.directions.routes[0].legs[0].duration.value)
     return -1;
  if (a.directions.routes[0].legs[0].duration.value > b.directions.routes[0].legs[0].duration.value)
    return 1;
  return 0;
}

/**
* Draws an invisible route on top of the route from DirectionsRenderer to be able to add a click event
* @param {Integer} routeNum
* @param {google.maps.Map} map
* @param {Array.<google.maps.DirectionsRenderer>} directions
*/
function drawRoute(routeNum, map, directions) {
	if (!directions[routeNum].route) {
		// Create a polyline
		directions[routeNum].route = new google.maps.Polyline({
			path: directions[routeNum].points,
			strokeOpacity: 0, // Make the line 100% transparent
			// DISABLE FOR NOW
			strokeWeight: 6, // Make the line thicker to make it easy to click
			zIndex: 4 - routeNum
		});
	
		directions[routeNum].route.setMap(map);
	}
	else {
		directions[routeNum].route.path = directions[routeNum].points;
	}
}

/**
* Display the selected route 
* @param {Integer} selected
* @param {Array.<google.maps.DirectionsRenderer>} directions
* @param {String} panelId
* @param {String} routesId
* @param {Integer} routes
* @param {google.maps.Map} map
* @param {Boolean} useColorForFirstRoute
*/
function displayRoute(selected, directions, panelId, routesId, routes, map, useColorForFirstRoute) {

	// polyline options for selected route on map
	var polylineOptSelected = {
		strokeColor: 'royalblue', 
		zIndex: 2, // on top of other lines
		strokeWeight: 8 // thicker
	};

	// if the parameter is less than zero, it means we should read it from the drop down menu
	if (selected < 0) {
		var selects = document.getElementById(routesId);
		selected = selects.options[selects.selectedIndex].value;
	}
	
	for (var i = 0; i < routes; i++) {
		var polylineOpt = null;
		var elementId = null;
		// if current iteration is not the selected route, clear the polyline options and remove directions from panel
		if (i != selected) {
			if( i == 0 && useColorForFirstRoute) { // if it's route 1, use polyline options for route 1
				polylineOpt = gPolylineOptionsRoute1;
			}
		}
		else { // it is the selected route, so set the polyline options and put directions on the panel
			polylineOpt = polylineOptSelected;
			if( i == 0 && useColorForFirstRoute) { // if it's route 1, use color orangered for route 1
				polylineOpt.strokeColor = 'orangered';
			}
			elementId = panelId;
		}
		// change directions renderer options to show which route is selected
		directions[i].setOptions({
			map: map,
			polylineOptions: polylineOpt
		});
		// show directions for selected route in directions panel
		if(panelId) {
			directions[i].setPanel(document.getElementById(elementId));
		}
	}
}

/**
* Place a marker on the map
* @param {google.maps.LatLng} location
* @param {google.maps.Marker} marker
* @param {google.maps.Map} map
*/
function placeMarker(location, marker, map) {
	if(!marker) { // if there's no marker on the map, create one
		marker = new google.maps.Marker({
			draggable:true,
			animation: google.maps.Animation.DROP,
			position: location,
			map: map,
		});
		
		// create an infowindow to display the address of the marker
		marker.infoWindow = new google.maps.InfoWindow();
	}
	else { // else, just change the location
		marker.setPosition(location);
		marker.infoWindow.close();
	}
	
	geocodePosition(marker, location);

	// add drag event to update infowindow information
	google.maps.event.addListener(marker, 'dragend', function() {
		marker.infoWindow.close();
		geocodePosition(marker, marker.getPosition());
	});
	
	// add click event to open infowindow when marker is clicked
	google.maps.event.addListener(marker, 'click', function(event) {
		marker.infoWindow.open(map, marker);
	});
	
	return marker;
}

/**
* Helper function to update drop down menu and info window text when it changes
* @param {google.maps.DirectionsRenderer} directionsRenderer
* @param {Integer} route
* @param {String} elementId
*/
function updateText(directionsRenderer, route, elementId) {
		var routeNumber = parseInt(route) + 1;
		// get trip distance
		var tripDistance = directionsRenderer[route].directions.routes[0].legs[0].distance.text.toString();
		// get trip duration
		var tripDuration = directionsRenderer[route].directions.routes[0].legs[0].duration.text.toString();
		var text = "undefined";
	
		if(route == 0) {
			text = "Police Station: "
		}
		else if (route == 1) {
			text = "Hospital: ";
		}
		else if(route == 2) {
			text = "Fire Department: ";
		}
		// create string to be used in route infowindow
		var tripInfo = '<div class="routelabel">' + text + tripDistance + ' - ' + tripDuration + '</div>';
		
		// add trip information to routes drop down menu
		if(elementId) {
			document.getElementById(elementId).options[routeNumber].text = document.getElementById(elementId).options[routeNumber].text.split(':')[0] + ': ' + 
				tripDistance + ' - ' + tripDuration;
		}
				
		directionsRenderer[route].points = directionsRenderer[route].directions.routes[0].overview_path;
		
		// calculate approximate halfway point of route
		var halfWayPoint = directionsRenderer[route].points[Math.ceil(directionsRenderer[route].points.length / 2) + (3 * route)];
		
		directionsRenderer[route].infoWindow.content = tripInfo;
		directionsRenderer[route].infoWindow.position = halfWayPoint;	
}