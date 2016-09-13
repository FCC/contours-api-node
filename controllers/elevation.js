
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
var AWS_REGION = configEnv[NODE_ENV].AWS_REGION;

AWS.config.update({
     accessKeyId: AWS_ACCESS_KEY,
     secretAccessKey: AWS_SECRET_KEY,
     region: AWS_REGION,
    });
var S3_BUCKET = configEnv[NODE_ENV].S3_BUCKET;
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
var utility = require('./utility.js');

if (NODE_ENV == 'LOCAL') {
	data_dir = 'data/';	
}
else {
	data_dir = '/var/data/';
}


function getElevation(req, res) {
	var now_dt = new Date();
	console.log('--- beginning elevation ---' + now_dt.toUTCString());

	var dataObj = new Object;		
		dataObj['status'] = 'error';
		dataObj['statusCode'] = '400';
		dataObj['statusMessage'] = '';
		dataObj['statusMessage'] = '';
		dataObj['lat'] = '';
		dataObj['lon'] = '';
		dataObj['dataSource'] = '';
		dataObj['elevation'] = '';
		dataObj['unit'] = '';


	var lat, lon;

	try {
		
		var latitude = req.query.lat;
		var longitude = req.query.lon;
		var datatype = req.query.src;
		var unit = req.query.unit;

		lat = latitude;
		lon = longitude;
		dataObj.lat = lat;
		dataObj.lon = lon;

		GeoJSON.defaults = {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage','lat','lon','dataSource','elevation','unit']};

		console.log('params: lat='+latitude+',lon='+longitude+', src='+datatype+', unit='+unit);
		//console.log('o_status='+o_status+', o_statusCode='+o_statusCode+', o_statusMessage='+o_statusMessage+', o_dataSource='+o_dataSource+', o_elevation='+o_elevation+', o_unit='+o_unit);

		if(!datatype){
			datatype = data_src;
		}
		if(!unit){
			unit = param_unit;
		}
		
		if(!datatype || !unit || !latitude || !longitude){
			
        	dataObj.statusMessage = 'invalid parameters';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}

		if ( !latitude.match(/^-?\d+\.?\d*$/) || !longitude.match(/^-?\d+\.?\d*$/) ) {
			
        	dataObj.statusMessage = 'invalid input - latitude/longitude';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;        	
		}

		lat = parseFloat(latitude);
		lon = parseFloat(longitude);
		
		if (lat <= -90 || lat > 90 || lon < -180 || lon > 180) {
			
        	dataObj.statusMessage = 'invalid input - latitude/longitude';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}

		if (datatype != 'ned' && datatype != 'ned_1' && datatype != 'ned_2' && datatype != 'ned_13' && datatype != 'globe30' && datatype != 'usgs') {
			
			dataObj.statusMessage = 'invalid input - source';        	
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}

		if (unit != 'm' && unit != 'mi' && unit != 'ft') {
			
			dataObj.statusMessage = 'invalid input - unit';
        	returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
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

		var s3_filepath;
		var s3_filename;

		var coordName = ns + lat_str + ew + lon_str;
		
		console.log('coordName='+coordName);

		if(datatype.startsWith('ned')) {
			
			utility.getElvFileInfo(datatype, coordName, function(err, result){
				if(err){
					console.error('getElvFileInfo call error');
					dataObj.statusMessage = 'elevation data not found';
					returnError(dataObj, function(ret){
		                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
		            });
		            return;
				}
				else {
					console.log('result from getElvFileInfo: '+result);
					datatype = result[0];
					s3_filename = result[1];
					s3_filepath = result[2];
				}
			})
		}
		else if(datatype == 'globe30'){
			s3_filename = utility.getGlobeFileName(lat, lon);
			s3_filepath =  S3_ELEV_LOCATION + datatype + '/';
			console.log('globe: filename= '+s3_filename+', filepath='+s3_filepath);
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
				
            	dataObj.status = 'success';
            	dataObj.statusCode = '200';
            	dataObj.statusMessage = 'ok',
            	dataObj.dataSource = data.Data_Source;
            	dataObj.elevation = elevation;
            	dataObj.unit = unit;

            	var ret = [dataObj];
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
		
		
		if (datatype != 'usgs' && s3_filepath && s3_filename) {

			//if(datatype != 'ned'){ // for ned_13
				//s3_filename = 'float' + coordName + file_ext +'.flt';
			//}
			//var s3_filename = 'float' + ns + lat_str + ew + lon_str + file_ext +'.flt';
			// sample file floatn15w093_1.flt		
			console.log('non usgs flow');
			console.log('s3_filepath:'+s3_filepath);
			console.log('s3_filename:'+s3_filename);

			if(!s3_filepath || !s3_filename) {
				throw 's3 file error';
			}

			var row = (lat_ul - lat) * nrow0 + 6 + 1;
			var col = (lon_ul - Math.abs(lon)) * ncol0 + 6;

			var filepath = data_dir + datatype + '/' + s3_filename;
			
			row = Math.floor(row);
			col = Math.floor(col);

			var length = 4;
			var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
			
			console.log('row=' + row + ' col=' + col + ' pos=' + position);

			console.log('S3_BUCKET='+S3_BUCKET);
			console.log('data filepath='+ filepath);

			var st_time = new Date().getTime();	
			console.log('st_time='+st_time);

			if (fs.existsSync(filepath)) { // file is already exist
				// readfile to calculate elevation data
				console.log('file exist in file system');

				if(datatype == 'globe30'){
					var elevation = utility.getElevFromFile(datatype, filepath, lat, lon);

					dataObj.status = 'success';
	            	dataObj.statusCode = '200';
	            	dataObj.statusMessage = 'ok';
	            	dataObj.dataSource = 'globe30';
	            	dataObj.elevation = elevation;
	            	dataObj.unit = unit;

	            	var ret = [dataObj];
					res.status(200).send(GeoJSON.parse(ret, {}));
					return;
				}
				else { 
					fs.open(filepath, 'r', function(err, fd) {
						if(err) {
							console.error('elevation file err='+err);
							throw err;
						}	

						var buffer = new Buffer(length);

						fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
							if(err) {

								console.error('elevation file err='+err);

				            	dataObj.statusMessage = 'unable to process elevation data';				            	
								returnError(dataObj, function(ret){
					                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
					            });
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

			            	dataObj.status = 'success';
			            	dataObj.statusCode = '200';
			            	dataObj.statusMessage = 'ok';
			            	dataObj.dataSource = data_source;
			            	dataObj.elevation = elevation;
			            	dataObj.unit = unit;

			            	var ret = [dataObj];
							res.status(200).send(GeoJSON.parse(ret, {}));
							return;
						});
					});
				}
			}
			else { // if file already not downloaded from s3

				if(datatype == 'globe30'){
					console.log('globe30 flow ');
					utility.getFileFromS3(datatype, filepath, s3_filepath, s3_filename, function(err, result){
						if(err){
							console.error('getElvFileInfo call error');
							dataObj.statusMessage = 'elevation data not found';							
							returnError(dataObj, function(ret){
				                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
				            });
				            return;						
						}
						else {
							console.log('file copy success');
							var elevation = utility.getElevFromFile(datatype, filepath, lat, lon);
							
							dataObj.status = 'success';
			            	dataObj.statusCode = '200';
			            	dataObj.statusMessage = 'ok';
			            	dataObj.dataSource = 'globe30';
			            	dataObj.elevation = elevation;
			            	dataObj.unit = unit;

			            	var ret = [dataObj];
							res.status(200).send(GeoJSON.parse(ret, {}));
							return;
						}
					});
					
				}
				else {
					var s3 = new AWS.S3();
					var params = {
			            Bucket: S3_BUCKET, // bucket name
			            Key: s3_filepath + s3_filename
			        };
			        s3.getObject(params, function(err, data) {
			            if (err) {

			            	console.error('s3 err='+err);			            	
			            	dataObj.statusMessage = 'elevation data not found';							
							returnError(dataObj, function(ret){
				                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
				            });
				            return;	
			            } 
			            else {
							console.log('downloading file from s3..., time='+new Date().getTime());
					        var fd = fs.openSync(filepath, 'a+');
					        fs.writeSync(fd, data.Body, 0, data.Body.length, 0);
					        fs.closeSync(fd);

					        if (!fs.existsSync(filepath)) {

					        	dataObj.statusMessage = 'unable to process elevation data';				            	
								returnError(dataObj, function(ret){
					                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
					            });
					            return;	
							}

							fs.open(filepath, 'r', function(err, fd) {
								if(err) {
									console.error('s3 file read err='+err);
									throw err;
								}	

								var buffer = new Buffer(length);

								fs.read(fd, buffer, 0, length, position, function(err, bytesRead) {
									if(err) {
										console.error('s3 file read err='+err);

										dataObj.statusMessage = 'unable to process elevation data';				            	
										returnError(dataObj, function(ret){
							                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
							            });
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

									dataObj.status = 'success';
					            	dataObj.statusCode = '200';
					            	dataObj.statusMessage = 'ok',
					            	dataObj.dataSource = data_source;
					            	dataObj.elevation = elevation;
					            	dataObj.unit = unit;

					            	var ret = [dataObj];
									res.status(200).send(GeoJSON.parse(ret, {}));
									return;
								});
							});
			            }
			        });
				}
			}

		}
		
	}
	catch(err) {
		console.error('elevation err='+err);
		dataObj.statusMessage = 'error while processing elevation data';		
		returnError(dataObj, function(ret){
             res.status(400).send(GeoJSON.parse(ret, {}));                                         
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
					console.error('\n\n performRequest res err '+err);	
					return;
				}			
			});
		});
		//req.write(dataString);
		//req.end();
  }
  catch(err){
  	console.error('\n\n performRequest err '+err);	
  }  
}

function returnError(data, callback) {             
    console.log('returnError');
    var ret = [{ 
        status: 'error',
        statusCode: '400',
        statusMessage: data.statusMessage,
        latitude: data.latitude,
        longitude: data.longitude,
        dataSource: data.dataSource, 
        elevation: data.elevation,
        unit: data.unit
        }];
    return callback(ret);
}

module.exports.getElevation = getElevation;