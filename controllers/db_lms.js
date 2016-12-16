
var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var EFS_ELEVATION_DATASET = process.env.EFS_ELEVATION_DATASET;
var LMS_PG = process.env.LMS_PG;
var LMS_SCHEMA = process.env.LMS_SCHEMA;
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp_lms = require('pg-promise')(options);

try {
	var db_lms = pgp_lms(LMS_PG);
	console.log('\n' + 'connected to LMS DB');
}
catch(e) {
	console.log('\n' + 'connection to LMS DB failed' + e);
}

// Exporting the database object for shared use:
module.exports = db_lms;