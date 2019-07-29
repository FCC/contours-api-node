
// **********************************************************

'use strict';

// **********************************************************

var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.NODE_PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var AWS_ACCESS_KEY =  process.env.AWS_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
var AWS_REGION = process.env.AWS_REGION;
var EFS_ELEVATION_DATASET = process.env.EFS_ELEVATION_DATASET;

var fs = require('fs');
var async = require('async');
//var AWS = require('aws-sdk');
var GeoJSON = require('geojson');

var data_dir = EFS_ELEVATION_DATASET;

var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');
var globe_files = require('../data/globe_files.json');
var validate = require('./validate.js');

function getHAAT(req, res, callback) {

	var src, lat, lon, rcamsl, nradial, format, unit;
	var  output_data;
	var azimuths, filenames, latlon, startTime;
	var filename_ned_1, filename_ned_2, filename_globe;
	var filenames_ned_1, filenames_ned_2, filenames_globe;

	try {
	
		console.log('\n- start HAAT process -');
		console.log(new Date());
		
		azimuths = [];
		output_data = [];
		
		var url = req.url;
		// var latitude = req.query.lat;
		// var longitude = req.query.lon;
		var returnJson;

		var dataObj = new Object;		
		dataObj['status'] = 'error';
		dataObj['statusCode'] = '400';
		dataObj['statusMessage'] = '';
		dataObj['lat'] = '';
		dataObj['lon'] = '';

		GeoJSON.defaults = {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage']};
		
		startTime = new Date().getTime();

		if (!url.match(/lat=/i)) {
			dataObj.statusMessage = validate.errLat.missing;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (!url.match(/lon=/i)) {
			dataObj.statusMessage = validate.errLon.missing;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (!url.match(/rcamsl=/i)) {
			dataObj.statusMessage = 'Missing RCAMSL value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		if (!url.match(/nradial=/i)) {
			dataObj.statusMessage = 'Missing nradial value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (!url.match(/src=/i)) {
			src = '';
		}
		else {
			src = url.replace(/^.*src=/i, '').replace(/&.*$/, '').toLowerCase();		
		}
		
		if (src != undefined && ['', 'ned_1', 'ned_2', 'globe30'].indexOf(src.toLowerCase()) < 0) {
			dataObj.statusMessage = 'Invalid src value.';
            returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
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
		dataObj.lat = lat;
        dataObj.lon = lon;

        if ( !rcamsl.match(/^-?\d+\.?\d*$/) ) {
			dataObj.statusMessage = 'Invalid RCAMSL value.';
            returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		if ( !nradial.match(/^\d*$/) ) {
			dataObj.statusMessage = 'Invalid nradial value.';
            returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (validate.latLonValue(lat)) {
			dataObj.statusMessage = validate.errLat.value;

			returnError(dataObj, function(ret){                                                       
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}

		if (validate.latLonValue(lon)) {
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

		if ( parseFloat(nradial) <8 || parseFloat(nradial) > 360 ) {
			dataObj.statusMessage = 'nradial value out of range [8-360].';
            returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
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
		
		//check if file exists locally
		var filenames_no_ned_1 = getNonExistingFiles(filenames_ned_1); //ned_1 files not exist locally
		var filenames_no_ned_2 = getNonExistingFiles(filenames_ned_2); //ned_2 files not exist locally
		var filenames_no_globe30 = getNonExistingFiles(filenames_globe); //globe30 files not exist locally

		console.log(filenames_no_ned_1)
		console.log(filenames_no_ned_2)
		console.log(filenames_no_globe30)
			
		if (filenames_no_ned_1.length != 0 && filenames_no_ned_2.length != 0 && filenames_no_globe30.length != 0) {
			console.error('elevation data file missing');
			dataObj.statusMessage = 'Elevation data file missing.';
			returnError(dataObj, function(ret){
                 //res.status(400).send(GeoJSON.parse(ret, {}));                                         
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
			

		console.log('resolved filenames_ned_1='+filenames_ned_1+', filenames_ned_2='+filenames_ned_2+', filenames_no_ned_1='+filenames_no_ned_1+', filenames_no_ned_2='+filenames_no_ned_2);

		var inputData = {};		
		inputData['lat'] = lat;
		inputData['lon'] = lon;
		inputData['src'] = src;
		inputData['latlon'] = latlon;
		inputData['nradial'] = nradial;
		inputData['rcamsl'] = rcamsl;
		inputData['unit'] = unit;
		inputData['format'] = format;
		inputData['azimuths'] = azimuths;

		if (src === 'ned_1' && filenames_no_ned_1.length === 0 || src === '' && filenames_no_ned_1.length === 0 ) {
			src = 'ned_1';
			inputData.src = src;
			processDataFiles(res, dataObj, inputData, output_data, filenames_ned_1, startTime, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });			
		}
		else if (src === 'ned_2' && filenames_no_ned_2.length === 0 || src === '' && filenames_no_ned_2.length === 0) {
			src = 'ned_2';
			inputData.src = src;
			processDataFiles(res, dataObj, inputData, output_data, filenames_ned_2, startTime, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });
			
		}
		else if (src === 'globe30' || src === '') {
			src = 'globe30';
			inputData.src = src;
			useGlobeData(res, dataObj, inputData, output_data, filenames_globe, startTime, function(data){
           	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });			
		}
		else {
			dataObj.statusMessage = 'Unable to calculate results with source=' + (src === undefined ? undefined : src  + '.');
	        returnError(dataObj, function(ret){
	             returnJson = GeoJSON.parse(ret, {});
	        });
	        return callback(returnJson);
		}
		
	}
	catch(err) {			
        console.error('--- HAAT processing error ---'+err);
        dataObj.statusMessage = 'Processing error occured.';
        returnError(dataObj, function(ret){
             returnJson = GeoJSON.parse(ret, {});
        });
        return callback(returnJson);
	}
}

function processDataFiles(res, dataObj, inputData, output_data, filenames, startTime, callbackDataFiles) {
		console.log('Inside processDataFiles');
		var i, filepath;
		for (i = 0; i < filenames.length; i++) {
			filepath = data_dir + inputData.src + '/' + filenames[i];
			readDataFile(i, filepath, inputData.src, inputData.latlon, output_data);
		}
		
		output_data = output_data.sort(comparator);
		var output_haat = formatHAAT(dataObj, inputData, output_data);

		//console.log('output_haat='+JSON.stringify(output_haat));
		
		var endTime = new Date().getTime();
		var elapsed_time = endTime - startTime;
		
		if (inputData.format == 'json') {
			output_haat['elapsed_time'] = elapsed_time + ' ms';
		}
		
		//res.send(output_haat);
		var return_data = [output_haat];

        var return_json = GeoJSON.parse(return_data, {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage','about',            
        	'elevation_data_source','lat','lon', 'rcamsl', 'nradial', 'azimuth','haat_azimuth','haat_average','unit', 'elapsed_time']}); 

        console.log('processDataFiles Done');
        callbackDataFiles(return_json);

}


function readDataFile(n, filepath, src, latlon, output_data) {
			console.log('Inside readDataFile with filepath= '+filepath+', src='+src);
			var i, j, lat, lon, az, npoint;
			//res.send({'status': 'read', 'filepath': filepath, 'filenames_no': filenames_no});;
			
			var data = fs.readFileSync(filepath);

			var filename = filepath.replace(/^.*\//, '');
						
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
						
						//console.log('ned row=' + row + ' col=' + col + ' pos=' + position + ' elev=' + elev);

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

						//console.log('globe30 row=' + row + ' col=' + col + ' pos=' + position + ' elev=' + elev);

						elev = Math.round(100*data.slice(position, position+length).readInt16LE(0))/100;
						if (elev < 0.0) {
							elev = 0.0;
						}
						output_data.push([latlon[i][0], latlon[i][1], latlon[i][2], latlon[i][3], elev]);
					}
				}
			}
			
			console.log('readDataFile total rows=' + output_data.length);
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
	
function formatHAAT(dataObj, inputData, output_data) {
	console.log('Inside formatHAAT');
	try{
		var haat_av = [];
		var i, j, elevs;
		for (i = 0; i < inputData.nradial; i++) {
			elevs = [];
			for (j = 0; j < output_data.length; j++) {
			
				if (output_data[j][0] == i) {
					elevs.push(output_data[j][4]);
					
				}
			}
			haat_av.push(Math.round( 100*(inputData.rcamsl - arrMean(elevs)) ) / 100.0);
			//console.log(i + ' ' + azimuths[i] + ' ' + haat_av[i] + ' elevs=' + elevs);
		}
		
		var haat_total = Math.round(100*arrMean(haat_av))/100;
		console.log('haat_total='+haat_total);
		//unit conversion
		
		var feet_per_meter = 3.28084;
		var miles_per_meter = 0.000621371;
		if (inputData.unit != "m") {
			for (i = 0; i < haat_av.length; i++) {
				if (inputData.unit == "ft") {
					haat_av[i] = Math.round(100 * haat_av[i] * feet_per_meter) / 100;
				}
				else if (inputData.unit == "mi") {
					haat_av[i] = Math.round(100000 * haat_av[i] * miles_per_meter) / 100000;
				}
			}
			if (inputData.unit == "ft") {
				haat_total = Math.round(100 * haat_total * feet_per_meter) / 100;
			}
			else if (inputData.unit == "mi") {
				haat_total = Math.round(100000 * haat_total * miles_per_meter) / 100000;
			}
			
		}
		
		if (inputData.format == 'csv') {
			var content = 'azimuth,haat\n'
			for (i = 0; i < inputData.nradial; i++) {
				content += inputData.azimuths[i] + ',' + haat_av[i] + '\n';
			}
			return content;
		}
		else if (inputData.format == 'json') {
			
	        dataObj.status = 'success';
	        dataObj.statusCode = '200';        
	        dataObj.statusMessage = 'ok';
	        dataObj.elevation_data_source = inputData.src;
	        dataObj.lat = inputData.lat;
	        dataObj.lon = inputData.lon; 
	        dataObj.rcamsl = inputData.rcamsl;
	        dataObj.nradial = inputData.nradial;
	        dataObj.azimuth = inputData.azimuths;
	        dataObj.haat_azimuth = haat_av;
	        dataObj.haat_average = haat_total;        
	        dataObj.unit = inputData.unit;

	        //console.log('formatHAAT return='+JSON.stringify(dataObj));

	        return dataObj;    
		}
		else {
			var content = {"status": "error", "msg": "unknown format"};
			return content;
		}
	}
	catch(err){
		console.log('formatHAAT err='+err);
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

function useGlobeData(res, dataObj, inputData, output_data, filenames_globe, startTime, callbackGlobe) {
	console.log('Inside useGlobeData');
	var filenames_no = getNonExistingFiles(filenames_globe);
	var i, filepath;
	
	for (i = 0; i < filenames_globe.length; i++) {
		filepath = data_dir + 'globe30/' + filenames_globe[i];
		readDataFile(i, filepath, inputData.src, inputData.latlon, output_data);
	}
	
	output_data = output_data.sort(comparator);

	var output_haat = formatHAAT(dataObj, inputData, output_data);
	
	var endTime = new Date().getTime();
	var elapsed_time = endTime - startTime;
	
	if (inputData.format == 'json') {
		output_haat['elapsed_time'] = elapsed_time + ' ms';
	}
		
	var return_data = [output_haat];

	var return_json = GeoJSON.parse(return_data, {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage',
		'elevation_data_source','lat','lon', 'rcamsl', 'nradial', 'azimuth','haat_azimuth','haat_average','unit', 'elapsed_time']}); 

	console.log('useGlobeData Done');
	callbackGlobe(return_json);			
		
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
        lat: data.lat,
        lon: data.lon
        }];
    return callback(ret);
}

module.exports.getHAAT = getHAAT;