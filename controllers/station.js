
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;
var AWS_ACCESS_KEY =  configEnv[NODE_ENV].AWS_ACCESS_KEY;
var AWS_SECRET_KEY = configEnv[NODE_ENV].AWS_SECRET_KEY;
var AWS_REGION = configEnv[NODE_ENV].AWS_REGION;
var CDBS_HOST = configEnv[NODE_ENV].CDBS_HOST;
var CDBS_PORT = configEnv[NODE_ENV].CDBS_PORT;
var CDBS_DBNAME = configEnv[NODE_ENV].CDBS_DBNAME;
var CDBS_USER = configEnv[NODE_ENV].CDBS_USER;
var CDBS_PASSWD = configEnv[NODE_ENV].CDBS_PASSWD;
var LMS_PG = configEnv[NODE_ENV].LMS_PG;

var fs = require('fs');
var async = require('async');
var Sybase = require('sybase');

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
//var db_lms = pgp(LMS_PG);

var startTime;

function getStation(req, res) {
	try {
	
		console.log('\n================== start station process ==============');
		console.log(new Date());
		
		startTime = new Date().getTime();
		var service_type = req.query.service_type;
		var callsign = req.query.callsign;
		var facility_id = req.query.facility_id;

		var service_type_lc = service_type.toLowerCase();
		
		if (service_type_lc != "am" && service_type_lc != "fm" && service_type_lc != "tv") {
			console.log("error: invalid service type: " + service_type);
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': "Invalid service type: " + service_type + "."
			});
			return;
		}
		
		if (callsign == undefined && facility_id == undefined) {
			console.log("error: no callsign or facility_id provided");
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'No callsign or facility_id provided.'
			});
			return;
		}
		
		if (callsign != undefined && facility_id != undefined) {
			console.log("error: both callsign and facility_id provided");
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'Both callsign and facility_id provided'
			});
			return;
		}
		
		if ( callsign == undefined && facility_id != undefined && !facility_id.match(/^\d+$/) ) {
			console.log("error: invalid facility_id  value");
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'Invalid facility_id value.'
			});
			return;
		}
		
		switch(service_type_lc) {
			case "tv":
				//readLMS(res, callsign, facility_id);
				readCDBS(res, service_type_lc, callsign, facility_id);
				break;
			case "am":
				readCDBS(res, service_type_lc, callsign, facility_id);
				break;
			case "fm":
				readCDBS(res, service_type_lc, callsign, facility_id);
				break;
			default:
				console.log("error: invalid service type: " + service_type);
				res.status(400).send({
					'status': 'error',
					'statusCode':'400',
					'statusMessage': "Invalid service type: " + service_type + "."
				});
				return;
				
		}
	}
	catch(err) {
		console.log(err);
		res.status(400).send({
			'status': 'error',
        	'statusCode':'400',
        	'statusMessage': 'Error occurred.',
			'error': err.stack
        });
	}

}

function readCDBS(res, service_type, callsign, facility_id) {
	var eng_data_table = service_type + '_eng_data';

	var db = new Sybase(CDBS_HOST, CDBS_PORT, CDBS_DBNAME, CDBS_USER, CDBS_PASSWD, false, "./node_modules/sybase/JavaSybaseLink/dist/JavaSybaseLink.jar");
	
	if (callsign != undefined) {
		var query = "select a.* , b.* from facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and fac_callsign = '" + callsign.toUpperCase() + "'";

	}
	else if (facility_id != undefined) {
		var query = "select a.* , b.* from facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and a.facility_id = " + facility_id;
	}

	console.log(query);
	
	db.connect(function (err) {
		if (err) {
			console.log(err);
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'Error connecting to CDBS.',
				'error': err.stack
			});
			return;
		}
		
		db.query(query, function (err, data) {
			if (err) {
				console.log(err);
				res.status(400).send({
					'status': 'error',
					'statusCode':'400',
					'statusMessage': 'Error executing CDBS query.',
					'error': err.stack
				});
				return;
			}
			db.disconnect();
			res.status(200).send({
				"status": "success", 
				"statusCode": "200", 
				"statusMessage": "ok",
				"data": data
			});
			console.log("Done");
		});
	});

}

function readLMS(res, callsign, facility_id) {
	var q = "Select f.*, a.*, af.*,  loc.*, ant.*, antf.* " +
			"From common_schema.facility f, common_schema.license_filing_version lfv, common_schema.application a," +
			"common_schema.application_facility af, mass_media.app_location loc, mass_media.app_antenna ant, mass_media.app_antenna_frequency antf " +
			"where f.facility_id = af. afac_facility_id " +
			"and af.afac_application_id = a.aapp_application_id " +
			"and a.aapp_application_id = lfv.filing_version_id " +
			"and f.latest_filing_version_id = lfv.filing_version_id " +
			"and loc.aloc_aapp_application_id = a.aapp_application_id " +
			"and loc.aloc_loc_record_id = ant.aant_aloc_loc_record_id " +
			"and antf.aafq_aant_antenna_record_id = ant.aant_antenna_record_id " +
			"and f.facility_status in ('LICEN','LICSL','LICRP') ";
		
	
	if (callsign != undefined) {
		q += "and a.aapp_callsign = '" + callsign.toUpperCase()  + "'";
	}
	else  {
		q += "and f.facility_id = " + facility_id;
	}
	console.log(q)	
	db_lms.any(q)
		.then(function (data) {
			res.status(200)
			.json({
				"status": "success", 
				"statusCode": "200", 
				"statusMessage": "ok",
				"data": data
			});
			console.log("Done");
		})
		.catch(function (err) {
			console.log(err);
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'Error executing LMS query.',
				'error': err.stack
			});
	});	

}

module.exports.getStation = getStation;



