
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;
var AWS = require('aws-sdk');
var AWS_ACCESS_KEY =  configEnv[NODE_ENV].AWS_ACCESS_KEY;
var AWS_SECRET_KEY = configEnv[NODE_ENV].AWS_SECRET_KEY;

 AWS.config.update({
     accessKeyId: AWS_ACCESS_KEY,
     secretAccessKey: AWS_SECRET_KEY
    });
    AWS.config.update({endpoint: 's3-us-west-2.amazonaws.com'});
var S3_BUCKET = configEnv[NODE_ENV].S3_BUCKET;
var S3_NED_LOCATION;
var S3_NED1_LOCATION = configEnv[NODE_ENV].S3_NED1_LOCATION;
var S3_NED13_LOCATION = configEnv[NODE_ENV].S3_NED13_LOCATION;

var fs = require('fs');

var data_dir;
var filepath;
var data_src = 'ned_1';
var param_unit = 'meters';

if (NODE_ENV == 'LOCAL') {
	data_dir = 'data/';	
}
else {
	data_dir = '/var/data/';
}


function getElevation(req, res) {
	console.log('--- beginning elevation ---');

	try {
		
		var latitude = req.query.lat;
		var longitude = req.query.long;
		var datatype = req.query.src;
		var unit = req.query.unit;

		console.log('params: lat='+latitude+',long='+longitude+', src='+datatype);

		if(!datatype){
			datatype = data_src;
		}
		if(!unit){
			unit = param_unit;
		}

		if ( !latitude.match(/^-?\d+\.?\d*$/) || !longitude.match(/^-?\d+\.?\d*$/) ) {
			res.send({'status': 'error', 'msg': 'invalid Lat/Lon value'});
			return;
		}

		var lat = parseFloat(latitude);
		var lon = parseFloat(longitude);
		
		if (lat <= -90 || lat > 90 || lon < -180 || lon > 180) {
			res.send({
				'status': 'error',
            	'statusCode':'400',
            	'statusMessage': 'Invalid Input - Latitude/Longitude',
            	'latitude':lat,
                'longitude':lon
			});
			return;
		}
		
		if (datatype != 'ned_1' && datatype != 'ned_13') {
			res.send({
				'status': 'error',
            	'statusCode':'400',
            	'statusMessage': 'Invalid Input - Source',
            	'latitude':lat,
                'longitude':lon});
			return;
		}

		if (unit != 'meters' && unit != 'miles' && unit != 'feet') {
			res.send({
				'status': 'error',
            	'statusCode':'400',
            	'statusMessage': 'Invalid Input - Unit',
            	'latitude':lat,
                'longitude':lon});
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
		
		
		var usgs_filename = 'float' + ns + lat_str + ew + lon_str + '_1.flt';
		// sample file floatn15w093_1.flt		

		console.log('usgs_filename:'+usgs_filename);
		
		if (datatype == 'ned_13') {
			var data_source = '3DEP 1/3 arc-second';
		
			var nrow = 10812;
			var ncol = 10812;
			
			var nrow0 = 10800;
			var ncol0 = 10800;
			
			var row = (lat_ul - lat) * nrow0 + 6 + 1;
			var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;

			var filepath = data_dir + 'ned_13/' + usgs_filename;
			S3_NED_LOCATION = S3_NED13_LOCATION;

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
			
			var row = (lat_ul - lat) * nrow0 + 6 + 1;
			var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;

			var filepath = data_dir + 'ned_1/' + usgs_filename;
			S3_NED_LOCATION = S3_NED1_LOCATION;
			
			row = Math.floor(row);
			col = Math.floor(col);

			var length = 4;
			var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
			
			console.log('row=' + row + ' col=' + col + ' pos=' + position);
		}

		console.log('S3_BUCKET='+S3_BUCKET);
		console.log('S3_NED_LOCATION='+S3_NED_LOCATION);
		console.log('filepath='+ filepath);

		var st_time = new Date().getTime();	
		console.log('st_time='+st_time);

		if (fs.existsSync(filepath)) { // file is already exist
			// readfile to calculate elevation data
			console.log('file exist in file system');
			fs.open(filepath, 'r', function(err, fd) {
				if(err) {
					return console.error(err);
				}	

				var buffer = new Buffer(length);

				fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
					if(err) {
						res.send({
							'status': 'error',
	                    	'statusCode':'400',
	                    	'statusMessage': 'unable to process elevation data',
	                    	'latitude':lat,
                			'longitude':lon
	                    });
						return;
					}
					
					var ed_time = new Date().getTime();
				    console.log('ed_time='+ed_time);
					console.log('file transfer complete in :' + (ed_time - st_time)/1000);

					var elevation = Math.round(100*buffer.readFloatLE(0))/100;
					if( unit == 'miles'){
						elevation = Math.round(1000*elevation*0.000621371)/1000;
					}
					else if(unit == 'feet'){
						elevation = Math.round(1000*elevation*3.28084)/1000;
					}
					var ret = {
						'status': 'success',
                		'statusCode':'200',
                		'statusMessage': 'ok',
                		'latitude':lat,
                		'longitude':lon, 
                		'data source': data_source, 
                		'elevation': elevation,
                		'unit': unit};				
					res.send(ret);
				});
			});
		}
		else { // if file already not downloaded from s3

			var s3 = new AWS.S3();
			var params = {
		            Bucket: S3_BUCKET, // bucket name
		            Key: S3_NED_LOCATION + usgs_filename
		        };
		        s3.getObject(params, function(err, data) {
		            if (err) {
		             var json = { 
		                    'status': 'error',
		                    'statusCode':'400',
		                    'statusMessage': 'elevation data not found',
		                    'latitude':lat,
		                    'longitude':lon
		                };
						//return common.sendRes(res, json, 'json');
						res.send(json);
		            } 
		            else {
						console.log('downloading file...');
				        var fd = fs.openSync(filepath, 'a+');
				        fs.writeSync(fd, data.Body, 0, data.Body.length, 0);
				        fs.closeSync(fd);

				        if (!fs.existsSync(filepath)) {
							res.send({
								'status': 'error',
		                    	'statusCode':'400',
		                    	'statusMessage': 'unable to process elevation data',
		                    	'latitude':lat,
		                    	'longitude':lon
		                    });
							return;
						}

						fs.open(filepath, 'r', function(err, fd) {
							if(err) {
								return console.error(err);
							}	

							var buffer = new Buffer(length);

							fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
								if(err) {
									res.send({
										'status': 'error',
				                    	'statusCode':'400',
				                    	'statusMessage': 'unable to process elevation data',
				                    	'latitude':lat,
		                    			'longitude':lon
				                    });
									return;
								}
								
								var ed_time = new Date().getTime();
							    console.log('ed_time='+ed_time);
		    					console.log('file transfer complete in :' + (ed_time - st_time)/1000);

								var elevation = Math.round(100*buffer.readFloatLE(0))/100;
								if( unit == 'miles'){
									elevation = Math.round(1000*elevation*0.000621371)/1000;
								}
								else if(unit == 'feet'){
									elevation = Math.round(1000*elevation*3.28084)/1000;
								}
								var ret = {
									'status': 'success',
		                    		'statusCode':'200',
		                    		'statusMessage': 'ok',
		                    		'latitude':lat,
		                    		'longitude':lon, 
		                    		'data source': data_source, 
		                    		'elevation': elevation,
		                    		'unit': unit};				
								res.send(ret);
							});
						});
		            }
		        });

		}

		
		
		/*
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
		 	*/
	}
	catch(err) {
		res.send({
			'status': 'error',
        	'statusCode':'400',
        	'statusMessage': 'unable to process elevation data'
        });
		return;
	}
}

function padZero(a, n) {
	//n - total number of digits
	var a_str = a + '';
	while (a_str.length < n) {
		a_str = '0' + a_str;
	}
	
	return a_str;
}

module.exports.getElevation = getElevation;