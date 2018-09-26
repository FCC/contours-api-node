
var dotenv = require('dotenv').load();

var LMS_LIVE_PG = process.env.LMS_LIVE_PG;

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var db_lms_live = null;
try {
	db_lms_live = pgp(LMS_LIVE_PG);
	console.log('\n' + 'connected to LMS LIVE DB from db_lms_live.js');
}
catch(e) {
	console.log('\n' + 'connection to LMS LIVE DB failed' + e);
}

// Exporting the database object for shared use:
module.exports = db_lms_live;