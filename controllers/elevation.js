
// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var http = require('http');

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
var S3_ELEV_LOCATION = configEnv[NODE_ENV].S3_ELEV_LOCATION;

var fs = require('fs');

var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');

var data_dir;
var filepath;
var data_src = 'ned';
var param_unit = 'm';
var file_ext = '_1';
var GeoJSON = require('geojson');

if (NODE_ENV == 'LOCAL') {
	data_dir = 'data/';	
}
else {
	data_dir = '/var/data/';
}


function getElevation(req, res) {
	console.log('--- beginning elevation ---');

	var lat;
	var lon;

	var o_status = 'error',
		o_statusCode = '400',
		o_statusMessage = '',
		o_dataSource = '',
		o_elevation = 0,
		o_unit = '';

	try {
		
		var latitude = req.query.lat;
		var longitude = req.query.lon;
		var datatype = req.query.src;
		var unit = req.query.unit;

		lat = latitude;
		lon = longitude;

		GeoJSON.defaults = {Point: ['latitude', 'longitude'], include: ['status','statusCode','statusMessage','dataSource','elevation','unit']};

		console.log('params: lat='+latitude+',lon='+longitude+', src='+datatype+', unit='+unit);

		if(!datatype){
			datatype = data_src;
		}
		if(!unit){
			unit = param_unit;
		}

		o_dataSource = datatype;
		o_unit = unit;

		if(!datatype || !unit || !latitude || !longitude){
				
        	o_statusMessage = 'invalid parameters';
        	
        	var ret = [{ 
				status: o_status,
        		statusCode:o_statusCode,
        		statusMessage: o_statusMessage,
        		latitude: lat,
        		longitude: lon, 
        		dataSource: o_dataSource, 
        		elevation: o_elevation,
        		unit: o_unit}];
        	res.status(400).send(GeoJSON.parse(ret, {}));
			return;
		}

		if ( !latitude.match(/^-?\d+\.?\d*$/) || !longitude.match(/^-?\d+\.?\d*$/) ) {

			o_statusMessage = 'invalid input - latitude/longitude';
        	
        	var ret = [{ 
				status: o_status,
        		statusCode:o_statusCode,
        		statusMessage: o_statusMessage,
        		latitude: lat,
        		longitude: lon, 
        		dataSource: o_dataSource, 
        		elevation: o_elevation,
        		unit: o_unit}];
        	res.status(400).send(GeoJSON.parse(ret, {}));
        	return;
		}

		lat = parseFloat(latitude);
		lon = parseFloat(longitude);
		
		if (lat <= -90 || lat > 90 || lon < -180 || lon > 180) {
			
			o_statusMessage = 'invalid input - latitude/longitude';
        	
        	var ret = [{ 
				status: o_status,
        		statusCode:o_statusCode,
        		statusMessage: o_statusMessage,
        		latitude: lat,
        		longitude: lon, 
        		dataSource: o_dataSource, 
        		elevation: o_elevation,
        		unit: o_unit}];
        	res.status(400).send(GeoJSON.parse(ret, {}));
        	return;
		}

		if (datatype != 'ned' && datatype != 'ned_1' && datatype != 'ned_2' && datatype != 'ned_13' && datatype != 'usgs') {
			
			o_statusMessage = 'invalid input - source';
        	
        	var ret = [{ 
				status: o_status,
        		statusCode:o_statusCode,
        		statusMessage: o_statusMessage,
        		latitude: lat,
        		longitude: lon, 
        		dataSource: o_dataSource, 
        		elevation: o_elevation,
        		unit: o_unit}];
        	res.status(400).send(GeoJSON.parse(ret, {}));
        	return;
		}

		if (unit != 'm' && unit != 'mi' && unit != 'ft') {
			
			o_statusMessage = 'invalid input - unit';
        	
        	var ret = [{ 
				status: o_status,
        		statusCode:o_statusCode,
        		statusMessage: o_statusMessage,
        		latitude: lat,
        		longitude: lon, 
        		dataSource: o_dataSource, 
        		elevation: o_elevation,
        		unit: o_unit}];
        	res.status(400).send(GeoJSON.parse(ret, {}));
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

		var usgs_filename;
		var coordname = ns + lat_str + ew + lon_str;
		
		console.log('coordname='+coordname);

		if(datatype == 'ned') {
			if(ned_1_files[coordname]){
				datatype = 'ned_1';
				usgs_filename = ned_1_files[coordname].file;
				console.log('ned_1 coordname file='+usgs_filename);	
			}
			else if(ned_2_files[coordname]){
				datatype = 'ned_2';
				usgs_filename = ned_2_files[coordname].file;
				console.log('ned_2 coordname file='+usgs_filename);	
			}
			else {
				throw 'ned file not found';
			}	
		}

		if (datatype == 'usgs') {
			console.log('calling USGS API to get data..');
			// /epqs/pqs.php?x=-77&y=38&units=Meters&output=json
			performRequest('nationalmap.gov', '/epqs/pqs.php?x='+lon+'&y='+lat+'&units=Meters&output=json', function(data) {
			    //console.log('callback data ' + JSON.stringify(data));
			    console.log('callback elevation: '+data.Elevation);
			    var elevation = data.Elevation;
			    if( unit == 'mi'){
					elevation = Math.round(1000*elevation*0.000621371)/1000;
				}
				else if(unit == 'ft'){
					elevation = Math.round(1000*elevation*3.28084)/1000;
				}
				
            	o_status = 'success';
            	o_statusCode = '200';
            	o_statusMessage = 'ok',
            	o_dataSource = data.Data_Source;
            	o_elevation = elevation;
            	o_unit = unit;

            	var ret = [{ 
					status: o_status,
            		statusCode:o_statusCode,
            		statusMessage: o_statusMessage,
            		latitude: lat,
            		longitude: lon, 
            		dataSource: o_dataSource, 
            		elevation: o_elevation,
            		unit: o_unit}];

				//GeoJSON.defaults = {Point: ['latitude', 'longitude'], include: ['status','statusCode','statusMessage','dataSource','elevation','unit']};
				res.status(200).send(GeoJSON.parse(ret, {}));
				return;
			});
		}	

		else if (datatype == 'ned_1') {
			var data_source = '3DEP 1 arc-second';
		
			var nrow = 3612;
			var ncol = 3612;
			
			var nrow0 = 3600;
			var ncol0 = 3600;
			file_ext = '_1';
		}

		else if (datatype == 'ned_2') {
			var data_source = '3DEP 2 arc-second';
		
			var nrow = 1812;
			var ncol = 1812;
			
			var nrow0 = 1800;
			var ncol0 = 1800;
			file_ext = '_2';
		}
		
		else if (datatype == 'ned_13') {
			var data_source = '3DEP 1/3 arc-second';
		
			var nrow = 10812;
			var ncol = 10812;
			
			var nrow0 = 10800;
			var ncol0 = 10800;
			file_ext = '_13';
		}
		
		
		if (datatype != 'usgs') {

			if(datatype != 'ned'){
				usgs_filename = 'float' + coordname + file_ext +'.flt';
			}
			//var usgs_filename = 'float' + ns + lat_str + ew + lon_str + file_ext +'.flt';
			// sample file floatn15w093_1.flt		

			console.log('usgs_filename:'+usgs_filename);

			var row = (lat_ul - lat) * nrow0 + 6 + 1;
			var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;

			var filepath = data_dir + datatype + '/' + usgs_filename;
			S3_NED_LOCATION =  S3_ELEV_LOCATION + datatype + '/';
			
			row = Math.floor(row);
			col = Math.floor(col);

			var length = 4;
			var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
			
			console.log('row=' + row + ' col=' + col + ' pos=' + position);

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
						throw console.error(err);
					}	

					var buffer = new Buffer(length);

					fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
						if(err) {

			            	o_statusMessage = 'unable to process elevation data';
			            	
			            	var ret = [{ 
								status: o_status,
			            		statusCode:o_statusCode,
			            		statusMessage: o_statusMessage,
			            		latitude: lat,
			            		longitude: lon, 
			            		dataSource: o_dataSource, 
			            		elevation: o_elevation,
			            		unit: o_unit}];

							res.status(400).send(GeoJSON.parse(ret, {}));
							return;
						}
						
						var ed_time = new Date().getTime();
					    console.log('ed_time='+ed_time);
						console.log('file transfer complete in :' + (ed_time - st_time)/1000);

						var elevation = Math.round(100*buffer.readFloatLE(0))/100;
						if( unit == 'mi'){
							elevation = Math.round(1000*elevation*0.000621371)/1000;
						}
						else if(unit == 'ft'){
							elevation = Math.round(1000*elevation*3.28084)/1000;
						}

						o_status = 'success';
		            	o_statusCode = '200';
		            	o_statusMessage = 'ok';
		            	o_dataSource = data_source;
		            	o_elevation = elevation;
		            	o_unit = unit;

		            	var ret = [{ 
							status: o_status,
		            		statusCode:o_statusCode,
		            		statusMessage: o_statusMessage,
		            		latitude: lat,
		            		longitude: lon, 
		            		dataSource: o_dataSource, 
		            		elevation: o_elevation,
		            		unit: o_unit}];

						res.status(200).send(GeoJSON.parse(ret, {}));
						return;						
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

			            	o_statusMessage = 'elevation data not found';
			            	
			            	var ret = [{ 
								status: o_status,
			            		statusCode:o_statusCode,
			            		statusMessage: o_statusMessage,
			            		latitude: lat,
			            		longitude: lon, 
			            		dataSource: o_dataSource, 
			            		elevation: o_elevation,
			            		unit: o_unit}];

							res.status(400).send(GeoJSON.parse(ret, {}));
							return;
			            } 
			            else {
							console.log('downloading file from s3..., time='+new Date().getTime());
					        var fd = fs.openSync(filepath, 'a+');
					        fs.writeSync(fd, data.Body, 0, data.Body.length, 0);
					        fs.closeSync(fd);

					        if (!fs.existsSync(filepath)) {

					        	o_statusMessage = 'unable to process elevation data';
			            	
				            	var ret = [{ 
									status: o_status,
				            		statusCode:o_statusCode,
				            		statusMessage: o_statusMessage,
				            		latitude: lat,
				            		longitude: lon, 
				            		dataSource: o_dataSource, 
				            		elevation: o_elevation,
				            		unit: o_unit}];

								res.status(400).send(GeoJSON.parse(ret, {}));
								return;
							}

							fs.open(filepath, 'r', function(err, fd) {
								if(err) {
									throw err;
								}	

								var buffer = new Buffer(length);

								fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
									if(err) {
										o_statusMessage = 'unable to process elevation data';
			            	
						            	var ret = [{ 
											status: o_status,
						            		statusCode:o_statusCode,
						            		statusMessage: o_statusMessage,
						            		latitude: lat,
						            		longitude: lon, 
						            		dataSource: o_dataSource, 
						            		elevation: o_elevation,
						            		unit: o_unit}];

										res.status(400).send(GeoJSON.parse(ret, {}));
										return;
									}
									
									var ed_time = new Date().getTime();
								    console.log('ed_time='+ed_time);
			    					console.log('file transfer complete in :' + (ed_time - st_time)/1000);

									var elevation = Math.round(100*buffer.readFloatLE(0))/100;
									if( unit == 'mi'){
										elevation = Math.round(1000*elevation*0.000621371)/1000;
									}
									else if(unit == 'ft'){
										elevation = Math.round(1000*elevation*3.28084)/1000;
									}

									o_status = 'success';
					            	o_statusCode = '200';
					            	o_statusMessage = 'ok';
					            	o_dataSource = data_source;
					            	o_elevation = elevation;
					            	o_unit = unit;

					            	var ret = [{ 
										status: o_status,
					            		statusCode:o_statusCode,
					            		statusMessage: o_statusMessage,
					            		latitude: lat,
					            		longitude: lon, 
					            		dataSource: o_dataSource, 
					            		elevation: o_elevation,
					            		unit: o_unit}];

									res.status(200).send(GeoJSON.parse(ret, {}));
									return;			
								});
							});
			            }
			        });

			}

		}
		
	}
	catch(err) {
		console.error(err);
		o_statusMessage = 'error while processing elevation data';
			            	
    	var ret = [{ 
			status: o_status,
    		statusCode:o_statusCode,
    		statusMessage: o_statusMessage,
    		latitude: lat,
    		longitude: lon, 
    		dataSource: o_dataSource, 
    		elevation: o_elevation,
    		unit: o_unit}];

		res.status(400).send(GeoJSON.parse(ret, {}));
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

function performRequest(host, path, success) {
	console.log('performRequest host='+host+', path='+path);

  	try {

		var options = {
			host: host,
			path: path
		}

		http.get(options, function (http_res) {
			var data = '';	
			http_res.on("data", function (chunk) {
				data += chunk;
			});

			http_res.on("end", function () {				
				
				try {
					var json_data = JSON.parse(data);	
				
					console.log('json_data='+JSON.stringify(data));	
					console.log('json_data elevation: '+json_data.USGS_Elevation_Point_Query_Service.Elevation_Query.Elevation);

					return success(json_data.USGS_Elevation_Point_Query_Service.Elevation_Query);
				}
				catch (err) {
					console.log('\n\n res err ');	
					return;
				}			
			});
		});
		//req.write(dataString);
		//req.end();
  }
  catch(err){
  	console.error(err);
  }
  
}

module.exports.getElevation = getElevation;