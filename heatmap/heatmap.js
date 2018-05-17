var heatmapLayers = [];
var heatmapType, heatMapInit, gMap;

/**
* Initialize google map
*/
function initMap() {
        

	heatMapInit = true;
	var mapCenterPoint = new google.maps.LatLng(37.7479, -84.2947);

	gMap = new google.maps.Map(document.getElementById('map'), {
		zoom: 8,
		center: mapCenterPoint,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
        
        
        
	// Load KML layer that defines the study area
	var gKmzLayer = new google.maps.KmlLayer('http://www2.ca.uky.edu/forestry/LoggingEPLroutes/assets/kml-data/StudyArea_Black.zip', { clickable: false, suppressInfoWindows: true, preserveViewport: true });
	gKmzLayer.setMap(gMap);
        google.maps.event.addListener(gMap, 'click', function(event) {
		clickOnMap()
	});

	populateLocationsArray();
	setHeatmapType('time');
	displayHeatmapLayer('Police');
}

function displayHeatmapLayer(emergLocation) {
	if(!heatMapInit) {
		clearAllMarkers();
		unClickCheckbox();
		removeHeatmapLayer();
	}

	/**
	* Load Heatmap Layers. Each heatmap was made with 12 KML layers.
	* Was unable to make heatmap with single layer because it would have exceeded google limits. File would be 10MB+.
	* See more details here: https://developers.google.com/maps/documentation/javascript/kmllayer#restrictions
	**/
	var heatmapLayer;
	var fileNameStart = emergLocation.toLowerCase() + 'Heatmap';
	for(var i = 0; i < 12; i++) {
		heatmapLayer = new google.maps.KmlLayer('http://www2.ca.uky.edu/forestry/LoggingEPLroutes/assets/kml-data/heatmaps/' + 
												heatmapType + '/' + fileNameStart + i + '.zip', 
												{preserveViewport: true});
	
		// Store layer in array so we can remove it later to display other heatmaps
		heatmapLayers.push(heatmapLayer);
		heatmapLayer.setMap(gMap);
	}
	
}

function showLegend() {
	var ranges;
	var legend = document.createElement('div');
	legend.id = 'legend';
	legend.innerHTML = '<h3>Legend</h3>';

	// These are the legend ranges
	if(heatmapType === 'time') {
		ranges = ['<5 min', '5-10 min', '10-15 min', '15-25 min', '25-35 min', '35-45 min', '>45 min'];
	} else {
		ranges = ['<5 mi', '5-10 mi', '10-15 mi', '15-20 mi', '20-25 mi', '25-30 mi', '>30 mi'];
	}

	// Create legend
	for (var i = 0; i < ranges.length; i++) {
		var div = document.createElement('div');
		div.className = 'legendContent';
        div.innerHTML = '<div id="legendBlock' + i + '" class="legendBlock"></div> ' + ranges[i];
        legend.appendChild(div);
	}
	// Place legend on google map
	gMap.controls[google.maps.ControlPosition.RIGHT_TOP].push(legend);
}


// Removes old legend. Used when switch heatmap type
function removeOldLegend() {
	gMap.controls[google.maps.ControlPosition.RIGHT_TOP].clear();
}

// Removes all the heatmap layers
function removeHeatmapLayer() {
	for(var i = 0; i < heatmapLayers.length; i++) {
		heatmapLayers[i].setMap(null);
	}
	heatmapLayers.length = 0;
}

// Set heatmap type. Type can either be 'time' or 'distance'.
function setHeatmapType(type){
	var locationType = checkLocationType();
	heatmapType = type;

	if(!heatMapInit) {
		displayHeatmapLayer(locationType);
		removeOldLegend();
	}
	showLegend();
	heatMapInit = false;
}

// Unclick "Show Locations" checkbox. Used when change to another EPL heatmap.
function unClickCheckbox(){
	document.getElementById('checkbox_showLoc').checked = false;
}

// Check what EPL heatmap we are currently showing
function checkLocationType(){
	if(document.getElementById('radio_pd').checked) {
		return 'Police';
	} else if(document.getElementById('radio_hosp').checked) {
		return 'Hospital';
	} else {
		return 'Fire';
	}
}

function clickOnMap(){
    var isIn = isInside([37.926128, -84.488834]);
    console.log(isIn);
    var isIn2 = isInside([36.579493, -85.202945]);
    console.log(isIn2);
    var spacing = 1;/*55.438*/
    var pointList = generateAllPointsInsideArea([36.631132, -84.889833], spacing);
    var boundingBoxList = generateBoundingBoxes(pointList, spacing);
    //var no_points = boundingBoxList.length;
    var no_points = pointList.length;
    if(spacing > 1){
        for(var i = 0; i<no_points; i++){
            var cityCircle = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.8,
                map: gMap,
                center: {lat: pointList[i][0], lng: pointList[i][1]},
                radius: 100
            });
        }
    }
    


    for(var i = 0; i<no_points; i++){
        var rectangle = new google.maps.Rectangle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: gMap,
            bounds: {
                north: boundingBoxList[i][2],
                south: boundingBoxList[i][0],
                east: boundingBoxList[i][3],
                west: boundingBoxList[i][1]
            }
        });
    }
}