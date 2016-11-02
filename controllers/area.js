
// **********************************************************

'use strict';

// **********************************************************

var dotenv = require('dotenv').load();
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);

var getArea = function(geom, callback) { // geom is a geojson string
	console.log("============== Area API ===============");

	try {
		var db = pgp(CONTOURS_PG);
		console.log('connected to CONTOURS PG');
	}
	catch(e) {
		console.log('connection to CONTOURS PG failed' + e);
		callback(e, {"area": null, "area_unit": null});
	}
	
	var q = "SELECT ST_Area( ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326)::geography)";
	db.any(q)
		.then(function (data) {
			var area = data[0].st_area;
			callback(null, {"area": area, "area_unit": "square meter"});
		})
		.catch(function (err) {
			callback(err, {"area": null, "area_unit": null});
			
		});
}

module.exports.getArea = getArea;
