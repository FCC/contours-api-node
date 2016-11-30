
// **********************************************************

'use strict';

// **********************************************************

//var configEnv = require('../config/env.json');
var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.NODE_PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;

// **********************************************************

console.log('contour ' + host);

var http = require('http');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();
var fs = require('fs');
var request = require('request');

// **********************************************************

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// **********************************************************

function getContour(req, res, callback) {
	
    console.log('\n\n getContour ' );
	
	var serviceType = req.params.serviceType.toLowerCase();
	var idType = req.params.idType.toLowerCase();
	var idValue = req.params.id.toLowerCase();
	var format = req.params.ext;
	var ret_obj;
	
	if (!format) {
		format = 'json';
	}
	else {
		format.toLowerCase();
	}	
	
	if (format === 'xml') { format = 'gml'; }
	if (format === 'zip') { format = 'shp'; }
	
	console.log('serviceType ' + serviceType);
	console.log('idType ' + idType);
	console.log('idValue ' + idValue);
	console.log('format ' + format);

	var outputFormat = 'application/json';
	
	if (format === 'json') {
		outputFormat = 'application/json';
	}
	else if (format === 'jsonp') {
		outputFormat = 'text/javascript';
	}
	else if (format === 'gml') {
		outputFormat = 'GML3';
	}
	else if (format === 'csv') {
		outputFormat = 'csv';
	}
	else if (format === 'shp') {
		outputFormat = 'shape-zip';
	}
	else if (format === 'kml') {
		outputFormat = 'kml';
	}
	
	console.log('outputFormat ' + outputFormat);

	// **********************************************************

	//var stationClass = 'B'; //default
	var timePeriod = 'daytime'; //default
	var contour_level = 0.5;

	if (serviceType === 'am') {
	
		if (req.query.stationClass) {
			var stationClass = req.query.stationClass.toUpperCase();
		}
		if (req.param.timePeriod) {
			timePeriod = req.query.timePeriod + 'time'.toLowerCase();
		}		
		if (stationClass === 'A') {
			contour_level = 0.025;
		}
		// b, c, d = 0.5

	}

	console.log('stationClass ' + stationClass);
	console.log('timePeriod ' + timePeriod);
	console.log('contour_level ' + contour_level);	
	
	// **********************************************************
	
	var typeName = geo_space +':' + serviceType + '_contours';
	var filter;
	
	idValue = idValue.replace('%','\\%25');
	idValue = idValue.replace('_','\\%5F');
	
	if (idType === 'applicationid') {
		filter = 'application_id=' + idValue;
	}
	else if (idType === 'filenumber') {
		filter = 'filenumber ILIKE \'' + idValue + '\'';
	}
	else if (idType === 'callsign') {
		filter = 'callsign ILIKE \'' + idValue + '\'';
	}
	else if (idType === 'antennaid') {
		filter = 'antid=' + idValue;
	}
	else if (idType === 'facilityid') {
		filter = 'facility_id=' + idValue;
	}
	
	if (serviceType === 'am') {
		if(idType === 'applicationid'){
			ret_obj = {
				'status': 400,
				'type': 'Invalid Input',
				'err': 'applicationid is not a valid idType for AM services'      
			};  
			return callback(ret_obj, null);
		}else if(idType === 'filenumber'){
			ret_obj = {
				'status': 400,
				'type': 'Invalid Input',
				'err': 'filenumber is not a valid idType for AM services'      
			};  
			return callback(ret_obj, null);
		}else{
			filter += '+AND+contour_level=' + contour_level + '+AND+time_period=\'' + timePeriod + '\'';
			if(stationClass !== undefined){
				filter+= '+AND+class=\''+stationClass+'\'';
			}
		}
	}else if(serviceType !== 'am'){
		if(idType === 'antennaid'){
			ret_obj = {
				'status': 400,
				'type': 'Invalid Input',
				'err': 'antennaid is not a valid idType for FM or TV services'      
			};  
			return callback(ret_obj, null);
		}
	}
	
	console.log('filter ' + filter);

	var getUrl = geo_host + '/' + geo_space + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + typeName + '&maxFeatures=1&sortBy=filenumber+D&outputFormat=' + outputFormat + '&cql_filter=' + filter; 

	console.log('getUrl ' + getUrl);	
	
	// **********************************************************
		
	request({url: getUrl, encoding: null, rejectUnauthorized: false, strictSSL: false}, function (err, response, body) {
		
		if (err) {
				
			console.error('err.stack : ' + err.stack);
			console.error('err.name : ' + err.name);
			console.error('err.message : ' + err.message);
		
			ret_obj = {
				'status': 500,
				'type': 'Internal Server Error',
				'err': err.name +': '+ err.message      
			};  
			return callback(ret_obj, null);
		}
		else {
		
			console.log('response.statusCode : ' + response.statusCode);			
			console.log('response.headers[content-type] : ' + response.headers['content-type']);
			console.log('response.headers : ' + JSON.stringify(response.headers) );		
			
			var content_type = response.headers['content-type'];
			
			if ((!response.statusCode === 200))  {			
			
				console.error('response.statusCode : ' + response.statusCode);
			
				ret_obj = {
					'status': 500,
					'type': 'Internal Server Error'    
				};  
				return callback(ret_obj, null);
			
			}
			else if (content_type === 'text/xml;charset=UTF-8')  {			
			
				console.error('content_type : ' + content_type);
			
				ret_obj = {
					'status': 500,
					'type': 'Internal Server Error'       
				};  
				return callback(ret_obj, null);
			}
			else {
				
				var content_ext = format;
				var content_disp = '';
				
				if (format === 'shp') {
					content_ext = 'zip';
					content_disp = 'attachment';
				}							
				
				var filename_attach = 'contour-' + idType + '-' + idValue + '.' + content_ext;
				
				console.log('content_type ' + content_type);	
				console.log('content_ext ' + content_ext);
				console.log('filename_attach ' + filename_attach);
				
				ret_obj = {
					'Content-Disposition': ''+ content_disp +'; filename='+filename_attach,
					'Content-Type': content_type,
					'Content-Length': body.length
				};
		
				console.log('geoserver response returned with totalFeatures: '+body.totalFeatures);
				
				return callback(ret_obj, body);
			
			}
		}		
	});	
}

// **********************************************************

module.exports.getContour = getContour;
