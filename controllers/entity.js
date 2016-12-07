
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

var async = require('async');
var request = require('request');
var mathjs = require('mathjs');
var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp_lms = require('pg-promise')(options);
var pgp_contours = require('pg-promise')(options);

var contours = require('./contours.js');


function getEntity(req, res, callback) {

	console.log('\n' + '============ getEntity ============');
	try {
		var db_lms = pgp_lms(LMS_PG);
		console.log('\n' + 'connected to LMS DB');
	}
	catch(e) {
		console.log('\n' + 'connection to LMS DB failed' + e);
	}
	
	try {
		var db_contours = pgp_contours(CONTOURS_PG);
		console.log('\n' + 'connected to CONTOURS DB');
	}
	catch(e) {
		console.log('\n' + 'connection to CONTOURS DB failed' + e);
	}

	var serviceType = req.query.serviceType;	
	var callsign = req.query.callsign;
	var facilityId = req.query.facilityId;
	var applicationId = req.query.applicationId;
	var src = req.query.src;
	var nradial = req.query.nradial;
	var pop = req.query.pop;
	var area = req.query.area;
	var field = req.query.field;
	var curve = req.query.curve;

	if(nradial === undefined){
		nradial = '360';
	}
	if (pop === undefined) {
		pop = '';
	}
	if (area === undefined) {
		area = '';
	}

	var idType;
	
	var i;
	
	if (serviceType == undefined) {
		console.log('\n' + 'serviceType missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'serviceType missing'
		});
		return;
	}
	
	serviceType = serviceType.toLowerCase();
	if (['tv', 'fm'].indexOf(serviceType) < 0) {
		console.log('\n' + 'invalid serviceType value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid serviceType value - must be tv or fm.'
		});
		return;
	}
	
	var v3 = [callsign, facilityId, applicationId];
		var numDefined = 0;
	for (i = 0; i < v3.length; i++) {
		if (v3[i] !== undefined) {
			numDefined++;
		}
	}
	
	console.log('\n' + v3, numDefined);
	
	if (numDefined === 0) {
		console.log('\n' + 'must provide one of callsign, facilityId, or applicationId');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'must provide one of callsign, facilityId, or applicationId.'
		});
		return;
	}
	
	if (numDefined > 1) {
		console.log('\n' + 'should provide only one of callsign, facilityId, or applicationId');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'should provide only one of callsign, facilityId, or applicationId.'
		});
		return;
	}
	
	if ( (facilityId != undefined && facilityId != '') && !facilityId.match(/^\d+$/)) {
		console.log('\n' + 'invalid facilityId value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid facilityId value.'
		});
		return;
	}
	
	if (src != undefined && ['ned', 'ned_1', 'ned_2', 'globe30'].indexOf(src.toLowerCase()) < 0) {
		console.log('\n' + 'invalid src value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid src value.'
		});
		return;
	}
	
	if (nradial == undefined) {
		console.log('\n' + 'missing nradial');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Missing nradial parameter.'
		});
		return;
	}
	
	if ( !nradial.match(/^\d+$/)) {
		console.log('\n' + 'invalid nradial value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value.'
		});
		return;
	}
	
	if ( parseFloat(nradial) <8 || parseFloat(nradial) > 360 ) {
		console.log('\n' + 'nradial value out of range [8, 360]');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'nradial value out of range [8, 360].'
		});
		return;		
	}

	if (field != undefined  && !field.match(/^\d+$/)) {
		console.log('\n' + 'invalid field value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid field value.'
		});
		return;
	}

	if (curve != undefined  && !curve.match(/^\d+$/)) {
		console.log('\n' + 'invalid curve value');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'Invalid curve value.'
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
		"pop": pop,
		"field": field,
		"curve": curve
	}
	
	var q, eng_data_table;
	if (["tv", "fm"].indexOf(serviceType) >= 0) {		
		eng_data_table = LMS_SCHEMA + ".gis_" + serviceType + "_eng_data";
		if (facilityId != undefined) {
			idType = 'facilityId';
			q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and a.facility_id = " + facilityId;
		}
		if (callsign != undefined) {
			idType = 'callsign';
			q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and a.fac_callsign = '" + callsign + "'";
		}
		if (applicationId != undefined) {
			if(isNaN(applicationId)){
				idType = 'applIdUuid';
				q = "SELECT f.callsign, f.facility_id, f.channel, a.aapp_application_id, " +
					" loc.aloc_lat_deg, loc.aloc_lat_mm, loc.aloc_lat_ss, loc.aloc_lat_dir, loc.aloc_long_deg, loc.aloc_long_mm, loc.aloc_long_ss, loc.aloc_long_dir," +
					" lfv.service_code, lfv.auth_type_code, ant.aant_antenna_id, ant.aant_antenna_type_code, " +
					" ant.aant_horiz_rc_amsl, ant.aant_vert_rc_amsl, antf.aafq_power_erp_kw, " +
					" antf.aafq_vert_erp_kw, antf.aafq_horiz_erp_kw, antf.aafq_channel, antf.aafq_class_station_code" +
					" FROM common_schema.facility f, " +
					" common_schema.application_facility af," +
					" common_schema.license_filing_version lfv," +
					" common_schema.application a, " +
					" mass_media.app_location loc, " +
					" mass_media.app_antenna ant, " +
					" mass_media.app_antenna_frequency antf " +
					" WHERE f.facility_id = af.afac_facility_id" + 
					" AND af.afac_application_id = a.aapp_application_id" +
					" AND lfv.filing_version_id = a.aapp_application_id" +
					" AND loc.aloc_aapp_application_id = a.aapp_application_id" +
					" AND loc.aloc_loc_record_id = ant.aant_aloc_loc_record_id" +
					" AND ant.aant_antenna_record_id = antf.aafq_aant_antenna_record_id" +
					" AND a.aapp_application_id = '" + applicationId + "'";
			}
			else {
				idType = 'applIdNumber';
				q = "SELECT a.*, b.* from " + LMS_SCHEMA + ".gis_facility a, " + eng_data_table + " b where a.facility_id = b.facility_id and b.application_id = '" + applicationId + "'";	
				q += " ORDER BY application_id DESC";
			}
			
		}
		
		console.log('\n' + 'serviceType '+serviceType+ ' query='+q);
		
		
		db_lms.any(q)
		.then(function (data) {
			if (data.length == 0) {
				console.log('\n' + 'no valid record found');
				callback('no valid record found', null);
				return;
			}
			
			var recordData = getRecord(serviceType, idType, data);
			
			console.log('\n' + 'recorddata', JSON.stringify(recordData))
			
			if (recordData.length == 0) {
				console.log('\n' + 'A valid licensed record could not be found');
				callback('A valid licensed record could not be found', null)
				return;
			}
			
			console.log('\n' + 'Query Results='+recordData);
			console.log('\n' + 'getOneContour queryParams='+queryParams);
			
			var asyncTasks = [];
			for (i = 0; i < recordData.length; i++) {
				asyncTasks.push(getOneContour(db_contours, db_lms, idType, queryParams, recordData[i]));
			}
			
			console.log('\n' + 'async task=', asyncTasks)
			
			async.parallel(asyncTasks, function(error, result){
				console.log('\n' + "all done");
				
				//console.log('\n' + result)
				if (error) {
					callback(error, []);
				
				}
				else {
				
					var features = [];
					for (i = 0; i < result.length; i++) {
						console.log('each contour status='+result[i].features[0].properties.statusCode);
						if(result[i].features[0].properties.statusCode == '200'){
							features.push(result[i].features[0])	
						}
					}
					features.sort(function(a,b) {return a.properties.area - b.properties.area;});
					var contours = {type: "FeatureCollection", "features": features};
				
					callback(null, contours);
				}
				
			});
			
		})
		.catch(function (err) {
			console.log('\n' + err);
			callback(err, null);
		});
	
	}
	
}


