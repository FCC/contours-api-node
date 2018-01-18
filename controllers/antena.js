
// **********************************************************
'use strict';
// **********************************************************

var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var EFS_ELEVATION_DATASET = process.env.EFS_ELEVATION_DATASET;
var LMS_PG = process.env.LMS_PG;
var LMS_SCHEMA = process.env.LMS_SCHEMA;
var db_lms = require('./db_lms.js');
var contours = require('./contours.js');
var CONTEXT_PATH = process.env.CONTEXT_PATH || 'api/contours/';
if (NODE_ENV == 'DEV' || NODE_ENV == 'LOCAL') {
	var CONTEXT_PATH = '';
}


// this function returns the lng(s), lat(s) by passing application_id, facility_id, or callsign
function getAntena(req, res, callback) {

	console.log('\n' + '============ getAntena ============');
	// retrieve query parameters
	var application_id = req.query.applicationId;
	var facility_id = req.query.facilityId;
	var callsign = req.query.callsign;
	callsign = callsign.toUpperCase();
	var service_type = req.query.serviceType;
	
	// checkQueryParams return true if parameters are valid
	// if there is an error, it returns false + it sends 400 response
	var paramsOK = check_query_params(application_id,facility_id,callsign,service_type,res);
	// if one of the params is invalid, exit the function
	if (!paramsOK){
		return;
	}
	
	// this condition should be removed once the am table is re-structured
	if (service_type.toLowerCase() == 'am'){
		console.log('\n' + 'The code is not implemented yet to accept am service type.');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'The code is not implemented yet to accept am service type.'
		});
		return;
	}
	else {
		// 
		if (application_id != undefined && facility_id == undefined && callsign == undefined){
			query_by_application_id(application_id,service_type,res);
		}
		else if (application_id == undefined && facility_id != undefined && callsign == undefined){
			query_by_facility_id(facility_id,service_type,res);
		}
		else if (application_id == undefined && facility_id == undefined && callsign != undefined){
			query_by_callsign(callsign,service_type,res);
		}
	}

}

function check_query_params(application_id,facility_id,callsign,service_type,res){
	// check which of the three params is passed "callsign, facility_id, or application_id"
	var v3 = [application_id, facility_id, callsign];
	var numDefined = 0;
	for (var i = 0; i < v3.length; i++) {
		if (v3[i] !== undefined) {
			numDefined++;
		}
	}

	// if none of the three params is passed,
	// send 400 response explaining the need to use one of the three params
	if (numDefined === 0) {
		console.log('\n' + 'must provide one of callsign, facilityId, or applicationId');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'must provide one of callsign, facilityId, or applicationId.'
		});
		return false;
	}
	
	// if more than one of the three params are passed,
	// send 400 response explaining that the user can pass only on of three params
	if (numDefined > 1) {
		console.log('\n' + 'should provide only one of callsign, facilityId, or applicationId');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'should provide only one of callsign, facilityId, or applicationId.'
		});
		return false;
	}


	// check if applicationId is used and invalid, return 400 response
	if (application_id != undefined) {
		if (application_id == '' || !application_id.match(/^\d+$/)) {
			console.log('\n' + 'invalid applicationId value');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid applicationId value.'
			});
			return false;
		}
	}

	// check if facilityId is used and invalid, return 400 response
	if (facility_id != undefined) {
		if ( facility_id == '' || !facility_id.match(/^\d+$/)) {
			console.log('\n' + 'invalid facilityId value');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid facilityId value.'
			});
			return false;
		}
	}

	// check if callsign is used and invalid, return 400 response
	if (callsign != undefined) {
		if (callsign == '' || !callsign.match(/^[a-zA-Z0-9-]+$/)) {
		
			console.log('\n' + 'invalid callsign value');
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'Invalid callsign value.'
			});
			return false;
		}
	}

	// check if service is not tv, fm, or am, then if not return 400 response
	if ( !(['tv', 'am', 'fm'].includes(service_type.toLowerCase())) ) {
		console.log('\n' + 'invalid serviceType value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid serviceType value - must be tv, fm, or am.'
		});
		return false;
	}

	return true;
}

