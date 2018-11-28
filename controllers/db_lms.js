'use strict';

try {
    require('dotenv').load();
} catch(e) {
    console.log('error trying to load env file, app is probably running in AWS.');
}
const promise = require('bluebird');

const LMS_PG = process.env.LMS_PG;
const LMS_LIVE_PG = process.env.LMS_LIVE_PG;

var options = {
  // Initialization Options
  promiseLib: promise
};

// We always want to use the LIVE LMS database if it is available. If not, fall back to using the 
// local GIS version of the LMS database.

var dataSource = LMS_LIVE_PG;
var dataSourceName = 'live';
if (dataSource === null || dataSource === undefined) {
	dataSource = LMS_PG;
	dataSourceName = 'default';
}

var pgp = require('pg-promise')(options);
var db_lms = null;
try {
	db_lms = pgp(dataSource);
	console.log('\n' + 'connected to '+dataSourceName+' LMS DB from db_lms.js');
} catch(e) {
	console.log('\n' + 'connection to '+dataSourceName+' LMS DB failed' + e);
}

const diagnostics = require('./db_diagnostics.js');
diagnostics.init(options);

// Exporting the database object for shared use:
module.exports = db_lms;