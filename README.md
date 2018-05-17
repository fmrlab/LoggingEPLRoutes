# Logging EPL routes

## Route Finder
### Detailed Description
* On window load, the initMap function will run and do the following:
  * Create new map
  * Initialize displayed map bounds
  * Set outline of counties with Kmzlayer
  * Populate each type of facility (police, hospital, fire dept.) with respective markers and infowindows
  * Add click event listener to place a user marker on the map
    * On click, placeMarker function runs:
	  * If no marker present, one is created along with an infowindow
	  * If marker present, then change it to a new location
	  * geocode position(convert lat/long into actual address and add it to info window along with coordinates)
	  * Add drag event to update infowindow information
	  * Add click event to open infowindow when marker is clicked
	* "Calculate routes" button will show up

* If "Calculate routes" button is clicked, the calcAllRoutes function will run and do the following:
  * Disable user marker draggability
  * Disable map click event listener to prevent changing the position of the user marker
  * Call findClosest function three times (once per facility type). Each time it will return the 6 destinations (based on distance calculated with curvature of earth) closest to the user marker.
  * Call calcRoute function for each of the 6 closest destinations by type
    * Directions to each destination are rendered (driving distance is obtained) and stored in an array
	* Once done with the 18 callbacks (3 types * 6 destinations each), sort each array of rendered directions and only keep the closest direction by type.
	* Display each closest direction by type along with respective info window, add listener to route polyline (to be able to modify route by dragging), set map bounds to all points of interest and adjust map zoom according to these bounds
	* Show directions to hospital, police, and fire dept at the end of the page in 3 different panels
	* Google will display directions from the hospital/police/fire to the access point closest to the user marker. If the user marker coordinates are different than the access point coordinates, place a marker at the access point with an info window (and click event to show it in case the marker is clicked).
  * Add user marker to bounds object
  * Disable "Calculate routes" button
  * Enable "Reverse" directions button

* If "Clear" button is clicked, the page will reload from the server

## Heatmaps
### Heatmap Display
* The user can select from 6 different heatmaps. These are: 
  * Time-Based: Police, Hospital, Fire Department
  * Distance-Based: Police, Hospital, Fire Department
* Each heatmap is made of 12 kml layers. The heatmap had to be split among multiple layers because google could not load a single layer with all the heatmap data (file was too big).
* Each time a new heatmap is selected. We remove the previous layers and add new ones to the map.
* At the beginning of the project, the heatmap was made by adding rectangles (instead of KML) to the google map (more info here: https://developers.google.com/maps/documentation/javascript/examples/rectangle-simple).
  * This approach was not scalable because it slowed down the browser when trying to add thousand of rectangles.
  * It would take about 45seconds to load the 18K+ points that make the study area

### Driving Time and Distance Calculations
* Initially, calculations were being done on the browser using the Google Maps Javascript API, and data uploaded to firebase (cloud-based database).
* The process of doing these calculations on the browser was slow. Therefore, these calculations were moved server-side.
* Calculations are now done using NodeJS (server-side) using the Google Maps Distance Matrix API.
* Check the "addNewPoints.js" file in the "EPL_StudyArea_PointAdjustment" project to see how calculations are done and data is uploaded to firebase.

### Heatmap KML Layer Generation
* Once the time and distance calculations are complete, we download the data from firebase, and use it to generate KML files for each heatmap.
* If you open one of the heatmap KML files, you will notice that each heatmap rectangle is represented by a Placemark. Each placemark contains the following data about a rectangle: coordinates, fill color, and infoWindow data.
* These KML files are generated server-side using NodeJS. See the "heatmapKMLGeneration" project files for more details on how to generate the KML files.

