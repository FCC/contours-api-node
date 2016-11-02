
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
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var CONTEXT_PATH = process.env.CONTEXT_PATH || 'api/contours/';
if (NODE_ENV == 'DEV' || NODE_ENV == 'LOCAL') {
	var CONTEXT_PATH = '';
}


var request = require('request');
var mathjs = require('mathjs');
var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var contours = require('./contours.js');


//var tv_stations = require('../data/tv_stations.json');
//var fm_stations = require('../data/fm_stations.json');
//var am_stations = require('../data/am_stations.json');

function getEntity(req, res, callback) {

	console.log('============ getEntity ============');
	try {
		var db_lms = pgp(LMS_PG);
		console.log('connected to LMS DB');
	}
	catch(e) {
		console.log('connection to LMS DB failed' + e);
	}
	
	try {
		var db_contours = pgp(CONTOURS_PG);
		console.log('connected to CONTOURS DB');
	}
	catch(e) {
		console.log('connection to CONTOURS DB failed' + e);
	}

	var serviceType = req.query.serviceType;
	var callsign = req.query.callsign;
	var facilityId = req.query.facilityId;
	var applicationId = req.query.applicationId;
	var src = req.query.src;
	var nradial = req.query.nradial;
	var pop = req.query.pop;
	if (pop === undefined) {
		pop = '';
	}
	
	var i;
	
	if (serviceType == undefined) {
		console.log('serviceType missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'serviceType missing'
		});
		return;
	}
	
	serviceType = serviceType.toLowerCase();
	if (['tv', 'fm'].indexOf(serviceType) < 0) {
		console.log('invalid serviceType value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid serviceType value - must be tv or fm.'
		});
		return;
	}
	
	
	if (callsign != undefined && facilityId != undefined) {
		console.log('both callsign and facilityId provided');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Both callsign and facilityId provided.'
		});
		return;
	}
	
	if ( (callsign == undefined || callsign == '') && (facilityId == undefined || facilityId == '') ) {
		console.log('callsign/facilityId not provided');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'callsign and facilityId not provided.'
		});
		return;
	}
	
	if ( (facilityId != undefined && facilityId != '') && !facilityId.match(/^\d+$/)) {
		console.log('invalid facilityId value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid facilityId value.'
		});
		return;
	
	}
	
	if (applicationId != undefined && !applicationId.match(/^\d+$/)) {
		console.log('invalid applicationId value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid applicationId value'
		});
		return;
	}
	
	if (src != undefined && ['ned', 'ned_1', 'ned_2', 'globe30'].indexOf(src.toLowerCase()) < 0) {
		console.log('invalid src value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid src value.'
		});
		return;
	}
	
	if (nradial == undefined) {
		console.log('missing nradial');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Missing nradial parameter.'
		});
		return;
	}
	
	if ( !nradial.match(/^\d+$/)) {
		console.log('invalid nradial value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value.'
		});
		return;
	}
	
	if ( parseFloat(nradial) <3 || parseFloat(nradial) > 360 ) {
		console.log('nradial value out of range [3, 360]');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'nradial value out of range [3, 360].'
		});
		return;		
	}
	
	
	if (src == undefined) {
		src = 'ned_1';
	}
	
	var src_use = src;
	var unit_use = 'm';
	
	if (callsign) {
		callsign = callsign.toUpperCase();
	}
	
	
	var queryParams = {
		"serviceType": serviceType,
		"callsign": callsign,
		"facility_id": facilityId,
		"application_id": applicationId,
		"src": src_use,
		"nradial": nradial,
		"unit": unit_use,
		"pop": pop
	}
	
	var q, eng_data_table;
	if (["tv", "fm"].indexOf(serviceType) >= 0) {
		eng_data_table = LMS_SCHEMA + ".gis_" + serviceType + "_eng_data";
		if (facilityId != undefined) {
			q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and a.facility_id = " + facilityId;
		}
		if (callsign != undefined) {
			q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and a.fac_callsign = '" + callsign + "'";
		}
		if (applicationId != undefined) {
			q += " and application_id = " + applicationId;
		}
		
		q += " ORDER BY application_id DESC";
		
		console.log(q);
		
		
		db_lms.any(q)
		.then(function (data) {
			if (data.length == 0) {
				console.log('no valid record found');
				callback('no valid record found', null);
				return;
			}
			
			var recordData1 = getRecord(serviceType, data);
			
			if (recordData1.length == 0) {
				console.log('A valid licensed record could not be found');
				callback('A valid licensed record could not be found', null)
				return;
			}
			
			console.log(recordData1);
			
			var recordData = recordData1[0];
			
			getOneContour(db_contours, db_lms, queryParams, recordData, function(error, data) {
				if (error) {
					callback(error, null);
				}
				else {
				callback(null, data);
				
				}
			
			
			});
			
			
			
			//console.log(recordData);
			
			return;
			
			if ([recordData.lat_deg,
			recordData.lat_min,
			recordData.lat_sec,
			recordData.lat_dir,
			recordData.lon_deg,
			recordData.lon_min,
			recordData.lon_sec,
			recordData.lon_dir].indexOf(undefined) >= 0) {
				console.log('record lat/lon not available');
				callback('record lat/lon not available', null);
				return;
			}
			
			if (recordData.rcamsl_horiz_mtr == undefined && recordData.rcamsl_vert_mtr == undefined) {
				console.log('rcamsl not available');
				callback('rcamsl not available', null);
				return;
			}
			
			if (recordData.effective_erp == undefined && recordData.horiz_erp == undefined && recordData.vert_erp == undefined) {
				console.log('ERP not available');
				callback('ERP not available', null);
				return;
			}
			
			if (recordData.facility_channel == undefined && recordData.station_channel == undefined) {
				console.log('channel not available');
				callback('channel not available', null);
				return;
			}
			
			if (recordData.serviceType == 'fm' && recordData.station_class == undefined) {
				console.log('station class not available');
				callback('station class not available', null);
				return;
			}
			
			if (recordData.antenna_type == 'D' && recordData.antenna_id == undefined) {
				console.log('antenna id not available');
				callback('antenna id not available', null);
				return;
			}
			
			var rcamsl_use;

			if (recordData.rcamsl_vert_mtr != undefined && recordData.rcamsl_horiz_mtr != undefined) {
				if (recordData.rcamsl_horiz_mtr >= recordData.rcamsl_vert_mtr) {
					rcamsl_use = recordData.rcamsl_horiz_mtr;
				}
				else {
					rcamsl_use = recordData.rcamsl_horiz_mtr;
				}
			}
			else if (recordData.rcamsl_horiz_mtr != undefined) {
				rcamsl_use = recordData.rcamsl_horiz_mtr;
			}
			else if (recordData.rcamsl_vert_mtr != undefined) {
				rcamsl_use = recordData.rcamsl_vert_mtr;
			}

			//console.log('rcamsl', rcamsl_use);
			
			var channel_use = recordData.station_channel;
			
			var isDigitalTv = false;
			if (recordData.vsd_service == 'DT') {
				isDigitalTv = true;
			}
			var curve_use = 0;
			if (isDigitalTv) {
				curve_use = 2;
			}
			
			//console.log('curve', curve_use);
			
			var erp_use;
			if (recordData.effective_erp) {
				erp_use = recordData.effective_erp;
			}
			else if (recordData.vert_erp && recordData.horiz_erp) {
				if (recordData.vert_erp >= recordData.horiz_erp) {
					erp_use = recordData.vert_erp;
				}
				else {
					erp_use = recordData.horiz_erp;
				}				
			}
			else if (recordData.vert_erp) {
				erp_use = recordData.vert_erp;
			}
			else if (recordData.horiz_erp) {
				erp_use = recordData.horiz_erp;
			}
			
			
			//console.log('erp_use', erp_use)
			
			var field_use;
			if (serviceType == 'fm') {
				if (recordData.station_class == 'B') {
					field_use = 54;
				}
				else if (recordData.station_class == 'B1') {
					field_use = 57;
				}
				else if (['A', 'C3', 'C2', 'C1', 'C'].indexOf(recordData.station_class) >= 0) {
					field_use = 60;
				}
				else {
					field_use = 60;
				}
			}
			else if (serviceType == 'tv' && isDigitalTv) {
				if (channel_use >= 2 && channel_use <= 6) {
					field_use = 28;
				}
				else if (channel_use >= 7 && channel_use <= 13) {
					field_use = 36;
				}
				else if (channel_use >= 14 && channel_use <= 69) {
					field_use = 41;
				}
			}
			else if (serviceType == 'tv' && !isDigitalTv) {
				if (channel_use >= 2 && channel_use <= 6) {
					field_use = 68;
				}
				else if (channel_use >= 7 && channel_use <= 13) {
					field_use = 71;
				}
				else if (channel_use >= 14 && channel_use <= 69) {
					field_use = 74;
				}
			}
			
			var service_use;
			if (serviceType == 'fm') {
				service_use = recordData.asd_service;
			}
			else if (serviceType == 'tv') {
				service_use = recordData.vsd_service;
			}
			if (!service_use) {
				service_use = 'None';
			}
			
			var dom_status_use;
			if (serviceType == 'fm') {
				dom_status_use = recordData.fm_dom_status;
			}
			else if (serviceType == 'tv') {
				dom_status_use = recordData.tv_dom_status;
			}
			if (!dom_status_use) {
				dom_status_use = 'None';
			}
						
			var eng_record_type_use = recordData.eng_record_type;
			if (!eng_record_type_use) {
				eng_record_type_use = 'None';
			}

			
			var lat_nad27 = getDecimalLatLon(recordData.lat_deg, recordData.lat_min, recordData.lat_sec, recordData.lat_dir);
			var lon_nad27 = getDecimalLatLon(recordData.lon_deg, recordData.lon_min, recordData.lon_sec, recordData.lon_dir);
			
			//console.log(lat_nad27, lon_nad27);
			
			//convert from NAD27 to WGS84
			q = "SELECT ST_AsText(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326))";
			//console.log(q)
			db_contours.any(q)
				.then(function (data) {
				
				//console.log(data)
				var dum = data[0].st_astext.replace(/^.*\(/, '').replace(/\(.*$/, '');
				var lon = parseFloat(dum.split(' ')[0]);
				var lat = parseFloat(dum.split(' ')[1]);
				
				lat = mathjs.round(lat, 10);
				lon = mathjs.round(lon, 10);
				
				//console.log(lat, lon);
				
				var inputData = {
					"serviceType": recordData.serviceType,
					"callsign": recordData.fac_callsign,
					"facilityId": recordData.facility_id,
					"applicationId": recordData.application_id,
					"service": service_use,
					"dom_status": dom_status_use,
					"eng_record_type": eng_record_type_use,
					"lat": lat,
					"lon": lon,
					"nradial": nradial,
					"rcamsl": rcamsl_use,
					"field": field_use,
					"curve": curve_use,
					"channel": channel_use,
					"erp": erp_use,
					"src": src_use,
					"unit": "m"
				};
				
				//console.log(inputData);
				
				//check input data
				var inputOk = true;
				var invalidParam = '';
				for (var key in inputData) {
					if (inputData[key] == undefined) {
						inputOk = false;
						invalidParam = key;
					}
				}
				
				if (!inputOk) {
					console.log('invalid station data');
					callback('invalid station data', null);
					return;
				
				}
				
				
				//get antenna patetrn for directional antenna
				q = "SELECT * FROM " + LMS_SCHEMA + ".gis_ant_pattern WHERE antenna_id = " + recordData.antenna_id + " ORDER BY azimuth";
				//console.log(q)
				
				db_lms.any(q)
				.then(function (data) {
					console.log('pattern', data)
					var pattern = getPatternString(data);
					
					var url = "coverage.json?serviceType=" + inputData.serviceType + "&lat=" + inputData.lat + "&lon=" + inputData.lon +
							"&nradial=" + inputData.nradial + "&rcamsl=" + inputData.rcamsl + "&field=" + inputData.field + "&channel=" + inputData.channel +
							"&erp=" + inputData.erp + "&curve=" + inputData.curve + "&src=" + inputData.src + "&unit=" + inputData.unit + "&pattern=" + pattern;

					console.log(url);
					
					var contours_req = new Object;
					
					contours_req = 
						{"query":
							{
								"serviceType": inputData.serviceType.toString(),
								"lat": inputData.lat.toString(),
								"lon": inputData.lon.toString(),
								"nradial": inputData.nradial.toString(),
								"rcamsl": inputData.rcamsl.toString(),
								"field": inputData.field.toString(),
								"channel": inputData.channel.toString(),
								"erp": inputData.erp.toString(),
								"curve": inputData.curve.toString(),
								"src": inputData.src.toString(),
								"unit": inputData.unit.toString(),
								"pattern": pattern.toString(),
								"pop": pop.toString()
							}
						};
					
					try {
						contours.getContours(contours_req, res, function(data){
						console.log('calling coverage from entity', data);
						if(data){
							callback(null, data);    
						}
						return;           
						});
					}
					catch(err){
						callback('error calling coverage', null);  
						return;
					}
						
					})
					.catch(function (err) {
						console.log(err);
						res.status(400)
						callback(err, null);
						return;
					});
					


				})
				.catch(function (err) {
					console.log(err);
					callback(err, null);
					return;
				});
		})
		.catch(function (err) {
			console.log(err);
			callback(err, null);
		});
	
	}
	
}


function getRecord(serviceType, data) {
	//select records from those returned to make contour
	var i, record;
	var recordIndex = [];
	

	for (i = 0; i < data.length; i++) {
		if (serviceType == 'tv' && data[i].vsd_service == 'DT' && data[i].tv_dom_status == 'LIC' && (data[i].eng_record_type == 'C')) {
			recordIndex.push(i);
		}
		if (serviceType == 'fm' && data[i].asd_service == 'FM' && data[i].fm_dom_status == 'LIC' && data[i].eng_record_type == 'C') {
			recordIndex.push(i);
		}
	}
		
	var recordData = [];
	
	for (i = 0; i < recordIndex.length; i++) {
			recordData[i] = {};
			recordData[i].serviceType = serviceType;
			recordData[i].fac_callsign = data[recordIndex[i]].fac_callsign;
			recordData[i].facility_id = data[recordIndex[i]].facility_id;
			recordData[i].application_id = data[recordIndex[i]].application_id;
			recordData[i].lat_deg = data[recordIndex[i]].lat_deg;
			recordData[i].lat_min = data[recordIndex[i]].lat_min;
			recordData[i].lat_sec = data[recordIndex[i]].lat_sec;
			recordData[i].lat_dir = data[recordIndex[i]].lat_dir;
			recordData[i].lon_deg = data[recordIndex[i]].lon_deg;
			recordData[i].lon_min = data[recordIndex[i]].lon_min;
			recordData[i].lon_sec = data[recordIndex[i]].lon_sec;
			recordData[i].lon_dir = data[recordIndex[i]].lon_dir;
			recordData[i].vsd_service = data[recordIndex[i]].vsd_service;
			recordData[i].asd_service = data[recordIndex[i]].asd_service;
			recordData[i].tv_dom_status = data[recordIndex[i]].tv_dom_status;
			recordData[i].fm_dom_status = data[recordIndex[i]].fm_dom_status;
			recordData[i].eng_record_type = data[recordIndex[i]].eng_record_type;
			recordData[i].antenna_id = data[recordIndex[i]].antenna_id;
			recordData[i].antenna_type = data[recordIndex[i]].antenna_type;
			recordData[i].rcamsl_horiz_mtr = data[recordIndex[i]].rcamsl_horiz_mtr;
			recordData[i].rcamsl_vert_mtr = data[recordIndex[i]].rcamsl_vert_mtr;
			recordData[i].effective_erp = data[recordIndex[i]].effective_erp;
			recordData[i].vert_erp = data[recordIndex[i]].vert_erp;
			recordData[i].horiz_erp = data[recordIndex[i]].horiz_erp;
			recordData[i].fac_channel = data[recordIndex[i]].fac_channel;
			recordData[i].station_channel = data[recordIndex[i]].station_channel;
			recordData[i].station_class = data[recordIndex[i]].station_class;
	}
		
	return recordData;
}


function getDecimalLatLon(deg, min, sec, dir) {
//console.log(deg, min, sec, dir)

	var value = parseFloat(deg) + parseFloat(min)/60.0 + parseFloat(sec)/3600.0;
	if (dir == 'W' || dir == 'S') {
		value = -1 * value;
		
	}
	
	return value;

}

function getPatternString(data) {
	var i;
	var pattern = '';
	for (i = 0; i < data.length; i++) {
		pattern += data[i].azimuth + ',' + data[i].field_value + ';';
	}
	pattern = pattern.replace(/;$/, '');
	
	return pattern;
}

function callCoverage(res, root_url, inputData, pattern) {

	//console.log(inputData);
	var url = root_url + "/coverage.json?serviceType=" + inputData.serviceType + "&lat=" + inputData.lat + "&lon=" + inputData.lon +
				"&nradial=" + inputData.nradial + "&rcamsl=" + inputData.rcamsl + "&field=" + inputData.field + "&channel=" + inputData.channel +
				"&erp=" + inputData.erp + "&curve=" + inputData.curve + "&src=" + inputData.src + "&unit=" + inputData.unit + "&pattern=" + pattern;
	
	console.log(url);
	
	request(url, function (error, response, body) {
		if(error){
			console.log('coverage call error:', error);
			res.status(400)
			.json({
				"status": "error", 
				"statusCode": "400", 
				"statusMessage": "Coverage call error: " + error  + invalidParam + "."
			});
			return;
		}
		
		body = JSON.parse(body);
		
		//re-build properties
		var properties = {
			"callsign": inputData.callsign,
			"facility_id": inputData.facilityId,
			"application_id": inputData.applicationId,
			"service": inputData.service,
			"dom_status": inputData.dom_status,
			"eng_record_type": inputData.eng_record_type
		}
		for (var key in body.features[0].properties) {
			properties[key] = body.features[0].properties[key];
		}
		body.features[0].properties = properties;
		
	
		res.send(body);
	});

}


var getOneContour = function (db_contours, db_lms, queryParams, recordData, callback) {

console.log(recordData)

	if ([recordData.lat_deg,
	recordData.lat_min,
	recordData.lat_sec,
	recordData.lat_dir,
	recordData.lon_deg,
	recordData.lon_min,
	recordData.lon_sec,
	recordData.lon_dir].indexOf(undefined) >= 0) {
		console.log('record lat/lon not available');
		callback('record lat/lon not available', null);
		return;
	}
	
	if (recordData.rcamsl_horiz_mtr == undefined && recordData.rcamsl_vert_mtr == undefined) {
		console.log('rcamsl not available');
		callback('rcamsl not available', null);
		return;
	}
	
	if (recordData.effective_erp == undefined && recordData.horiz_erp == undefined && recordData.vert_erp == undefined) {
		console.log('ERP not available');
		callback('ERP not available', null);
		return;
	}
	
	if (recordData.facility_channel == undefined && recordData.station_channel == undefined) {
		console.log('channel not available');
		callback('channel not available', null);
		return;
	}
	
	if (recordData.serviceType == 'fm' && recordData.station_class == undefined) {
		console.log('station class not available');
		callback('station class not available', null);
		return;
	}
	
	if (recordData.antenna_type == 'D' && recordData.antenna_id == undefined) {
		console.log('antenna id not available');
		callback('antenna id not available', null);
		return;
	}
	
	var rcamsl_use;

	if (recordData.rcamsl_vert_mtr != undefined && recordData.rcamsl_horiz_mtr != undefined) {
		if (recordData.rcamsl_horiz_mtr >= recordData.rcamsl_vert_mtr) {
			rcamsl_use = recordData.rcamsl_horiz_mtr;
		}
		else {
			rcamsl_use = recordData.rcamsl_horiz_mtr;
		}
	}
	else if (recordData.rcamsl_horiz_mtr != undefined) {
		rcamsl_use = recordData.rcamsl_horiz_mtr;
	}
	else if (recordData.rcamsl_vert_mtr != undefined) {
		rcamsl_use = recordData.rcamsl_vert_mtr;
	}

	//console.log('rcamsl', rcamsl_use);
	
	var channel_use = recordData.station_channel;
	
	var isDigitalTv = false;
	if (recordData.vsd_service == 'DT') {
		isDigitalTv = true;
	}
	var curve_use = 0;
	if (isDigitalTv) {
		curve_use = 2;
	}
	
	//console.log('curve', curve_use);
	
	var erp_use;
	if (recordData.effective_erp) {
		erp_use = recordData.effective_erp;
	}
	else if (recordData.vert_erp && recordData.horiz_erp) {
		if (recordData.vert_erp >= recordData.horiz_erp) {
			erp_use = recordData.vert_erp;
		}
		else {
			erp_use = recordData.horiz_erp;
		}				
	}
	else if (recordData.vert_erp) {
		erp_use = recordData.vert_erp;
	}
	else if (recordData.horiz_erp) {
		erp_use = recordData.horiz_erp;
	}
	
	
	//console.log('erp_use', erp_use)
	
	var field_use;
	if (recordData.serviceType == 'fm') {
		if (recordData.station_class == 'B') {
			field_use = 54;
		}
		else if (recordData.station_class == 'B1') {
			field_use = 57;
		}
		else if (['A', 'C3', 'C2', 'C1', 'C'].indexOf(recordData.station_class) >= 0) {
			field_use = 60;
		}
		else {
			field_use = 60;
		}
	}
	else if (recordData.serviceType == 'tv' && isDigitalTv) {
		if (channel_use >= 2 && channel_use <= 6) {
			field_use = 28;
		}
		else if (channel_use >= 7 && channel_use <= 13) {
			field_use = 36;
		}
		else if (channel_use >= 14 && channel_use <= 69) {
			field_use = 41;
		}
	}
	else if (recordData.serviceType == 'tv' && !isDigitalTv) {
		if (channel_use >= 2 && channel_use <= 6) {
			field_use = 68;
		}
		else if (channel_use >= 7 && channel_use <= 13) {
			field_use = 71;
		}
		else if (channel_use >= 14 && channel_use <= 69) {
			field_use = 74;
		}
	}
	
	var service_use;
	if (recordData.serviceType == 'fm') {
		service_use = recordData.asd_service;
	}
	else if (recordData.serviceType == 'tv') {
		service_use = recordData.vsd_service;
	}
	if (!service_use) {
		service_use = 'None';
	}
	
	var dom_status_use;
	if (recordData.serviceType == 'fm') {
		dom_status_use = recordData.fm_dom_status;
	}
	else if (recordData.serviceType == 'tv') {
		dom_status_use = recordData.tv_dom_status;
	}
	if (!dom_status_use) {
		dom_status_use = 'None';
	}
				
	var eng_record_type_use = recordData.eng_record_type;
	if (!eng_record_type_use) {
		eng_record_type_use = 'None';
	}

	
	var lat_nad27 = getDecimalLatLon(recordData.lat_deg, recordData.lat_min, recordData.lat_sec, recordData.lat_dir);
	var lon_nad27 = getDecimalLatLon(recordData.lon_deg, recordData.lon_min, recordData.lon_sec, recordData.lon_dir);
	
	//console.log(lat_nad27, lon_nad27);
	
	//convert from NAD27 to WGS84
	var q = "SELECT ST_AsText(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326))";
	//console.log(q)
	db_contours.any(q)
		.then(function (data) {
		
		//console.log(data)
		var dum = data[0].st_astext.replace(/^.*\(/, '').replace(/\(.*$/, '');
		var lon = parseFloat(dum.split(' ')[0]);
		var lat = parseFloat(dum.split(' ')[1]);
		
		lat = mathjs.round(lat, 10);
		lon = mathjs.round(lon, 10);
		
		//console.log(lat, lon);
		
		var inputData = {
			"serviceType": recordData.serviceType,
			"callsign": recordData.fac_callsign,
			"facilityId": recordData.facility_id,
			"applicationId": recordData.application_id,
			"service": service_use,
			"dom_status": dom_status_use,
			"eng_record_type": eng_record_type_use,
			"lat": lat,
			"lon": lon,
			"nradial": queryParams.nradial,
			"rcamsl": rcamsl_use,
			"field": field_use,
			"curve": curve_use,
			"channel": channel_use,
			"erp": erp_use,
			"src": queryParams.src,
			"unit": queryParams.unit,
		};
		
		console.log(inputData);
		
		//check input data
		var inputOk = true;
		var invalidParam = '';
		for (var key in inputData) {
			if (inputData[key] == undefined) {
				inputOk = false;
				invalidParam = key;
			}
		}
		
		if (!inputOk) {
			console.log('invalid station data');
			callback('invalid station data', null);
			return;
		
		}
		
		//get antenna patetrn for directional antenna
		q = "SELECT * FROM " + LMS_SCHEMA + ".gis_ant_pattern WHERE antenna_id = " + recordData.antenna_id + " ORDER BY azimuth";
		console.log(q)
		
		db_lms.any(q)
		.then(function (data) {
			console.log('pattern', data)
			var pattern = getPatternString(data);
			
			var url = "coverage.json?serviceType=" + inputData.serviceType + "&lat=" + inputData.lat + "&lon=" + inputData.lon +
					"&nradial=" + inputData.nradial + "&rcamsl=" + inputData.rcamsl + "&field=" + inputData.field + "&channel=" + inputData.channel +
					"&erp=" + inputData.erp + "&curve=" + inputData.curve + "&src=" + inputData.src + "&unit=" + inputData.unit + "&pattern=" + pattern;

			console.log(url);
			
			var contours_req = new Object;
			
			contours_req = 
				{"query":
					{
						"serviceType": inputData.serviceType.toString(),
						"lat": inputData.lat.toString(),
						"lon": inputData.lon.toString(),
						"nradial": queryParams.nradial.toString(),
						"rcamsl": inputData.rcamsl.toString(),
						"field": inputData.field.toString(),
						"channel": inputData.channel.toString(),
						"erp": inputData.erp.toString(),
						"curve": inputData.curve.toString(),
						"src": inputData.src.toString(),
						"unit": inputData.unit.toString(),
						"pattern": pattern.toString(),
						"pop": queryParams.pop.toString()
					}
				};
				
			console.log(contours_req)
			
			try {
				console.log('in try')
				contours.getContours(contours_req, null, function(data){
				console.log('calling coverage from entity', data);
				if(data){
					var properties = {};
					properties.callsign = inputData.callsign;
					properties.facility_id = inputData.facilityId;
					properties.application_id = inputData.applicationId;
					for (var key in data.features[0].properties) {
						properties[key] = data.features[0].properties[key];
					}
					data.features[0].properties = properties;
					
					callback(null, data);    
					
				}
				return;           
				});
			}
			catch(err){
				callback('error calling coverage', null);  
				return;
			}
				
		})
		.catch(function (err) {
			console.log(err);
			res.status(400)
			callback(err, null);
			return;
		});
	})
	.catch(function (err) {
		console.log(err);
		callback(err, null);
		return;
	});
				
};



module.exports.getEntity = getEntity;