function getRecord(serviceType, idType, data) {
	console.log('\n' + 'getRecord idType='+idType);
	//select records from those returned to make contour
	var i, record;
	var recordIndex = [];
	var recordData = [];
	
	if(idType == 'applIdUuid'){
		console.log('\n' + 'getting appliaction uuid record');
		for (i = 0; i < data.length; i++) {
			recordIndex.push(i);
		}

		for (i = 0; i < recordIndex.length; i++) {			
			recordData[i] = {};
			recordData[i].serviceType = serviceType;
			recordData[i].fac_callsign = data[recordIndex[i]].callsign;
			recordData[i].facility_id = data[recordIndex[i]].facility_id;
			recordData[i].application_id = data[recordIndex[i]].aapp_application_id;
			recordData[i].lat_deg = data[recordIndex[i]].aloc_lat_deg;
			recordData[i].lat_min = data[recordIndex[i]].aloc_lat_mm;
			recordData[i].lat_sec = data[recordIndex[i]].aloc_lat_ss;
			recordData[i].lat_dir = data[recordIndex[i]].aloc_lat_dir;
			recordData[i].lon_deg = data[recordIndex[i]].aloc_long_deg;
			recordData[i].lon_min = data[recordIndex[i]].aloc_long_mm;
			recordData[i].lon_sec = data[recordIndex[i]].aloc_long_ss;
			recordData[i].lon_dir = data[recordIndex[i]].aloc_long_dir;
			recordData[i].vsd_service = data[recordIndex[i]].service_code;
			recordData[i].asd_service = data[recordIndex[i]].service_code;
			recordData[i].tv_dom_status = data[recordIndex[i]].auth_type_code;
			recordData[i].fm_dom_status = data[recordIndex[i]].auth_type_code;
			//recordData[i].eng_record_type = data[recordIndex[i]].eng_record_type;
			recordData[i].antenna_id = data[recordIndex[i]].aant_antenna_id;
			recordData[i].antenna_type = data[recordIndex[i]].aant_antenna_type_code;
			recordData[i].rcamsl_horiz_mtr = data[recordIndex[i]].aant_horiz_rc_amsl;
			recordData[i].rcamsl_vert_mtr = data[recordIndex[i]].aant_vert_rc_amsl;
			recordData[i].effective_erp = data[recordIndex[i]].aafq_power_erp_kw;
			recordData[i].vert_erp = data[recordIndex[i]].aafq_vert_erp_kw;
			recordData[i].horiz_erp = data[recordIndex[i]].aafq_horiz_erp_kw;
			recordData[i].fac_channel = data[recordIndex[i]].channel;
			recordData[i].station_channel = data[recordIndex[i]].aafq_channel;
			recordData[i].station_class = data[recordIndex[i]].aafq_class_station_code;
			console.log('\n' + i + ' recordData='+recordData[i]);
		}
	}
	else {
		for (i = 0; i < data.length; i++) {
			if (serviceType == 'tv' && data[i].tv_dom_status == 'LIC' && (data[i].eng_record_type == 'C') && data[i].antenna_id != 0 ) {
				recordIndex.push(i);
			}
			if (serviceType == 'fm' && data[i].asd_service == 'FM' && data[i].fm_dom_status == 'LIC' && data[i].eng_record_type == 'C') {
				recordIndex.push(i);
			}
		}	

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
			recordData[i].ant_rotation = data[recordIndex[i]].ant_rotation;
			recordData[i].rcamsl_horiz_mtr = data[recordIndex[i]].rcamsl_horiz_mtr;
			recordData[i].rcamsl_vert_mtr = data[recordIndex[i]].rcamsl_vert_mtr;
			recordData[i].effective_erp = data[recordIndex[i]].effective_erp;
			recordData[i].vert_erp = data[recordIndex[i]].vert_erp;
			recordData[i].horiz_erp = data[recordIndex[i]].horiz_erp;
			recordData[i].fac_channel = data[recordIndex[i]].fac_channel;
			recordData[i].station_channel = data[recordIndex[i]].station_channel;
			recordData[i].station_class = data[recordIndex[i]].station_class;
			console.log('\n' + i + ' recordData='+recordData[i]);
		}
	}
		
	return recordData;
}


