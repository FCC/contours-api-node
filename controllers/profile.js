
// **********************************************************

'use strict';

// **********************************************************

var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.NODE_PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var EFS_ELEVATION_DATASET = process.env.EFS_ELEVATION_DATASET;

var fs = require('fs');
//var async = require('async');
var GeoJSON = require('geojson');
var mathjs = require('mathjs');

var data_dir = EFS_ELEVATION_DATASET;

var globe_files = require('../data/globe_files.json');

var src, lat, lon, lat_all, lon_all, rcamsl, nradial, format, unit, azimuth;
var  output_data;
var dist_arr, azimuths, filenames, latlon, startTime, endTime, start, end, num_points, unit;
var filename_ned_1, filename_ned_2, filename_globe;
var filenames_ned_1, filenames_ned_2, filenames_globe;


function getProfile(req, res, callback) {
	try {
	
		console.log('\n================== start profile process ==============');
		console.log(new Date());
		
		azimuths = [];
		output_data = [];
		
		var url = req.url;
		var returnJson;

		var dataObj = new Object;		
		dataObj['status'] = 'error';
		dataObj['statusCode'] = '400';
		dataObj['statusMessage'] = '';
		dataObj['lat'] = '';
		dataObj['lon'] = '';

		GeoJSON.defaults = {Point: ['lat', 'lon'], include: ['status','statusCode','statusMessage']};
		
		startTime = new Date().getTime();

		src = req.query.src;
		lat = req.query.lat;
		lon = req.query.lon;
		azimuth = req.query.azimuth;
		start = req.query.start;
		end = req.query.end;
		num_points = req.query.num_points;
		unit = req.query.unit;
		
		if (src == undefined) {
			src = 'ned_1';
		}
		
		if (unit == undefined) {
			unit = 'm';
		}
		
		if (lat == undefined) {
			console.log('Missing lat');
			dataObj.statusMessage = 'Missing lat.';
			returnError(dataObj, function(ret){                                         
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if (lon == undefined) {
			console.log('Missing lon');
			dataObj.statusMessage = 'Missing lon.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if (azimuth == undefined) {
			console.log('Missing azimuth');
			dataObj.statusMessage = 'Missing azimuth.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (start == undefined) {
			console.log('Missing start');
			dataObj.statusMessage = 'Missing start.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (end == undefined) {
			console.log('Missing end');
			dataObj.statusMessage = 'Missing end.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		if (num_points == undefined) {
			console.log('Missing num_points');
			dataObj.statusMessage = 'Missing num_points.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if (src && src != 'ned_1' && src != 'globe30') {
			console.log('invalid src - must be ned_1 or globe30');
			dataObj.statusMessage = 'Invalid src - must be ned_1 or globe30.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		var unit_list = ['m', 'mi', 'ft'];
		if (unit_list.indexOf(unit) < 0) {
			console.log('invalid unit - must be m, ft, or mi');
			dataObj.statusMessage = 'Invalid unit - must be m, ft, or mi.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if ( !lat.match(/^-?\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid lat value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !lon.match(/^-?\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid lon value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !azimuth.match(/^\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid azimuth value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if ( !start.match(/^\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid start value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( !end.match(/^\d+\.?\d*$/)) {
			dataObj.statusMessage = 'Invalid end value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}	
		
		if ( !num_points.match(/^\d+$/)) {
			dataObj.statusMessage = 'Invalid num_points value.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);			
		}
		
		if ( parseFloat(lat) > 90 || parseFloat(lat) < -90 ) {
			dataObj.statusMessage = 'lat value out of range.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);				
		}
		
		if ( parseFloat(lon) > 180 || parseFloat(lon) < -180 ) {
			dataObj.statusMessage = 'lon value out of range';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( parseFloat(azimuth) < 0 || parseFloat(azimuth) > 360 ) {
			dataObj.statusMessage = 'Azimuth value out of range.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( parseFloat(end) <= parseFloat(start)) {
			dataObj.statusMessage = 'End is not larger than start.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
		}
		
		if ( parseFloat(num_points) < 2) {
			dataObj.statusMessage = 'num_points is smaller than 2.';
			returnError(dataObj, function(ret){
                 returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);            
		}
		
		format = url.replace(/\?.*$/i, '').replace(/^.*\./, '');
		
		var i, j;
		dataObj.lat = lat;
		dataObj.lon = lon;



		rcamsl = "1000";
		nradial = "1";
		
		lat = parseFloat(lat);
		lon = parseFloat(lon);
		rcamsl = parseFloat(rcamsl);
		nradial = parseInt(nradial);
		azimuth = parseFloat(azimuth);
		start = parseFloat(start);
		end = parseFloat(end);
		num_points = parseInt(num_points);
		
		if (azimuth == 360) {
			azimuth = 0;
		}
		src = src.toLowerCase();
		
		console.log('src=' + src + ' lat=' + lat + ' lon=' + lon + ' azimuth=' + azimuth + ' rcamsl=' + rcamsl + ' nradial=' + nradial + ' format=' + format + ' unit=' + unit);

		var num_points_per_radial = num_points;
		var num_interval_per_radial = num_points_per_radial - 1;
		var start_point = start; //kms
		var end_point = end; //kms
		var dist_delta = (end_point - start_point) / num_interval_per_radial; //distance between 2 points
		
		dist_arr = [];
		for (i = 0; i < num_points_per_radial; i++) {
			dist_arr.push( start_point + i*dist_delta);
		}
		
		azimuths.push(azimuth);

		var latlon0;
		var lat1 = lat;
		var lon1 = lon;
		lat_all = [];
		lon_all = [];
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
			useGlobeData(res, dataObj, filenames_globe, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });
		}
		
		//check files
		var filenames_no_ned_1 = getNonExistingFiles(filenames_ned_1); //ned_1 files that do not exist on EFS
		var filenames_no_ned_2 = getNonExistingFiles(filenames_ned_2); //ned_2 files that do not exist on EFS

		console.log('file to be used: filenames_ned_1='+filenames_ned_1+', filenames_ned_2='+filenames_ned_2+', filenames_no_ned_1='+filenames_no_ned_1+', filenames_no_ned_2='+filenames_no_ned_2);

		if (filenames_no_ned_1.length == 0) {
			src = 'ned_1';			
			processDataFiles(res, dataObj, filenames_ned_1, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });			
		}
		else if (filenames_no_ned_2.length == 0) {
			src = 'ned_2';			
			processDataFiles(res, dataObj, filenames_ned_2, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });			
		}
		else {
			src = 'globe30';
			useGlobeData(res, dataObj, filenames_globe, function(data){
            	if(data){
                	return callback(data);    
            	}
            	return callback(null);
            });
		}
		
	}
	catch(err) {
		console.error('--- profile processing error ---'+err);
		dataObj.statusMessage = 'profile processing error';
		returnError(dataObj, function(ret){
             returnJson = GeoJSON.parse(ret, {});
        });
        return callback(returnJson);		
	}
	
}



function processDataFiles(res, dataObj, filenames, callbackDataFiles) {

		var i, filepath;
		for (i = 0; i < filenames.length; i++) {
			filepath = data_dir + src + '/' + filenames[i];
			readDataFile(i, filepath, latlon);
		}
	
		output_data = output_data.sort(comparator);
		var output_haat = formatHAAT(dataObj);

		console.log('return output_haat:: '+output_haat.average_elevation);
		
		endTime = new Date().getTime();
		var elapsed_time = endTime - startTime;
		
		if (format == 'json') {
			output_haat['elapsed_time'] = elapsed_time + ' ms';
		}
		
		/*res.send(output_haat);*/

		var return_data = [output_haat];

		var return_json = GeoJSON.parse(return_data, {LineString: 'linestring_coords', include: ['status','statusCode','statusMessage', 'points',
			'elevation_data_source','lat','lon','azimuth','distance','elevation','average_elevation','unit', 'elapsed_time']}); 

        callbackDataFiles(return_json);

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
						elev = Math.round(100*data.slice(position, position+length).readInt16LE(0))/100;
						output_data.push([latlon[i][0], latlon[i][1], latlon[i][2], latlon[i][3], elev]);
					}
				}
			}

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
	var elev_av = [];
	var i, j, elevs;

	for (i = 0; i < nradial; i++) {
		elevs = [];
		for (j = 0; j < output_data.length; j++) {
		
			if (output_data[j][0] == i) {
				elevs.push(output_data[j][4]);
				
			}
		}
		haat_av.push(Math.round( 100*(1000 - arrMean(elevs)) ) / 100.0);
		elev_av.push(Math.round( 100*(arrMean(elevs)) ) / 100.0);
		
		//console.log(i + ' ' + azimuths[i] + ' ' + haat_av[i] + ' elevs=' + elevs);
	}
	
	var haat_total = Math.round(100*arrMean(haat_av))/100;

	//unit conversion
	
	//change distance unit first - in km originally, change to meter first

	for (i = 0; i < elevs.length; i++) {
		dist_arr[i] = mathjs.round(1000 * dist_arr[i], 2);
	}
	
	
	var feet_per_meter = 3.28084;
	var miles_per_meter = 0.000621371;
	
	if (unit != "m") {
		for (i = 0; i < elevs.length; i++) {
			if (unit == "ft") {
				elevs[i] = Math.round(100 * elevs[i] * feet_per_meter) / 100;
				dist_arr[i] = Math.round(100 * dist_arr[i] * feet_per_meter) / 100;
			}
			else if (unit == "mi") {
				elevs[i] = Math.round(100000 * elevs[i] * miles_per_meter) / 100000;
				dist_arr[i] = Math.round(100000 * dist_arr[i] * miles_per_meter) / 100000;
			}
		}
		if (unit == "ft") {
			haat_total = Math.round(100 * haat_total * feet_per_meter) / 100;
			elev_av = Math.round(100 * elev_av * feet_per_meter) / 100;
		}
		else if (unit == "mi") {
			haat_total = Math.round(100000 * haat_total * miles_per_meter) / 100000;
			elev_av = Math.round(100000 * elev_av * miles_per_meter) / 100000;
		}
		
	}
	
	var points = [];
	var linestring_coords = [];
	for (i = 0; i < dist_arr.length; i++) {
		points[i] = {'lat': mathjs.round(lat_all[i], 10), 'lon': mathjs.round(lon_all[i], 10), 'distance': dist_arr[i], 'elevation': elevs[i]};
		linestring_coords[i] = [mathjs.round(lon_all[i], 10), mathjs.round(lat_all[i], 10)];
	}
	
	if (format == 'csv') {
		var content = 'distance,elevation\n'
		for (i = 0; i < dist_arr.length; i++) {
			content += dist_arr[i] + ',' + elevs[i] + '\n';
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
		dataObj.azimuth = azimuths[0];
		dataObj.distance = dist_arr;
		dataObj.elevation = elevs;
		dataObj.average_elevation = elev_av[0];
		dataObj.unit = unit;
		dataObj.points = points;
		dataObj.linestring_coords = linestring_coords;

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

function useGlobeData(res, dataObj, filenames_globe, callbackGlobe) {

		var filenames_no = getNonExistingFiles(filenames_globe);
		var i, filepath;
	
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
		
		/*res.send(output_haat);*/
		var return_data = [output_haat];
		
		var return_json = GeoJSON.parse(return_data, {LineString: 'linestring_coords', include: ['status','statusCode','statusMessage', 'points',
			'elevation_data_source','lat','lon','azimuth','distance','elevation','average_elevation','unit', 'elapsed_time']}); 

		console.log('useGlobeData Done');
        callbackGlobe(return_json);			
}



function prepareDataObject(dataObj){	
	
	dataObj['elevation_data_source'] = '';
	dataObj['lat'] = '';
	dataObj['lon'] = '';	
	dataObj['azimuth'] = '';
	dataObj['distance'];
	dataObj['elevation'];
	dataObj['average_elevation'];
	dataObj['unit'] = '';
	dataObj['elapsed_time'] = '';
	dataObj['points'] = [];
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


module.exports.getProfile = getProfile;