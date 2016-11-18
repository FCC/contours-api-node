
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

var CONTEXT_PATH = process.env.CONTEXT_PATH || 'api/contours/';
if (NODE_ENV === 'DEV' || NODE_ENV === 'LOCAL') {
	CONTEXT_PATH = '';
}

var fs = require('fs');
var request = require('request');

var GeoJSON = require('geojson');
var math = require('mathjs');

var haat = require('./haat.js');
var distance = require('./distance.js');
var tvfm_curves = require('./tvfm_curves.js');
var area = require('./area.js');
var population = require('./population.js');
var validate = require('./validate.js');

var data_dir = EFS_ELEVATION_DATASET;

var startTime;




function getContours(req, res, callback) {
	try {
		console.log('\n================== start contours process ==============');
		console.log(new Date());

		var startTime, endTime;
		
		startTime = new Date().getTime();	

		var returnJson;
		var src = req.query.src;
		var lat = req.query.lat;
		var lon = req.query.lon;
		var rcamsl = req.query.rcamsl;
		var nradial = req.query.nradial;
		var unit = req.query.unit;
		var erp = req.query.erp;
		//var curve_type = req.query.curve_type;
		
		var field = req.query.field;
		var channel = req.query.channel;
		var curve = req.query.curve;
		var serviceType = req.query.serviceType;
		
		var pattern = req.query.pattern;
		if (pattern) {
			pattern = decodeURIComponent(pattern);
		}
		else {
			pattern = undefined;
		}
		
		var pop = req.query.pop;
		
		
		var dataObj = new Object;		
		dataObj['status'] = 'error';
		dataObj['statusCode'] = '400';
		dataObj['statusMessage'] = '';

		GeoJSON.defaults = {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage']};
		
		if (serviceType === undefined) {
			console.log('Missing serviceType');
			dataObj.statusMessage = 'Missing serviceType.';
			returnError(dataObj, function(ret){
                 //res.status(400).send(GeoJSON.parse(ret, {}));                                         
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		serviceType = serviceType.toLowerCase();
		
		var tv_fm_list = ['tv', 'fm'];
		if (tv_fm_list.indexOf(serviceType) < 0) {
			console.log('invalid serviceType value');			
			dataObj.statusMessage = 'Invalid serviceType value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (src === undefined) {
			src = 'ned_1';
		}
		if (unit === undefined) {
			unit = 'm';
		}
		
		if (lat === undefined) {			
			dataObj.statusMessage = 'Missing lat parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (lon === undefined) {
			dataObj.statusMessage = 'Missing lon parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (nradial === undefined) {
			dataObj.statusMessage = 'Missing nradial parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (rcamsl === undefined) {
			dataObj.statusMessage = 'Missing rcamsl parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (field === undefined) {
			dataObj.statusMessage = 'Missing field parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (erp === undefined) {
			dataObj.statusMessage = 'Missing erp parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if (serviceType === 'tv' && (channel === undefined || channel === '')) {
			dataObj.statusMessage = 'Missing channel parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if (curve === undefined) {
			dataObj.statusMessage = 'Missing curve parameter.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !lat.match(/^-?\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid lat value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !lon.match(/^-?\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid lon value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !field.match(/^-?\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid dbu value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
			
		if ( !rcamsl.match(/^\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid rcamsl value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}	
			
		if ( !nradial.match(/^\d+$/)) {
			dataObj.statusMessage = 'Invalid nradial value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !erp.match(/^\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid erp value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (channel && !channel.match(/^\d+$/)) {
			dataObj.statusMessage = 'Invalid channel value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !curve.match(/^\d$/)) {
			dataObj.statusMessage = 'Invalid curve value.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		
		if ( parseFloat(lat) > 90 || parseFloat(lat) < -90 ) {
			dataObj.statusMessage = 'lat value out of range.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( parseFloat(lon) > 180 || parseFloat(lon) < -180 ) {
			dataObj.statusMessage = 'lon value out of range.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( parseFloat(nradial) <8 || parseFloat(nradial) > 360 ) {
			dataObj.statusMessage = 'nradial value out of range [8, 360].';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
				
		if ( parseFloat(curve) < 0 || parseFloat(curve) > 2) {
			dataObj.statusMessage = 'Curve value out of range [0, 2].';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (validate.getNumDecimal(lat) > 10) {
			dataObj.statusMessage = 'Number of decimal places for lat is larger than 10.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (validate.getNumDecimal(lon) > 10) {
			dataObj.statusMessage = 'Number of decimal places for lon is larger than 10.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if(pattern !== undefined){
			if ( parseInt(pattern.split(';').length) <8) {
			dataObj.statusMessage = 'Pattern  provided has too few radials must contain at least 8.';
			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		}
		
		lat = parseFloat(lat);
		lon = parseFloat(lon);
		field = parseFloat(field);
		erp = parseFloat(erp);
		if (channel !== undefined) {
			channel = parseInt(channel,10);
		}
		if (pattern) {
			nradial = parseInt(pattern.split(';').length,10);
		}
		rcamsl = parseFloat(rcamsl);
		nradial = parseInt(nradial,10);
		curve = parseInt(curve,10);
		
		var full_pattern = getFullAntennaPattern(nradial, pattern);
		
		var hostname = req.hostname;
		if (hostname === "localhost" || hostname === "127.0.0.1") {
			hostname = hostname + ":" + NODE_PORT;
		}
		console.log(req.protocol);
		
		var root_url = req.protocol + "://" + hostname;
		
		//get haat
		//var url = root_url + "/" + CONTEXT_PATH + "haat.json?lat=" + lat + "&lon=" + lon + "&rcamsl=" + rcamsl + "&nradial=" + nradial + "&src=" + src + "&unit=" + unit + '&outputcache=false';
		var haat_url = "haat.json?lat=" + lat + "&lon=" + lon + "&rcamsl=" + rcamsl + "&nradial=" + nradial + "&src=" + src + "&unit=" + unit;
		
		console.log('calling HAAT with req='+haat_url);

		var haat_req = new Object;
		haat_req['url'] = haat_url;
		
		haat.getHAAT(haat_req, res, function(haat_data){
            console.log('getHAAT data='+haat_data);

			if(haat_data){
				console.log('data returned from HAAT');
				console.log('statusCode='+haat_data.features[0].properties.statusCode);

				if (haat_data.features[0].properties.statusCode + '' !== "200"){
					console.log('HAAT error: ' + haat_data.features[0].properties.statusMessage);				
					dataObj.statusMessage = haat_data.features[0].properties.statusMessage;
					returnError(dataObj, function(ret){                                                       
		                 returnJson = GeoJSON.parse(ret, {});
		            });
		            return callback(returnJson);
				}

				console.log('after status check');
				
				var dist_arr = [];
				var dist;
				var haat;
				var latlon;
				var latlon_1st;
				var coordinates = [];
				var distance_tmp = 0;
				var fs_or_dist = 2;
				var flag = [];
				var channel_use = channel;
				if (serviceType === 'fm') {
					channel_use = 6;
				}
				for (var i = 0; i < haat_data.features[0].properties.haat_azimuth.length; i++) {
					haat = haat_data.features[0].properties.haat_azimuth[i];
					if (haat > 1600) {
						haat = 1600;
					}
					if (haat < 30) {
						haat = 30;
					}
					
					dist = tvfm_curves.tvfmfs_metric(erp*full_pattern[i], haat, channel_use, field, distance_tmp, fs_or_dist, curve, flag);
					if (isNaN(dist)) {
						console.log('error in distance calculation');
						dataObj.statusMessage = 'Error in distance calculation.';
						returnError(dataObj, function(ret){                                                       
			                 returnJson = GeoJSON.parse(ret, {});
			            });
			            return callback(returnJson);				
					}
					
					if (dist < 0) {
						dist = 1;
					}
					latlon = getLatLonFromDist(lat, lon, haat_data.features[0].properties.azimuth[i], dist);
					if (i === 0) {
						latlon_1st = latlon;
					}
		
					coordinates.push([math.round(latlon[1], 10), math.round(latlon[0],10)]);
				}
				coordinates.push([math.round(latlon_1st[1], 10), math.round(latlon_1st[0], 10)]);
				
				console.log('output coordinates size='+coordinates.length);

				coordinates = [[coordinates]];

				endTime = new Date().getTime();			
				
				if(coordinates.length > 0 ){

					dataObj.status = 'success';
					dataObj.statusCode = '200';		
					dataObj.statusMessage = 'ok';

					dataObj.coordinates = coordinates;
					dataObj.antenna_lat = lat;
					dataObj.antenna_lon = lon;
					dataObj.field = field;
					dataObj.erp = erp;
					dataObj.serviceType = serviceType;
					dataObj.curve = curve;
					dataObj.channel = channel;
					dataObj.rcamsl = rcamsl;
					dataObj.nradial = nradial;
					dataObj.unit = unit;
					dataObj.elevation_data_source = haat_data.features[0].properties.elevation_data_source;
					dataObj.elapsed_time = endTime - startTime;	

					/*dataObj.crs = {"type": "EPSG",
										"properties": {
											"code": "4326"
									}};*/

					var geom = JSON.stringify({"type": "MultiPolygon", "coordinates": coordinates});
					
					area.getArea(geom, function(error, response) {
						if (error) {
						console.log("Area API error: ", error)
							dataObj.area = -999;
							dataObj.area_unit = response.area_unit;
						}
						else {
							dataObj.area = response.area;
							dataObj.area_unit = response.area_unit;
						}
						
						
						if (pop === 'true') {
							population.getPopulation(geom, function(error, response) {
								if (error) {
									dataObj.population = -999;
								}
								else {
									dataObj.population = response.population;
								}
								
								console.log('output dataObj='+dataObj);

								var return_data = [dataObj];
								GeoJSON.defaults = {MultiPolygon: coordinates, include: ['status','statusCode','statusMessage']};
								
								var return_json = GeoJSON.parse(return_data, {MultiPolygon: 'coordinates', include: ['status','statusCode','statusMessage', 
								'antenna_lat','antenna_lon','field','erp','serviceType','curve','channel','rcamsl','nradial','unit','elevation_data_source','area','area_unit','population','elapsed_time']}); 
								
								callback(return_json);
		
							});
						}
						else {
							console.log('output dataObj='+dataObj);
							var return_data = [dataObj];
							GeoJSON.defaults = {MultiPolygon: coordinates, include: ['status','statusCode','statusMessage']};
							
							var return_json = GeoJSON.parse(return_data, {MultiPolygon: 'coordinates', include: ['status','statusCode','statusMessage', 
							'antenna_lat','antenna_lon','field','erp','serviceType','curve','channel','rcamsl','nradial','unit','elevation_data_source','area','area_unit','elapsed_time']}); 
							
							return callback(return_json);
						}
						
						
					});
					
				}
			}
			else {				
				console.log('HAAT response error:');
				dataObj.statusMessage = 'HAAT calculation error.';
				returnError(dataObj, function(ret){                                                       
	                 returnJson = GeoJSON.parse(ret, {});
	            });
	            return callback(returnJson);				
			}	

		});
	}
	catch(err) {
		console.log('catch err='+err);
		dataObj.statusMessage = 'Contours error occurred.';
		returnError(dataObj, function(ret){                                                       
             returnJson = GeoJSON.parse(ret, {});
        });
        return callback(returnJson);
	}

}

function getLatLonFromDist(lat1, lon1, az, d) {
//az: azimuth in degrees
//d: distance in km

    lat1 = lat1 * Math.PI / 180.0;
    lon1 = lon1 * Math.PI / 180.0;
    az = az * Math.PI / 180.0;

    var R = 6371; //earth radius in kms
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(az));
    var lon2 = lon1 + Math.atan2(Math.sin(az) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

    lat2 = lat2 * 180 / Math.PI;
    lon2 = lon2 * 180 / Math.PI;

    return [lat2, lon2]
}

function returnError(data, callback) {             
    console.log('returnError');
    var ret = [{ 
        status: 'error',
        statusCode: '400',
        statusMessage: data.statusMessage
        }];
    return callback(ret);
}

function getFullAntennaPattern(nradial, pattern) {
	var i, j, j1, j2, az, az1, az2, field, field1, field2;
	
	var full_pattern = [];
	if (pattern === undefined) {
		for (i = 0; i < nradial; i++) {
			full_pattern.push(1);
		}
		return full_pattern;
	}
	
	
	var azimuths = [];
	var fields = [];
	var dum = pattern.split(';');
	for (i = 0; i < dum.length; i++) {
		azimuths.push(parseFloat(dum[i].split(',')[0]));
		fields.push(parseFloat(dum[i].split(',')[1]));
	}
	
	for (i = 0; i < nradial; i++) {
		az = i * 360.0/nradial;
		j1 = -1;
		j2 = -1;
		for (j = 0; j < azimuths.length-1; j++) {
			az1 = azimuths[j];
			field1 = fields[j];
			az2 = azimuths[j+1];
			field2 = fields[j+1];
			if (az >= az1 && az <= az2) {
				j1 = j;
				j2 = j + 1;
			}
		}
		if (j1 === -1) {
			j1 = azimuths.length-1;
			j2 = 0;
		}
		
		az1 = azimuths[j1];
		field1 = fields[j1];
		az2 = azimuths[j2];
		field2 = fields[j2];
		
		if (az2 < az1) {
			az2 += 360;
			if (az < az1) {az += 360;}
		}
		
		field = field1 + (field2 - field1) * (az - az1)/(az2 - az1)
		
		full_pattern.push(field);
		
	
	}
	
	return full_pattern;
	
}

//module.exports.elevation = elevation;
module.exports.getContours = getContours;


