
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;
//var AWS_ACCESS_KEY =  configEnv[NODE_ENV].AWS_ACCESS_KEY;
//var AWS_SECRET_KEY = configEnv[NODE_ENV].AWS_SECRET_KEY;
//var AWS_REGION = configEnv[NODE_ENV].AWS_REGION;

//var CDBS_HOST = configEnv[NODE_ENV].CDBS_HOST;
//var CDBS_PORT = configEnv[NODE_ENV].CDBS_PORT;
//var CDBS_DBNAME = configEnv[NODE_ENV].CDBS_DBNAME;
//var CDBS_USER = configEnv[NODE_ENV].CDBS_USER;
//var CDBS_PASSWD = configEnv[NODE_ENV].CDBS_PASSWD;
var EFS_ELEVATION_DATASET = configEnv[NODE_ENV].EFS_ELEVATION_DATASET;

var fs = require('fs');
var request = require('request');
var math = require('mathjs');

var distance = require('./distance.js');
var tvfm_curves = require('./tvfm_curves.js');

var data_dir = EFS_ELEVATION_DATASET;

var startTime;




function getContours(req, res) {
	try {
		console.log('\n================== start contours process ==============');
		console.log(new Date());
		
		startTime = new Date().getTime();	
		var src = req.query.src;
		var lat = req.query.lat;
		var lon = req.query.lon;
		var rcamsl = req.query.rcamsl;
		var nradial = req.query.nradial;
		var unit = req.query.unit;
		var erp = req.query.erp;
		var curve_type = req.query.curve_type;
		
		var field = req.query.field;
		var channel = req.query.channel;
		var curve = req.query.curve;
		var serviceType = req.query.serviceType;
		
		if (serviceType == undefined) {
			console.log('missing serviceType');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing serviceType'
			});
			return;
		}
		
		serviceType = serviceType.toLowerCase();
		
		var tv_fm_list = ['tv', 'fm'];
		if (tv_fm_list.indexOf(serviceType) < 0) {
			console.log('invalid serviceType value');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid serviceType value'
			});
			return;
		}
		
		if (src == undefined) {
			src = 'ned_1';
		}
		if (unit == undefined) {
			unit = 'm';
		}
		
		if (lat == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing lat'
			});
			return;
		}
		
		if (lon == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing lon'
			});
			return;
		}
		
		if (nradial == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing nradial'
			});
			return;
		}
		
		if (rcamsl == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing rcamsl'
			});
			return;
		}
		
		if (field == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing field'
			});
			return;
		}
		
		if (erp == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing erp'
			});
			return;
		}
		
		if (serviceType == 'tv' && (channel == undefined || channel == '')) {
			console.log('missing channel');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing channel'
			});
			return;
		}
		
		if (curve == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing curve'
			});
			return;
		}
		
		if ( !lat.match(/^-?\d+\.?\d*$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid lat value'
			});
			return;
		}
		
		if ( !lon.match(/^-?\d+\.?\d*$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid lon value'
			});
			return;
		}
		
		if ( !field.match(/^-?\d+\.?\d*$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid dbu value'
			});
			return;
		}
			
		if ( !rcamsl.match(/^\d+\.?\d*$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid rcamsl value'
			});
			return;
		}	
			
		if ( !nradial.match(/^\d+$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid nradial value'
			});
			return;
		}
		
		if ( !erp.match(/^\d+\.?\d*$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid erp value'
			});
			return;
		}
		
		if (channel && !channel.match(/^\d+$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid channel value'
			});
			return;
		}
		
		if ( !curve.match(/^\d$/)) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid curve value'
			});
			return;
		}
		
		
		if ( parseFloat(lat) > 90 || parseFloat(lat) < -90 ) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'lat value out of range'
			});
			return;		
		}
		
		if ( parseFloat(lon) > 180 || parseFloat(lon) < -180 ) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'lon value out of range'
			});
			return;
		}
		
		if ( parseFloat(nradial) <3 || parseFloat(nradial) > 360 ) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'nradial value out of range [3, 360]'
			});
			return;		
		}
				
		if ( parseFloat(curve) < 0 || parseFloat(curve) > 2) {
			console.log('curve value out of range [0, 2]');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'curve value out of range [0, 2]'
			});
			return;
		}
		
		if (getNumDecimal(lat) > 10) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'number of decimal places for lat is larger than 10'
			});
			return;
		}
		
		if (getNumDecimal(lon) > 10) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'number of decimal places for lon is larger than 10'
			});
			return;
		}
		
		lat = parseFloat(lat);
		lon = parseFloat(lon);
		field = parseFloat(field);
		erp = parseFloat(erp);
		if (channel != undefined) {
			channel = parseInt(channel);
		}
		rcamsl = parseFloat(rcamsl);
		nradial = parseInt(nradial);
		curve = parseInt(curve);
		
		var hostname = req.hostname;
		if (hostname == "localhost" || hostname == "127.0.0.1") {
			hostname = hostname + ":" + NODE_PORT;
		}
		console.log(req.protocol);
		
		var root_url = req.protocol + "://" + hostname;
		
		//get haat
		var url = root_url + "/haat.json?lat=" + lat + "&lon=" + lon + "&rcamsl=" + rcamsl + "&nradial=" + nradial + "&src=" + src + "&unit=" + unit;
		
		console.log(url);
		
		request(url, function (error, response, body) {
			if(error){
				console.log('Error:', error);
				res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': error
				});
				return;

			}

			body = JSON.parse(body);
			
			if (body.features[0].properties.statusCode + '' != "200"){
				console.log('HAAT error: ' + body.features[0].properties.statusMessage);
				res.status(400).send({
				'status': 'error',
				'statusCode':'400',
				'statusMessage': 'HAAT error: ' + body.features[0].properties.statusMessage
				});
				return;
			}
			
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
			if (serviceType == 'fm') {
				channel_use = 6;
			}
			for (var i = 0; i < body.features[0].properties.haat_azimuth.length; i++) {
				haat = body.features[0].properties.haat_azimuth[i];
				if (haat > 1600) {
					haat = 1600;
				}
				if (haat < 30) {
					haat = 30;
				}
				//dist = distance.calTvFmDist(body.features[0].properties.haat_azimuth[i], dbu_curve, curve_type);
				dist = tvfm_curves.tvfmfs_metric(erp, haat, channel_use, field, distance_tmp, fs_or_dist, curve, flag);
				if (!isNaN(dist)) {
					console.log('error in distance calculation');
					res.status(400).send({
					'status': 'error',
					'statusCode':'400',
					'statusMessage': 'error in distance calculation'
					});
					return;
				
				}
				
				if (dist < 0) {
					dist = 1;
				}
				latlon = getLatLonFromDist(lat, lon, body.features[0].properties.azimuth[i], dist);
				if (i == 0) {
					latlon_1st = latlon;
				}
	
				coordinates.push([math.round(latlon[1], 10), math.round(latlon[0],10)]);
			}
			coordinates.push([math.round(latlon_1st[1], 10), math.round(latlon_1st[0], 10)]);
			
			coordinates = [[coordinates]];
			
			//console.log(coordinates.toString())

			var output = {"type": "FeatureCollection",
							"features": [
								{
									"type": "Feature",
									"geometry": {
									"type": "MultiPolygon",
									"coordinates": coordinates
									},
									"properties": {
										"antenna_lat": lat,
										"antenna_lon": lon,
										"field": field,
										"erp": erp,
										"serviceType": serviceType,
										"curve": curve,
										"channel": channel,
										"rcamsl": rcamsl,
										"nradial": nradial,
										"unit": unit,
										"elevation_data_source": body.features[0].properties.elevation_data_source,
										"create_time": new Date()
									}
								}
							
							],
							"crs": {
								"type": "EPSG",
								"properties": {
								"code": "4326"
								}
							},
						};
			
			
			res.send(output);

		});
	}
	catch(err) {
		console.log(err);
		res.status(400).send({
			'status': 'error',
        	'statusCode':'400',
        	'statusMessage': 'Error occurred',
			'error': err.stack
        });
	
	}

}

function getNumDecimal(a) {
	var dum = (parseFloat(a) + '').split('.');
	if (dum.length == 2) {
		return dum[1].length;
	}

	return 0
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



//module.exports.elevation = elevation;
module.exports.getContours = getContours;


