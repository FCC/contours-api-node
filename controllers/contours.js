
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;

var fs = require('fs');

if (NODE_ENV == 'LOCAL') {
	var data_dir = 'data';
}
else {
	var data_dir = '/var/data';
}

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

module.exports.elevation = elevation;
module.exports.getVersions = getVersions;