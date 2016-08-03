
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

var data_dir = '/var/data';

function elevation(req, res) {

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

	var nrow = 10812;
	var ncol = 10812;
	
	var lat_ul = Math.ceil(lat);
	var lon_ul = Math.abs(Math.floor(lon));
	
	var lat_str = padZero(lat_ul, 2);
	var lon_str = padZero(lon_ul, 3);
	var filename = 'usgs_ned_13_n' + lat_str + 'w' + lon_str + '_gridfloat.flt';
	var filepath = data_dir + '/ned13/' + filename;
	
	if (!fs.existsSync(filepath)) {
		res.send({'status': 'error', 'msg': 'data unavailable'});
		return;
	}
	
	fs.open(filepath, 'r', function(err, fd) {
		if(err) {
			return console.error(err);
		}
				
		var row = (lat_ul - lat) * 10800 + 6 + 1;
		var col = (lon_ul - Math.abs(lon)) *10800 + 6;
		
		row = Math.floor(row);
		col = Math.floor(col);

		var length = 4;
		var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
		
		console.log('row=' + row + ' col=' + col + ' pos=' + position);

		var buffer = new Buffer(length);

		fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
			if(err) {
				return console.error(err);
			}
			
			var elevation = Math.round(100*buffer.readFloatLE(0))/100;
			var ret = {"status" : "ok", "msg": "success", "lat": lat, "lon": lon, "Data_Source": "3DEP 1/3 arc-second", "elevation": elevation,"units": "meters"};
	
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

module.exports.elevation = elevation;