
var dotenv = require('dotenv');
dotenv.load();

var CONTOURS_PG = process.env.CONTOURS_PG;

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var db_contour = null;
try {
	db_contour = pgp(CONTOURS_PG);
	console.log('\n' + 'connected to CONTOURS DB from db_contour.js');
}
catch(e) {
	console.log('\n' + 'connection to CONTOURS DB failed' + e);
}

// Exporting the database object for shared use:
module.exports = db_contour;