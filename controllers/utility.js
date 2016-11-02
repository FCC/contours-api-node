var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');
var ned_13_files = require('../data/ned_13_files.json');
var globe_files = require('../data/globe_files.json');

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

function getElvFileInfo(type, coordName, callback) {
	console.log('getFileLocation coordName='+coordName);

	var result = [];
	var file_type = type;
	var file_name = '';	
	try{
		if(type == 'ned'){
			if(ned_1_files[coordName]){	
				file_type = 'ned_1'; 				
			}
			else if(ned_2_files[coordName]){
				file_type = 'ned_2';				
			}
		}

		if(file_type == 'ned_1'){
			if(ned_1_files[coordName]){
				file_name = ned_1_files[coordName].file;	
			}
		}	
		else if(file_type == 'ned_2'){
			if(ned_2_files[coordName]){
				file_name = ned_2_files[coordName].file;	
			}
		}
		else if(file_type == 'ned_13'){
			if(ned_13_files[coordName]){
				file_name = ned_13_files[coordName].file;	
			}
		}	

		if(file_name != ''){
			console.log('elevation file found!');
			result[0] = file_type;
			result[1] = file_name;			
		}
		else {
			throw 'elevation file error';	
		}
		console.log('file_name='+file_name+', file_type='+file_type);
		console.log('result ='+result.length);	
		callback(null, result);
	}
	catch(err){
        console.log('Error while getting ned file info:' + err);
		callback(err, null);
    };
}

function getGlobeFileName(lat, lon) {
	var i;

	for (i = 0; i < globe_files.files.length; i++) {
		if (lat <= globe_files.files[i].ullat && lat > globe_files.files[i].lrlat && lon >= globe_files.files[i].ullon && lon < globe_files.files[i].lrlon) {
			return globe_files.files[i].filename;
		} 
	}
}

function getElevFromFile(src, filepath, lat, lon) {
	var i, j, lat, lon, az, npoint;
	//res.send({'status': 'read', 'filepath': filepath, 'filenames_no': filenames_no});;
	
	var data = fs.readFileSync(filepath);
	var filename = filepath.replace(/^.*\//, '');
	
	var elev;

	var lat_ul = Math.abs(Math.ceil(lat));
	var lon_ul = Math.abs(Math.floor(lon));
	var lat_lr, lon_lr;

	if (src.match(/ned_/)) {

		if (src == 'ned_1') {
			var nrow = 3612;
			var ncol = 3612;
			
			var nrow0 = 3600;
			var ncol0 = 3600;
		}
		else if (src == 'ned_2') {
			var nrow = 1812;
			var ncol = 1812;
			
			var nrow0 = 1800;
			var ncol0 = 1800;
		}
		else if (src == 'ned_13') {
			var nrow = 10812;
			var ncol = 10812;
			
			var nrow0 = 10800;
			var ncol0 = 10800;
		}
			
		var row = (lat_ul - lat) * nrow0 + 6 + 1;
		var col = (lon - lon_ul) * ncol0 + 6;
		
		row = Math.floor(row);
		col = Math.floor(col);

		var length = 4;
		var position = (row-1) * ncol * 4 + (col - 1) * 4 ;
		console.log('getElevFromFile row=' + row + ' col=' + col + ' pos=' + position);
		elev = Math.round(100*data.slice(position, position+4).readFloatLE(0))/100;
		
	}
	else if (src == 'globe30') {

		var latlon_ul = getLatLonFromFileNameGlobe(filename);
		lat_ul = latlon_ul[0];
		lon_ul = latlon_ul[1];
		lat_lr = latlon_ul[2];
		lon_lr = latlon_ul[3];

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
	}
	return elev;
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

module.exports.getElvFileInfo = getElvFileInfo;
module.exports.getGlobeFileName = getGlobeFileName;
module.exports.getElevFromFile = getElevFromFile;