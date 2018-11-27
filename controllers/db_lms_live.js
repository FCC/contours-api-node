'use strict';

var dotenv = require('dotenv');
dotenv.load();

const LMS_LIVE_PG = process.env.LMS_LIVE_PG;

const promise = require('bluebird');

const options = {
  // Initialization Options
  promiseLib: promise
};

const pgp = require('pg-promise')(options);
var db_lms = null;
try {
	db_lms = pgp(LMS_LIVE_PG);
	console.log('\n' + 'connected to LMS LIVE DB from db_lms_live.js');
}
catch(e) {
	console.log('\n' + 'connection to LMS LIVE DB failed' + e);
}

const diagnostics = require('./db_diagnostics.js');
diagnostics.init(options);

// Exporting the database object for shared use:
module.exports = db_lms;