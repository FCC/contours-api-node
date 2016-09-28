
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
var EFS_ELEVATION_DATASET = configEnv[NODE_ENV].EFS_ELEVATION_DATASET;

var fs = require('fs');
var async = require('async');
//var AWS = require('aws-sdk');
var GeoJSON = require('geojson');

//AWS.config.update({
//        accessKeyId: AWS_ACCESS_KEY,
//        secretAccessKey: AWS_SECRET_KEY,
//        region: AWS_REGION,
//        apiVersions: {
//                s3: '2006-03-01',
//                // other service API versions
//                }
//});

//var s3 = new AWS.S3();

var data_dir = EFS_ELEVATION_DATASET;

var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');
var globe_files = require('../data/globe_files.json');

var src, lat, lon, rcamsl, nradial, format, unit;
var  output_data;
var azimuths, filenames, latlon, startTime, endTime;
var filename_ned_1, filename_ned_2, filename_globe;
var filenames_ned_1, filenames_ned_2, filenames_globe;


function getHAAT(req, res) {
	try {
	
		console.log('\n================== start HAAT process ==============');
		console.log(new Date());
		
		azimuths = [];
		output_data = [];
		
		var url = req.url;

		var dataObj = new Object;		
		dataObj['status'] = 'error';
		dataObj['statusCode'] = '400';
		dataObj['statusMessage'] = '';
		dataObj['latitude'] = '';
		dataObj['longitude'] = '';

		GeoJSON.defaults = {Point: ['latitude', 'longitude'], include: ['status','statusCode','statusMessage']};
		
		startTime = new Date().getTime();

		if (!url.match(/lat=/i)) {	
			console.error('lat error');

			dataObj.statusMessage = 'missing lat value';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}
		if (!url.match(/lon=/i)) {
			dataObj.statusMessage = 'missing lon value';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;			
		}
		if (!url.match(/rcamsl=/i)) {
			dataObj.statusMessage = 'missing rcamsl value';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}
		if (!url.match(/nradial=/i)) {
			dataObj.statusMessage = 'missing nradial value';
			returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}

		src = url.replace(/^.*src=/i, '').replace(/&.*$/, '').toLowerCase();
		src = src.toLowerCase();
		if (src != "ned_1" && src != "globe30") {
			src = "ned_1";
		}
		
		lat = url.replace(/^.*lat=/i, '').replace(/&.*$/, '');
		lon = url.replace(/^.*lon=/i, '').replace(/&.*$/, '');
		rcamsl = url.replace(/^.*rcamsl=/i, '').replace(/&.*$/, '');
		nradial = url.replace(/^.*nradial=/i, '').replace(/&.*$/, '');
		format = url.replace(/\?.*$/i, '').replace(/^.*\./, '');
		unit = url.replace(/^.*unit=/i, '').replace(/&.*$/, '');
		unit = unit.toLowerCase();
		if (unit != "m" && unit != "mi" && unit != "ft") {
			unit = "m";
		}
		
		var i, j;
		dataObj.latitude = lat;
        dataObj.longitude = lon;

        if ( !lat.match(/^-?\d+\.?\d*$/) || !lon.match(/^-?\d+\.?\d*$/) ) {            
            
            dataObj.statusMessage = 'invalid lat/lon value';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
        }
		
		if ( !rcamsl.match(/^\d+\.?\d*$/) ) {
			dataObj.statusMessage = 'invalid rcamsl value';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}
		if ( !nradial.match(/^\d*$/) ) {
			dataObj.statusMessage = 'invalid nradial value';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}
		if ( parseFloat(lat) > 90 || parseFloat(lat) < -90 ) {
			dataObj.statusMessage = 'lat value out of range';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;			
		}
		if ( parseFloat(lon) > 180 || parseFloat(lon) < -180 ) {
			dataObj.statusMessage = 'lon value out of range';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;
		}
		if ( parseFloat(nradial) <1 || parseFloat(nradial) > 360 ) {
			dataObj.statusMessage = 'nradial value out of range';
            returnError(dataObj, function(ret){
                 res.status(400).send(GeoJSON.parse(ret, {}));                                         
            });
            return;			
		}

		lat = parseFloat(lat);
		lon = parseFloat(lon);
		rcamsl = parseFloat(rcamsl);
		nradial = parseInt(nradial);
		src = src.toLowerCase();
		
		console.log('src=' + src + ' lat=' + lat + ' lon=' + lon + ' rcamsl=' + rcamsl + ' nradial=' + nradial + ' format=' + format + ' unit=' + unit);

		var num_points_per_radial = 51;
		var num_interval_per_radial = num_points_per_radial - 1;
		var start_point = 3; //kms
		var end_point = 16; //kms
		var dist_delta = (end_point - start_point) / num_interval_per_radial; //distance between 2 points
		
		var dist_arr = [];
		for (i = 0; i < num_points_per_radial; i++) {
			dist_arr.push(start_point + i*dist_delta);
		}
		
		for (i = 0; i < nradial; i++) {
			azimuths.push(Math.round(100.0*i*360/nradial)/100);
		}

		var latlon0;
		var lat1 = lat;
		var lon1 = lon;
		var lat_all = [], lon_all = [];
		var filename_ned_1, filename_ned_2, filename_globe;
		latlon = [];
		for (i = 0; i < nradial; i++) {
			for (j = 0; j < num_points_per_radial; j++) {
				var d = dist_arr[j];
				latlon0 = getLatLonFromDist(lat1, lon1, azimuths[i], d);
				lat_all.push(latlon0[0]);
				lon_all.push(latlon0[1]);
				filename_ned_1 = makeFileName(latlon0[0], latlon0[1], 'ned_1', res);
				filename_ned_2 = makeFileName(latlon0[0], latlon0[1], 'ned_2', res);
				filename_globe = getGlobeFileName(latlon0[0], latlon0[1]);
				latlon.push([i, j, latlon0[0], latlon0[1], filename_ned_1, filename_ned_2, filename_globe]);
			}
		
		}
	
		filenames_ned_1 = [];
		filenames_ned_2 = [];
		filenames_globe = [];
		var filepath;
		for (i = 0; i < latlon.length; i++) {
		filenames_ned_1.push(latlon[i][4]);
		filenames_ned_2.push(latlon[i][5]);
		filenames_globe.push(latlon[i][6]);
		}
		filenames_ned_1 = uniqArray(filenames_ned_1);
		filenames_ned_2 = uniqArray(filenames_ned_2);
		filenames_globe = uniqArray(filenames_globe);

		dataObj = prepareDataObject(dataObj);        

		
		if (src == 'globe30') {
			console.log('use globe data');	
            useGlobeData(res, dataObj, filenames_globe);
			return;
		}
		
		//check if file exists locally and on S3
		var filenames_no_ned_1 = getNonExistingFiles(filenames_ned_1); //ned_1 files not exist locally
		var filenames_no_ned_2 = getNonExistingFiles(filenames_ned_2); //ned_2 files not exist locally
		//var filenames_ned_1_s3 = checkS3(filenames_no_ned_1, 'ned_1'); //ned_1 files that exist on S3
		//var filenames_ned_2_s3 = checkS3(filenames_no_ned_2, 'ned_2'); //ned_2 files that exist on S3
		
		if (filenames_no_ned_1.length == 0) {
			processDataFiles(res, dataObj, filenames_ned_1);
			return;
		}
		else if (filenames_no_ned_2.length == 0) {
			src = 'ned_2';
			processDataFiles(res, dataObj, filenames_ned_2);
			return;
		}
		else {
			src = 'globe30';
			useGlobeData(res, dataObj, filenames_globe);
			return;
		}
		
		
	}
	catch(err) {		
        console.error('--- HAAT processing error ---'+err);
        dataObj.statusMessage = 'processing error occured';
        returnError(dataObj, function(ret){
             res.status(400).send(GeoJSON.parse(ret, {}));                                         
        });
        return;
	}
	
	console.log('Done');
	
	
}

