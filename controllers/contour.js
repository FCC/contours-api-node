
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;

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

function getContour(req, res) {
	
	console.log('\n\n getContour ' );
	
	var serviceType = req.params.serviceType.toLowerCase();
	var idType = req.params.idType.toLowerCase();
	var idValue = req.params.id.toLowerCase();
	var format = req.params.ext;
	
	if (!format) {
		format = 'json';
	}
	else {
		format.toLowerCase();
	}	
	
	if (format == 'xml') { format = 'gml'; }
	if (format == 'zip') { format = 'shp'; }
	
	console.log('serviceType ' + serviceType);
	console.log('idType ' + idType);
	console.log('idValue ' + idValue);
	console.log('format ' + format);

	var outputFormat = 'application/json';
	
	if (format == 'json') {
		outputFormat = 'application/json';
	}
	else if (format == 'jsonp') {
		outputFormat = 'text/javascript';
	}
	else if (format == 'gml') {
		outputFormat = 'GML3';
	}
	else if (format == 'csv') {
		outputFormat = 'csv';
	}
	else if (format == 'shp') {
		outputFormat = 'shape-zip';
	}
	else if (format == 'kml') {
		outputFormat = 'kml';
	}
	
	console.log('outputFormat ' + outputFormat);

	// **********************************************************

	var stationClass = 'b'; //default
	var timePeriod = 'daytime'; //default
	var contour_level = 0.5;

	if (serviceType == 'am') {
	
		if (req.params.stationClass) {
			stationClass = req.params.stationClass.toLowerCase();
		}
		if (req.params.timePeriod) {
			timePeriod = req.params.timePeriod + 'time'.toLowerCase();
		}		
		if (stationClass == 'a') {
			contour_level = 0.025;
		}
		// b, c, d = 0.5

	}

	console.log('stationClass ' + stationClass);
	console.log('timePeriod ' + timePeriod);
	console.log('contour_level ' + contour_level);	
	
	// **********************************************************
	
	var typeName = 'contour:' + serviceType + '_contours';
	var filter;
	
	if (idType == 'applicationid') {
		filter = 'application_id=' + idValue;
	}
	else if (idType == 'filenumber') {
		filter = 'filenumber ILIKE \'' + idValue + '\'';
	}
	else if (idType == 'callsign') {
		filter = 'callsign ILIKE \'' + idValue + '\'';
	}
	else if (idType == 'antennaid') {
		filter = 'antid=' + idValue;
	}
	else if (idType == 'facilityid') {
		filter = 'facility_id=' + idValue;
	}

	if (serviceType == 'am') {
		filter += '+AND+contour_level=' + contour_level + '+AND+time_period=\'' + timePeriod + '\'';
	}
	
	console.log('filter ' + filter);

	var getUrl = geo_host + '/' + geo_space + '/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=' + typeName + '&maxFeatures=100&sortBy=area+D&outputFormat=' + outputFormat + '&cql_filter=' + filter; 

	console.log('getUrl ' + getUrl);	
	
	// **********************************************************
		
	request({url: getUrl, encoding: null, rejectUnauthorized: false, strictSSL: false}, function (err, response, body) {
		
		if (err) {
				
			console.error('err.stack : ' + err.stack);
			console.error('err.name : ' + err.name);
			console.error('err.message : ' + err.message);
		
			var err_res = {};       
			err_res.responseStatus = {
				'status': 500,
				'type': 'Internal Server Error',
				'err': err.name +': '+ err.message      
			};  
				
			res.status(500);
			res.send(err_res);				
			
		}
		else {
		
			console.log('response.statusCode : ' + response.statusCode);			
			console.log('response.headers[content-type] : ' + response.headers['content-type']);
			console.log('response.headers : ' + JSON.stringify(response.headers) );		
			
			var content_type = response.headers['content-type'];
			
			if ((!response.statusCode == 200))  {			
			
				console.error('response.statusCode : ' + response.statusCode);
			
				var err_res = {};       
				err_res.responseStatus = {
					'status': 500,
					'type': 'Internal Server Error',
					'err': 'Response: '+ response.statusCode      
				};  
					
				res.status(500);
				res.send(err_res);	
			
			}
			else if (content_type == 'text/xml;charset=UTF-8')  {			
			
				console.error('content_type : ' + content_type);
			
				var err_res = {};       
				err_res.responseStatus = {
					'status': 500,
					'type': 'Internal Server Error',
					'err': 'Content: '+ content_type      
				};  
					
				res.status(500);
				res.send(err_res);	
			
			}
			else {
				
				var content_ext = format;
				var content_disp = '';
				
				if (format == 'shp') {
					content_ext = 'zip';
					content_disp = 'attachment';
				}							
				
				var filename_attach = 'contour-' + idType + '-' + idValue + '.' + content_ext;
				
				console.log('content_type ' + content_type);	
				console.log('content_ext ' + content_ext);
				console.log('filename_attach ' + filename_attach);
				
				res.set({
					'Content-Disposition': ''+ content_disp +'; filename=\''+filename_attach+'\'',
					'Content-Type': content_type,
					'Content-Length': body.length
				});
		
				console.log(body);
				
				res.send(body);
			
			}
		}		
	});	
}

// **********************************************************

module.exports.getContour = getContour;
