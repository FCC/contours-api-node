
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

var distance = require('./distance.js');

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
		var station_type = req.query.station_type;
		
		var channel = req.query.channel;
		var rcamsl = req.query.rcamsl;
		var nradial = req.query.nradial;
		var erp = req.query.erp;
		var lat = req.query.lat;
		var lon = req.query.lon;
		var src = req.query.src;
		var unit = req.query.unit;
		var station_type = req.query.station_type;
		var channel = req.query.channel;
		var dbu = req.query.dbu;
		
		
		var delta_dbu = 10*Math.log(erp)/Math.log(10);
		
		var dbu_curve = dbu - delta_dbu;
		
		var curveType = 'F55LV';
		
		
		if (station_type.toLowerCase() == 'fm') {
			curveType = 'F55LV';
		}
		else if (station_type.toLowerCase() == 'tv') {
			if (channel >= 2 && channel <= 6) {
				curveType = 'F55LV';
			}
			else if (channel >= 7 && channel <= 13) {
				curveType = 'F55HV';
			}
			else if (channel >= 14 && channel <=69) {
				curveType = 'F55U';
			}
		
		}
		
		
		
		var hostname = req.hostname;
		if (hostname == "localhost") {
			hostname = hostname + ":" + NODE_PORT;
		}
		console.log(req.protocol);
		
		var root_url = req.protocol + "://" + hostname;
		
		//get haat
		var url = root_url + "/haat.json?lat=" + lat + "&lon=" + lon + "&rcamsl=" + rcamsl + "&nradial=" + nradial + "&src=" + src + "&unit=" + unit;
		
		console.log(url);
		
		request(url, function (error, response, body) {
			if(error){
				return console.log('Error:', error);
			}
			if (response.statusCode !== 200){
				return console.log('Invalid Status Code Returned:', response.statusCode);
			}
			
			var haat = JSON.parse(body);
			
			//console.log(haat);
			
			var dist_arr = [];
			var dist;
			var latlon;
			var latlon_1st;
			var coordinates = [];
			for (var i = 0; i < haat.haat_azimuth.length; i++) {
				dist = distance.calTvFmDist(haat.haat_azimuth[i], dbu, curveType);
				console.log(dist);
				latlon = getLatLonFromDist(lat, lon, haat.azimuth[i], dist);
				if (i == 0) {
					latlon_1st = latlon;
				}
				coordinates.push([latlon[1], latlon[0]]);
			}
			coordinates.push([latlon_1st[1], latlon_1st[0]]);
			
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
										"station_type": station_type,
										"rcamsl": rcamsl,
										"nradial": nradial
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