var getFileFromS3 = function(filename) { return function(callback) {
	console.log('getting ' + filename + ' src=' + src);
		
	var params = {
		Bucket: S3_BUCKET,
		Key : S3_ELEV_LOCATION + src + '/' + filename
	};
	
	s3.getObject(params, function(err, data) {
		if (err) {
				//console.log(err, err.stack);
				console.log('S3 error - no file');
				callback();
		}
		else {
				//write to disk
			var filepath = data_dir + '/' + src + '/' + filename;
			console.log('writing filepath=' + filepath);
			//res.send({'msg': 's3 writeting ' + filepath});
			
			fs.writeFile(filepath, data.Body, 'binary', function(err) {
				if(err) {
				console.log('write error');
						callback();
						//return console.log(err);
				}

				var endTime = new Date().getTime();
				var dt = endTime - startTime;
				console.log(filename + ', time to get file from S3: ' + dt);

				callback();
				
			});

		}
	});
	

}
}


function processDataFiles(res, dataObj, filenames) {

	var i, filepath;
			for (i = 0; i < filenames.length; i++) {
				filepath = data_dir + src + '/' + filenames[i];
				readDataFile(i, filepath, latlon);
			}
		
		output_data = output_data.sort(comparator);
		var output_haat = formatHAAT(dataObj);
		
		endTime = new Date().getTime();
		var elapsed_time = endTime - startTime;
		
		if (format == 'json') {
			output_haat['elapsed_time'] = elapsed_time + ' ms';
		}
		
		//res.send(output_haat);
		var return_data = [output_haat];

        res.status(200).send(GeoJSON.parse(return_data, {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage','about',            
        	'elevation_data_source','lat','lon', 'rcamsl', 'nradial', 'azimuth','haat_azimuth','haat_average','unit', 'elapsed_time']})); 

        console.log('processDataFiles Done');

}


