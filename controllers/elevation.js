
// **********************************************************

'use strict';

// **********************************************************

//var configEnv = require('../config/env.json');
try {
    require('dotenv').load();
} catch(e) {
    console.log('error trying to load env file, app is probably running in AWS.');
}

var http = require('http');

var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.NODE_PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var AWS = require('aws-sdk');
var AWS_ACCESS_KEY =  process.env.AWS_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
var AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
     accessKeyId: AWS_ACCESS_KEY,
     secretAccessKey: AWS_SECRET_KEY,
     region: AWS_REGION,
    });

var fs = require('fs');

var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');

var data_dir = process.env.EFS_ELEVATION_DATASET;
var filepath;
var data_src = 'ned';
var param_unit = 'm';
var file_ext = '_1';
var GeoJSON = require('geojson');
var utility = require('./utility.js');
var validate = require('./validate.js');


function getElevation(req, res, callback) {
	var now_dt = new Date();
	console.log('--- beginning elevation ---' + now_dt.toUTCString());
	console.log('data_dir = '+data_dir);

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
	var returnJson;

	try {
		
		var latitude = req.query.lat;
		var longitude = req.query.lon;
		var datatype = req.query.src;
		var unit = req.query.unit;

		// lat = latitude;
		// lon = longitude;
		lat = parseFloat(latitude);
		lon = parseFloat(longitude);

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
		
		if(!datatype || !unit){
			
        	dataObj.statusMessage = 'Invalid parameters.';
			returnError(dataObj, function(ret){
                 //res.status(400).send(GeoJSON.parse(ret, {}));                                         
                 returnJson = GeoJSON.parse(ret, {});  
            });
            console.log('returnJson ===='+returnJson);
            callback(returnJson);
		}		

		if (validate.latMissing(latitude)) {
			dataObj.statusMessage = validate.errLat.missing;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.lonMissing(longitude)) {
			dataObj.statusMessage = validate.errLon.missing;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.latLonValue(latitude)) {
			dataObj.statusMessage = validate.errLat.value;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.latLonValue(longitude)) {
			dataObj.statusMessage = validate.errLon.value;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
				
		if (validate.latRange(lat)) {
			dataObj.statusMessage = validate.errLat.range;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.lonRange(lon)) {
			dataObj.statusMessage = validate.errLon.range;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.getNumDecimal(lat) > 10) {
			dataObj.statusMessage = validate.errLat.decimal;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (validate.getNumDecimal(lon) > 10) {
			dataObj.statusMessage = validate.errLon.decimal;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (datatype != 'ned' && datatype != 'ned_1' && datatype != 'ned_2' && datatype != 'ned_13' && datatype != 'globe30' && datatype != 'usgs') {
			
			dataObj.statusMessage = 'Invalid source value.';        	
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            callback(returnJson);
		}

		if (unit != 'm' && unit != 'mi' && unit != 'ft') {
			
			dataObj.statusMessage = 'Invalid unit value.';
        	returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            callback(returnJson);
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

		var elev_filename;
		var elev_filepath;		
		var data_source = datatype;

		var coordName = ns + lat_str + ew + lon_str;
		
		console.log('coordName='+coordName);

		if(datatype.startsWith('ned')) {
			
			utility.getElvFileInfo(datatype, coordName, function(err, result){
				if(err){
					console.error('getElvFileInfo call error');
					dataObj.statusMessage = 'Elevation data not found.';
					returnError(dataObj, function(ret){
		                 returnJson = GeoJSON.parse(ret, {});
		            });
		            callback(returnJson);
				}
				else {
					console.log('result from getElvFileInfo: '+result);
					datatype = result[0];
					elev_filename = result[1];
				}
			})
		}
		else if(datatype == 'globe30'){
			elev_filename = utility.getGlobeFileName(lat, lon);			
			console.log('globe: filename= '+elev_filename);
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
				returnJson = GeoJSON.parse(ret, {}); //possible cause
				callback(returnJson);
			});
		}	

		else if (datatype == 'ned_1') {
			data_source = '3DEP 1 arc-second';
		}

		else if (datatype == 'ned_2') {
			data_source = '3DEP 2 arc-second';
		}
		
		else if (datatype == 'ned_13') {
			data_source = '3DEP 1/3 arc-second';
		}
		
		
		if (datatype != 'usgs' && elev_filename) {
			
			console.log('non usgs flow');
			console.log('elev_filename:'+elev_filename);			

			if(!elev_filename) {
				throw 'elevation file error';
			}
			
			var filepath = data_dir + datatype + '/' + elev_filename;
			
			console.log('elevation data filepath='+ filepath);

			var st_time = new Date().getTime();	
			console.log('st_time='+st_time);

			if (fs.existsSync(filepath)) { // file is available in file system.
				// readfile to calculate elevation data
				console.log(datatype+' file exist in file system');

				var elevation = utility.getElevFromFile(datatype, filepath, lat, lon);

				if( unit === 'mi'){
					elevation = Math.round(1000*elevation*0.000621371)/1000;
				}
				else if(unit === 'ft'){
					elevation = Math.round(1000*elevation*3.28084)/1000;
				}

				dataObj.status = 'success';
            	dataObj.statusCode = '200';
            	dataObj.statusMessage = 'ok';
            	dataObj.dataSource = data_source;
            	dataObj.elevation = elevation;
            	dataObj.unit = unit;

            	var ret = [dataObj];
				returnJson = GeoJSON.parse(ret, {});
				callback(returnJson);;
				
			}
			else { // file not available in file system
				console.log(datatype +' file not exist in file system');
				
				dataObj.statusMessage = 'Elevation data not found.';	
				returnError(dataObj, function(ret){
		             returnJson = GeoJSON.parse(ret, {});
		        });
		        callback(returnJson);	
				
			}

		}
		
	}
	catch(err) {
		console.error('elevation err='+err);
		dataObj.statusMessage = 'Error while processing elevation data.';
		returnError(dataObj, function(ret){
             returnJson = GeoJSON.parse(ret, {});
        });
        callback(returnJson);	
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
        lat: data.lat,
        lon: data.lon,
        dataSource: data.dataSource, 
        elevation: data.elevation,
        unit: data.unit
        }];
    return callback(ret);
}

module.exports.getElevation = getElevation;