function getDecimalLatLon(deg, min, sec, dir) {
//console.log('\n' + deg, min, sec, dir)

	var value = parseFloat(deg) + parseFloat(min)/60.0 + parseFloat(sec)/3600.0;
	if (dir == 'W' || dir == 'S') {
		value = -1 * value;
		
	}
	
	return value;

}

function getPatternString(data, ant_rotation) {
	var i;
	var pattern = '';
	var az;
	var az_value = [];
	for (i = 0; i < data.length; i++) {
		az = data[i].azimuth + ant_rotation;
		if (az >= 360) {
			az -= 360;
		}
		az_value.push([az, data[i].field_value]);
	}
	az_value = az_value.sort(function(a,b) {return a[0]-b[0];});

	for (i = 0; i < az_value.length; i++) {
		pattern += az_value[i][0] + ',' + az_value[i][1] + ';';
	}
	
	pattern = pattern.replace(/;$/, '');
	
	return pattern;
}


var getOneContour = function (db_contours, db_lms, idType, queryParams, recordData) {return function(callback) {

console.log('\n' + 'getOneContour recordData='+JSON.stringify(recordData));

	if ([recordData.lat_deg,
	recordData.lat_min,
	recordData.lat_sec,
	recordData.lat_dir,
	recordData.lon_deg,
	recordData.lon_min,
	recordData.lon_sec,
	recordData.lon_dir].indexOf(undefined) >= 0) {
		console.log('\n' + 'record lat/lon not available');
		callback('record lat/lon not available', null);
		return;
	}
	
	if (recordData.rcamsl_horiz_mtr == undefined && recordData.rcamsl_vert_mtr == undefined) {
		console.log('\n' + 'rcamsl not available');
		callback('rcamsl not available', null);
		return;
	}
	
	if (recordData.effective_erp == undefined && recordData.horiz_erp == undefined && recordData.vert_erp == undefined) {
		console.log('\n' + 'ERP not available');
		callback('ERP not available', null);
		return;
	}
	
	if (recordData.fac_channel == undefined && recordData.station_channel == undefined) {
		console.log('\n' + 'channel not available');
		callback('channel not available', null);
		return;
	}
	
	if (recordData.serviceType == 'fm' && recordData.station_class == undefined) {
		console.log('\n' + 'station class not available');
		callback('station class not available', null);
		return;
	}
	
	if ((recordData.antenna_type == 'D' || recordData.antenna_type == 'DIR') && recordData.antenna_id == undefined) {
		console.log('\n' + 'antenna id not available');
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

	//console.log('\n' + 'rcamsl', rcamsl_use);
	
	var channel_use = recordData.station_channel;

	if(channel_use == undefined || channel_use == null){
		channel_use = recordData.fac_channel;
	}
	
	//console.log('\n'+'vsd_service='+recordData.vsd_service[0]);
	var isDigitalTv = false;
	if (recordData.vsd_service && recordData.vsd_service[0] && recordData.vsd_service[0].toUpperCase() === 'D') {
		isDigitalTv = true;
	}
	var curve_use = 0;
	if (isDigitalTv) {
		curve_use = 2;
	}
	if (queryParams.curve != undefined) {
		curve_use = queryParams.curve;
	}	
	console.log('\n' + 'isDigitalTv='+isDigitalTv+',curve='+curve_use);
	
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
	
	
	//console.log('\n' + 'erp_use', erp_use)
	
	var field_use;
	if (queryParams.field != undefined) {
		field_use = queryParams.field;
	}
	else if (recordData.serviceType == 'fm') {
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
	console.log('\n' + 'field_use='+field_use);
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
	
	//console.log('\n' + lat_nad27, lon_nad27);
	
	//convert from NAD27 to WGS84
	var q = "SELECT ST_AsText(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326))";
	console.log('\n' + 'NAD27 to WGS84 Query='+q);
	db_contours.any(q)
		.then(function (data) {
		
		//console.log('\n' + data)
		var dum = data[0].st_astext.replace(/^.*\(/, '').replace(/\(.*$/, '');
		var lon = parseFloat(dum.split(' ')[0]);
		var lat = parseFloat(dum.split(' ')[1]);
		
		lat = mathjs.round(lat, 10);
		lon = mathjs.round(lon, 10);
		
		//console.log('\n' + lat, lon);
		
		var inputData = {
			"serviceType": recordData.serviceType,
			"callsign": recordData.fac_callsign,
			"facilityId": recordData.facility_id,
			"applicationId": recordData.application_id,
			"antenna_id": recordData.antenna_id,
			"antenna_type": recordData.antenna_type,
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
		
		if (!inputData.antenna_id) {
			inputData.antenna_id = -999;
		}
		
		console.log('\n' + 'contour inputData='+JSON.stringify(inputData));
		
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
			console.log('\n' + 'invalid station data='+invalidParam);
			callback('invalid station data', null);
			return;
		
		}
		
		//get antenna patetrn for directional antenna
		q = "SELECT * FROM " + LMS_SCHEMA + ".gis_ant_pattern WHERE antenna_id = " + recordData.antenna_id + " ORDER BY azimuth";
		if(idType == 'applIdUuid'){
			q = "SELECT antfv.aafv_azimuth azimuth, antfv.aafv_field_value field_value FROM" +
				" common_schema.application a," + 
				" mass_media.app_location loc," + 
				" mass_media.app_antenna ant," + 
				" mass_media.app_antenna_frequency antf," +
				" mass_media.app_antenna_field_value antfv" +
				" WHERE loc.aloc_aapp_application_id = a.aapp_application_id" +
				" AND loc.aloc_loc_record_id = ant.aant_aloc_loc_record_id" +
				" AND ant.aant_antenna_record_id = antf.aafq_aant_antenna_record_id" +
				" AND ant.aant_antenna_record_id = antfv.aafv_aant_antenna_record_id" +
				" AND a.aapp_application_id = '" + recordData.application_id + "' and ant.aant_antenna_id = '" + recordData.antenna_id + "' order by azimuth";
		}
		console.log('\n' + 'oneContour antenna patetrn Query='+q);
		
		db_lms.any(q)
		.then(function (data) {
			console.log('\n' + 'Query data [pattern] =', data)
			var ant_rotation = recordData.ant_rotation;
			if (ant_rotation == null) {
				ant_rotation = 0;
			}
			
			console.log('rotation', ant_rotation);
			var pattern = getPatternString(data, ant_rotation);
			
			var url = "coverage.json?serviceType=" + inputData.serviceType + "&lat=" + inputData.lat + "&lon=" + inputData.lon +
					"&nradial=" + inputData.nradial + "&rcamsl=" + inputData.rcamsl + "&field=" + inputData.field + "&channel=" + inputData.channel +
					"&erp=" + inputData.erp + "&curve=" + inputData.curve + "&src=" + inputData.src + "&unit=" + inputData.unit + "&pattern=" + pattern+'&outputcache=false';

			console.log('\n' + 'coverage API URL='+url);
			
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
				
			console.log('\n' + 'contours_req='+contours_req);
			
			try {
				console.log('\n' + 'in try')
				contours.getContours(contours_req, null, function(data){
				console.log('\n' + 'oneContour coverage from entity' +data);
				if(data){
					console.log('contour response code: '+data.features[0].properties.statusCode);
					if(data.features[0].properties.statusCode == '200'){
						console.log('using this contour');
						var properties = {};
						properties.callsign = inputData.callsign;
						properties.facility_id = inputData.facilityId;
						properties.application_id = inputData.applicationId;
						properties.antenna_id = inputData.antenna_id;
						properties.antenna_type = inputData.antenna_type;
						properties.service = inputData.service;
						for (var key in data.features[0].properties) {
							properties[key] = data.features[0].properties[key];
						}
						data.features[0].properties = properties;
						
						callback(null, data);    
					}
					else {
						callback(null, data);
					}
					
					
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
			console.log('\n' + err);
			res.status(400)
			callback(err, null);
			return;
		});
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
		return;
	});
				
}};



module.exports.getEntity = getEntity;