function readDataFile(n, filepath, latlon) {
			var i, j, lat, lon, az, npoint;
			//res.send({'status': 'read', 'filepath': filepath, 'filenames_no': filenames_no});;
			
			var data = fs.readFileSync(filepath);

			var filename = filepath.replace(/^.*\//, '');
			
			console.log('reading file: ' + filepath)
			
			var lat_ul, lon_ul, lat_lr, lon_lr;
			if (src.match(/ned_/)) {
				var latlon_ul = getLatLonFromFileName(filename);
				lat_ul = latlon_ul[0];
				lon_ul = latlon_ul[1];
			}
			else if (src == 'globe30') {
				var latlon_ul = getLatLonFromFileNameGlobe(filename);
				lat_ul = latlon_ul[0];
				lon_ul = latlon_ul[1];
				lat_lr = latlon_ul[2];
				lon_lr = latlon_ul[3];
			}
			
			var elev;
	
			for (i = 0; i < latlon.length; i++) {
				if (latlon[i][4] == filename || latlon[i][5] == filename || latlon[i][6] == filename) {
					az = latlon[i][0];
					npoint = latlon[i][1];
					lat = latlon[i][2];
					lon = latlon[i][3];

					if (src.match(/ned_/)) {
				
						if (src == 'ned_1') {
							var data_source = '3DEP 1 arc-second';
						
							var nrow = 3612;
							var ncol = 3612;
							
							var nrow0 = 3600;
							var ncol0 = 3600;
						}
						else {
							var nrow = 1812;
							var ncol = 1812;
							
							var nrow0 = 1800;
							var ncol0 = 1800;
						}
							
						var row = (lat_ul - lat) * nrow0 + 6 + 1;
						var col = (lon - lon_ul) * ncol0 + 6;
						
						row = Math.floor(row);
						col = Math.floor(col);

						var length = 4;
						var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
						elev = Math.round(100*data.slice(position, position+4).readFloatLE(0))/100;
						
						//console.log('row=' + row + ' col=' + col + ' pos=' + position + ' elev=' + elev);
						output_data.push([latlon[i][0], latlon[i][1], latlon[i][2], latlon[i][3], elev]);
					
					}
					else if (src == 'globe30') {
						var nrow0 = Math.round((lat_ul - lat_lr) * 120);
						var ncol0 = Math.round((lon_lr - lon_ul) * 120);

						var row = (lat_ul - lat) * nrow0 / (lat_ul - lat_lr);
						var col = (lon - lon_ul) * ncol0 / (lon_lr - lon_ul);
						
						row = Math.floor(row);
						col = Math.floor(col);

						var length = 2;
						var position = row * ncol0 * length + col * length ;
						//console.log(lat + ' ' + lon + ' ' + row + ' ' + col + ' ' + position)
						elev = Math.round(100*data.slice(position, position+length).readInt16LE(0))/100;
						output_data.push([latlon[i][0], latlon[i][1], latlon[i][2], latlon[i][3], elev]);
					}
				}
			}
			
			//console.log('total row=' + output_data.length);
}

		
function comparator(a, b) {
	if (a[0] < b[0]) {return -1;}
	else if (a[0] > b[0]) {return 1;}
	else {
		//a[0] == b[0]
		if (a[1] < b[1]) {return -1;}
		else if (a[1] > b[1]) {return 1;}
		else {
			return 0;
		}
	}
	}
	
function formatHAAT(dataObj) {

	var haat_av = [];
	var i, j, elevs;
	for (i = 0; i < nradial; i++) {
		elevs = [];
		for (j = 0; j < output_data.length; j++) {
		
			if (output_data[j][0] == i) {
				elevs.push(output_data[j][4]);
				
			}
		}
		haat_av.push(Math.round( 100*(rcamsl - arrMean(elevs)) ) / 100.0);
		//console.log(i + ' ' + azimuths[i] + ' ' + haat_av[i] + ' elevs=' + elevs);
	}
	
	var haat_total = Math.round(100*arrMean(haat_av))/100;
	
	//unit conversion
	
	var feet_per_meter = 3.28084;
	var miles_per_meter = 0.000621371;
	if (unit != "m") {
		for (i = 0; i < haat_av.length; i++) {
			if (unit == "ft") {
				haat_av[i] = Math.round(100 * haat_av[i] * feet_per_meter) / 100;
			}
			else if (unit == "mi") {
				haat_av[i] = Math.round(100000 * haat_av[i] * miles_per_meter) / 100000;
			}
		}
		if (unit == "ft") {
			haat_total = Math.round(100 * haat_total * feet_per_meter) / 100;
		}
		else if (unit == "mi") {
			haat_total = Math.round(100000 * haat_total * miles_per_meter) / 100000;
		}
		
	}
	
	//console.log('format=' + format);
	
	if (format == 'csv') {
		var content = 'azimuth,haat\n'
		for (i = 0; i < nradial; i++) {
			content += azimuths[i] + ',' + haat_av[i] + '\n';
		}
		return content;
	}
	else if (format == 'json') {

        dataObj.status = 'success';
        dataObj.statusCode = '200';        
        dataObj.statusMessage = 'ok';
        dataObj.elevation_data_source = src;
        dataObj.lat = lat;
        dataObj.lon = lon; 
        dataObj.rcamsl = rcamsl;
        dataObj.nradial = nradial;
        dataObj.azimuth = azimuths;
        dataObj.haat_azimuth = haat_av;
        dataObj.haat_average = haat_total;        
        dataObj.unit = unit;

        return dataObj;    
	}
	else {
		var content = {"status": "error", "msg": "unknown format"};
		return content;
	}

}


function getNonExistingFiles(filenames)  {
	
	var i, filename, filepath, src;

	var filenames_no = [];
	for (i = 0; i < filenames.length; i++) {
		src = 'globe30';
		if (filenames[i].match(/flt/)) {
			src = 'ned_' + filenames[i].replace(/^.*_/, '').replace(/\..*$/, '');
		}
		filepath = data_dir + '/' + src + '/' + filenames[i];
		if (!fs.existsSync(filepath)) {
			filenames_no.push(filenames[i]);
		}
	}
	return filenames_no;
}


function arrMean(arr) {
	if (arr.length > 0) {
		var sum = 0;
		for (var i = 0; i < arr.length; i++)  {
			sum += arr[i];
		}
		return sum/arr.length;
	}
	else {
		return null;
	}
}

function getLatLonFromFileName(filename) {
	var ns = filename.slice(5,6);
	var lat = parseInt(filename.slice(6,8));
	var ew = filename.slice(8,9);
	var lon = parseInt(filename.slice(9,12));
	
	if (ns == 's') {
		lat = -1 * lat;
	}
	if (ew == 'w') {
		lon = -1 * lon;
	}
	
	return [lat, lon];
}

function getLatLonFromFileNameGlobe(filename) {
	var i;
	for (i = 0; i < globe_files.files.length; i++) {
		if (globe_files.files[i].filename == filename) {
			return [globe_files.files[i].ullat, globe_files.files[i].ullon, globe_files.files[i].lrlat, globe_files.files[i].lrlon];
		}
	}
	
	return [None, None, None, None];
}


function makeFileName(lat, lon, src, res) {


	if (lat <= -90 || lat > 90 || lon < -180 || lon > 180) {
		res.send({'status': 'error', 'msg': 'Lat/Lon value out of range'});
		return;
	}
	
	if (src != 'ned_1' && src != 'ned_2' && src != 'ned_13') {
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
	
	
	
	var filename = 'float' + ns + lat_str + ew + lon_str + '_' + src.replace('ned_', '') + '.flt';

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

function uniqArray(arr) {
	var i;
	var a = arr.sort();
	var uniq = [];
	for (i = 0; i <a.length-1; i++) {
		if (a[i] != a[i+1]) {
			uniq.push(a[i]);
		}
	}
	uniq.push(a[a.length-1]);
	
	return uniq;
}

function getGlobeFileName(lat, lon) {
	var i;

	for (i = 0; i < globe_files.files.length; i++) {
		if (lat <= globe_files.files[i].ullat && lat > globe_files.files[i].lrlat && lon >= globe_files.files[i].ullon && lon < globe_files.files[i].lrlon) {
			return globe_files.files[i].filename;
		} 
	}
}

function useGlobeData(res, dataObj, filenames_globe) {

	var filenames_no = getNonExistingFiles(filenames_globe);
	var i, filepath;
	
	//if (filenames_no.length > 0) {
			//fetch data from S3

		var asyncTasks = [];
		
		for (i = 0; i < filenames_no.length; i++) {
		asyncTasks.push(getFileFromS3(filenames_no[i]));
		}
		async.parallel(asyncTasks, function() {
			console.log("all done getting globe");
			filenames_no = getNonExistingFiles(filenames_globe);
			for (i = 0; i < filenames_globe.length; i++) {
				filepath = data_dir + 'globe30/' + filenames_globe[i];
				readDataFile(i, filepath, latlon);
			}
			
		output_data = output_data.sort(comparator);
		var output_haat = formatHAAT(dataObj);
		
		endTime = new Date().getTime();
		var elapsed_time = endTime - startTime;
		
		if (format == 'json') {
			output_haat['elapsed_time'] = elapsed_time + ' ms';
		}
			
		//console.log(output_haat);
		
		//res.send(output_haat);

		var return_data = [output_haat];

        res.status(200).send(GeoJSON.parse(return_data, {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage',
            'elevation_data_source','lat','lon', 'rcamsl', 'nradial', 'azimuth','haat_azimuth','haat_average','unit', 'elapsed_time']})); 

        console.log('useGlobeData Done');
			
		});
			
	//res.send({"status": "globe"});

}

function checkS3(filenames, src) {

	var files = [];
	for (var i = 0; i < filenames.length; i++) {
		if (src == 'ned_1') {
			for (var key in ned_1_files) {
				if (ned_1_files[key].file == filenames[i]) {
					files.push(filenames[i]);
					break;
				}
			}
		}
		else {
			for (var key in ned_2_files) {
				if (ned_2_files[key].file == filenames[i]) {
					files.push(filenames[i]);
					break;
				}
			}
		
		}
	}
	
	return files;
}

function prepareDataObject(dataObj){
	
	dataObj['elevation_data_source'] = '';
	dataObj['lat'] = '';
	dataObj['lon'] = '';
	dataObj['rcamsl'] = '';	
	dataObj['nradial'] = '';		
	dataObj['azimuth'];
	dataObj['haat_azimuth'];	
	dataObj['haat_average'] = '';	
	dataObj['unit'] = '';
	dataObj['elapsed_time'] = '';
	return dataObj;	
}

function returnError(data, callback) {             
    console.log('returnError');
    var ret = [{ 
        status: 'error',
        statusCode: '400',
        statusMessage: data.statusMessage,
        latitude: data.latitude,
        longitude: data.longitude
        }];
    return callback(ret);
}

module.exports.getHAAT = getHAAT;