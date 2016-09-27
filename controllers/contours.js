
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
var S3_BUCKET = configEnv[NODE_ENV].S3_BUCKET;
var S3_NED_LOCATION;
var S3_ELEV_LOCATION = configEnv[NODE_ENV].S3_ELEV_LOCATION;
var CDBS_HOST = configEnv[NODE_ENV].CDBS_HOST;
var CDBS_PORT = configEnv[NODE_ENV].CDBS_PORT;
var CDBS_DBNAME = configEnv[NODE_ENV].CDBS_DBNAME;
var CDBS_USER = configEnv[NODE_ENV].CDBS_USER;
var CDBS_PASSWD = configEnv[NODE_ENV].CDBS_PASSWD;

var fs = require('fs');
var async = require('async');
//var Sybase = require('sybase');
var request = require('request');
var math = require('mathjs');

var distance = require('./distance.js');
var tvfm_curves = require('./tvfm_curves.js');

if (NODE_ENV == 'LOCAL') {
	var data_dir = 'data';
}
else {
	var data_dir = '/var/data';
}

var startTime;



function elevation(req, res) {

	var datatype = req.params.datatype;
	var lat = req.params.lat;
	var lon = req.params.lon;

	if ( !lat.match(/^-?\d+\.?\d*$/) || !lon.match(/^-?\d+\.?\d*$/) ) {
		res.send({'status': 'error', 'msg': 'invalid Lat/Lon value'});
		return;
	}

	var lat = parseFloat(req.params.lat);
	var lon = parseFloat(req.params.lon);
	
	if (lat <= -90 || lat > 90 || lon < -180 || lon > 180) {
		res.send({'status': 'error', 'msg': 'Lat/Lon value out of range'});
		return;
	}
	
	if (datatype != 'ned_1' && datatype != 'ned_13') {
		res.send({'status': 'error', 'msg': 'Wrong data type'});
		return;
	}

	var ns = 'n';
	if (lat < 0) {
		ns = 's';
	}
	var ew = 'w';
	if (lon >= 0) {
		ew = 'e';
	}
	
	var lat_ul = Math.abs(Math.ceil(lat));
	var lon_ul = Math.abs(Math.floor(lon));
	
	var lat_str = padZero(lat_ul, 2);
	var lon_str = padZero(lon_ul, 3);
	
	var filename = 'usgs_' + datatype + '_' + ns + lat_str + ew + lon_str + '_gridfloat.flt';
	
	console.log(filename);
	
	if (datatype == 'ned_13') {
		var data_source = '3DEP 1/3 arc-second';
	
		var nrow = 10812;
		var ncol = 10812;
		
		var nrow0 = 10800;
		var ncol0 = 10800;
		
		var filepath = data_dir + '/ned_13/' + filename;
		
		var row = (lat_ul - lat) * nrow0 + 6 + 1;
		var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;
		
		row = Math.floor(row);
		col = Math.floor(col);

		var length = 4;
		var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
		
		console.log('row=' + row + ' col=' + col + ' pos=' + position);
	}
	
	if (datatype == 'ned_1') {
		var data_source = '3DEP 1 arc-second';
	
		var nrow = 3612;
		var ncol = 3612;
		
		var nrow0 = 3600;
		var ncol0 = 3600;
		
		var filepath = data_dir + '/ned_1/' + filename;
		
		var row = (lat_ul - lat) * nrow0 + 6 + 1;
		var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;
		
		row = Math.floor(row);
		col = Math.floor(col);

		var length = 4;
		var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
		
		console.log('row=' + row + ' col=' + col + ' pos=' + position);
	}
	
	
	if (!fs.existsSync(filepath)) {
		res.send({'status': 'error', 'msg': 'data unavailable'});
		return;
	}
	
	fs.open(filepath, 'r', function(err, fd) {
		if(err) {
			return console.error(err);
		}
				

		var buffer = new Buffer(length);

		fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
			if(err) {
				return console.error(err);
			}
			
			var elevation = Math.round(100*buffer.readFloatLE(0))/100;
			var ret = {"status" : "ok", "msg": "success", "lat": lat, "lon": lon, "Data_Source": data_source, "elevation": elevation,"units": "meters"};
	
			res.send(ret);

		});
	});
	 	

}

function padZero(a, n) {
	//n - total number of digits
	var a_str = a + '';
	while (a_str.length < n) {
		a_str = '0' + a_str;
	}
	
	return a_str;
}

function getVersions(req, res) {
	res.send(process.versions);

}

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
		//var dbu = req.query.dbu;
		var erp = req.query.erp;
		var curve_type = req.query.curve_type;
		
		var field = req.query.field;
		var channel = req.query.channel;
		var curve = req.query.curve;
		var tv_or_fm = req.query.tv_or_fm;
		
		
		if (tv_or_fm == undefined) {
			console.log('missing tv_or_fm');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing tv_or_fm'
			});
			return;
		}
		
		var tv_fm_list = ['tv', 'fm'];
		if (tv_fm_list.indexOf(tv_or_fm) < 0) {
			console.log('invalid tv_or_fm value');
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'invalid tv_or_fm value'
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
		
		if (tv_or_fm.toLowerCase() == 'fm' && channel == undefined) {
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
		
		if (tv_or_fm == undefined) {
			res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'missing tv_or_fm'
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
		
		
		//var delta_dbu = 10*Math.log(parseFloat(erp))/Math.log(10);
		
		//var dbu_curve = dbu - delta_dbu;
		
		//console.log('erp=' + erp + 'DBU=' + dbu  + ' ' + delta_dbu + ' ' +dbu_curve);

		
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
			if (tv_or_fm == 'tv') {
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
				if (!isNaN(distance)) {
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
									"geometry": {
									"type": "MultiPolygon",
									"coordinates": coordinates
									},
									"properties": {
										"antenna_lat": lat,
										"antenna_lon": lon,
										"field": field,
										"erp": erp,
										"tv_or_fm": tv_or_fm,
										"curve": curve,
										"channel": channel,
										"rcamsl": rcamsl,
										"nradial": nradial,
										"elevation_data_source": body.features[0].properties.elevation_data_source,
										"create_time": new Date()
									}
								}
							
							]
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



module.exports.elevation = elevation;
module.exports.getContours = getContours;