function query_by_application_id(application_id,service_type,res){
	
	var eng_data_table = LMS_SCHEMA + ".gis_" + service_type + "_eng_data";

	var	q = `select
				case
				when lon_dir = 'W'
					then round(((lon_deg + lon_min/60 + lon_sec/3600)*-1)::numeric,7)
					when lon_dir = 'E'
					then round((lon_deg + lon_min/60 + lon_sec/3600)::numeric,7)
					else -999::numeric
				end as lng,
				case
					when lat_dir = 'N'
					then round((lat_deg + lat_min/60 + lat_sec/3600)::numeric,7)
					when lat_dir = 'S'
					then round(((lat_deg + lat_min/60 + lat_sec/3600)*-1)::numeric,7)
					else -999::numeric
				end as lat
			from ${eng_data_table}
			where application_id = ${application_id} ;`;
	
	db_lms.any(q)
	.then(function (data) {

		var params = undefined;
		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'applicationId not found in database.'
			});
			return;
		}
		else {
			params = {
				'antena(s)':
				{
					'service type': service_type,
					'application id': application_id,
					'coordinates': data
				}
			};

			res.status(200);
			res.setHeader('Content-Type','application/json');
			res.send(JSON.stringify(params));
		}

	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});
}

function query_by_facility_id(facility_id,service_type,res){
	
	var eng_data_table = LMS_SCHEMA + ".gis_" + service_type + "_eng_data";

	var	q = `select
				case
				when lon_dir = 'W'
					then round(((lon_deg + lon_min/60 + lon_sec/3600)*-1)::numeric,7)
					when lon_dir = 'E'
					then round((lon_deg + lon_min/60 + lon_sec/3600)::numeric,7)
					else -999::numeric
				end as lng,
				case
					when lat_dir = 'N'
					then round((lat_deg + lat_min/60 + lat_sec/3600)::numeric,7)
					when lat_dir = 'S'
					then round(((lat_deg + lat_min/60 + lat_sec/3600)*-1)::numeric,7)
					else -999::numeric
				end as lat
			from ${eng_data_table}
			where facility_id = ${facility_id} ;`;
	
	db_lms.any(q)
	.then(function (data) {

		var params = undefined;
		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'facilityId not found in database.'
			});
			return;
		}
		else {
			params = {
				'antena(s)':
				{
					'service type': service_type,
					'facility id': facility_id,
					'coordinates': data
				}
			};

			res.status(200);
			res.setHeader('Content-Type','application/json');
			res.send(JSON.stringify(params));
		}

	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});
}

function query_by_callsign(callsign,service_type,res){
	
	var q1 = `SELECT facility_id
			 FROM mass_media.gis_facility
			 where fac_callsign = '${callsign}';`;
	
	var fac_ids = [];
	db_lms.any(q1)
	.then(function (data) {

		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'callsign not found in database.'
			});
			return;
		}
		else {

			for (var record in data){
				fac_ids.push((data[record].facility_id).toString());
			}
			
			var eng_data_table = LMS_SCHEMA + ".gis_" + service_type + "_eng_data";

			var	q2 = `select
					case
					when lon_dir = 'W'
						then round(((lon_deg + lon_min/60 + lon_sec/3600)*-1)::numeric,7)
						when lon_dir = 'E'
						then round((lon_deg + lon_min/60 + lon_sec/3600)::numeric,7)
						else -999::numeric
					end as lng,
					case
						when lat_dir = 'N'
						then round((lat_deg + lat_min/60 + lat_sec/3600)::numeric,7)
						when lat_dir = 'S'
						then round(((lat_deg + lat_min/60 + lat_sec/3600)*-1)::numeric,7)
						else -999::numeric
					end as lat
				from ${eng_data_table}
				where facility_id in (${fac_ids});`;

			db_lms.any(q2)
			.then(function (data) {

				var params = undefined;
				if (data.length == 0) {
					console.log('\n' + 'no valid record found');
					res.status(400).send({
						'status': 'error',
						'statusCode':'400',
						'statusMessage': 'facilityId of callsign '+ callsign +' not found in database.'
					});
					return;
				}
				else {
					params = {
						'antena(s)':
						{
							'service type': service_type,
							'callsign': callsign,
							'coordinates': data
						}
					};

					res.status(200);
					res.setHeader('Content-Type','application/json');
					res.send(JSON.stringify(params));
			}
			})
			.catch(function (err) {
				console.log('\n' + err);
				callback(err, null);
			});
		}

	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});
	
}

module.exports.getAntena = getAntena;


