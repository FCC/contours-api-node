
var dotenv = require('dotenv');
dotenv.load();

var LMS_PG = process.env.LMS_PG;

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var db_lms = null;
try {
	db_lms = pgp(LMS_PG);
	console.log('\n' + 'connected to LMS DB from db_lms.js');
}
catch(e) {
	console.log('\n' + 'connection to LMS DB failed' + e);
}

// Exporting the database object for shared use:
module.exports = db_lms;