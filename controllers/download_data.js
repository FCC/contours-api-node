// **********************************************************

'use strict';

// **********************************************************

var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;
var host =  configEnv[NODE_ENV].HOST;
var geo_host =  configEnv[NODE_ENV].GEO_HOST;
var geo_space = configEnv[NODE_ENV].GEO_SPACE;
var data_dir = configEnv[NODE_ENV].DATA_DIR;
var bucket = configEnv[NODE_ENV].BUCKET_NAME;
var access_key = configEnv[NODE_ENV].ACCESS_KEY;
var secret_key = configEnv[NODE_ENV].SECRET_KEY;

var request = require('request');
var fs = require('fs');
var AWS = require('aws-sdk');

AWS.config.update({
	accessKeyId: access_key,
	secretAccessKey: secret_key,
	region: 'us-west-2',
	apiVersions: {
		s3: '2006-03-01',
		// other service API versions
		}
});

var s3 = new AWS.S3();


var lat, lon, ns, ew, filename;
var root_url = 'https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1/GridFloat';

for (lat = 40; lat >= 38; lat--) {
	for (lon = -100; lon <= -98; lon++) {

	filename = makeFileName(lat, lon);
	//console.log(filename);
	var url = root_url + '/' + filename;
	var filepath = data_dir + '/' + filename;
	getFile(url, filename, filepath);
	
	}
}


function makeFileName(lat, lon) {

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
	
	var filename = 'USGS_NED_1_' + ns + lat_str + ew + lon_str + '_GridFloat.zip';
	
	return filename;
}

function padZero(a, n) {
	//n - total number of digits
	var a_str = a + '';
	while (a_str.length < n) {
		a_str = '0' + a_str;
	}
	
	return a_str;
}

function getFile(url, filename, filepath) {
	//console.log('filepath: ' + filepath);
	//console.log('start download:')
	//console.log(new Date());
	request({url: url, encoding: null, rejectUnauthorized: false, strictSSL: false}, function (err, response, body) {
		
		if (err) {
				
			//console.error('err.stack : ' + err.stack);
			//console.error('err.name : ' + err.name);
			//console.error('err.message : ' + err.message);
		
			var err_res = {};       
			err_res.responseStatus = {
				'status': 500,
				'type': 'Internal Server Error',
				'err': err.name +': '+ err.message      
			};  
				
			res.status(500);
			//res.send(err_res);				
			
		}
		else {
		
			//console.log('response.statusCode : ' + response.statusCode);			
			//console.log('response.headers[content-type] : ' + response.headers['content-type']);
			//console.log('response.headers : ' + JSON.stringify(response.headers) );
			
			console.log('filename: ' + filename + ' status: ' + response.statusCode);
			if (response.statusCode == 200) {
			
				fs.writeFile(filepath, body, 'binary', function(err) {
					if(err) {
						return console.log(err);
					}
					//console.log("write download file " + filepath);
					
					//console.log('uploading to S3');
					console.log(new Date())
					fs.readFile(filepath, function(err, file_buffer){
						var params = {
							Bucket: bucket,
							Key : 'ned_1_zip/' + filename,
							Body: file_buffer
						};

						s3.putObject(params, function (perr, pres) {
							if (perr) {
								console.log("Error uploading data: ", perr);
							} else {
								console.log("Successfully uploaded data");
								console.log(new Date());
									fs.unlink(filepath, function(err){
										if(err) return console.log(err);
										console.log('file deleted successfully');
									});  
							}
						});
					});
				});
			
			}
			else {
				//console.log('File not found: ' + url);
			
			}
			
		}
		
	});
		
}
			