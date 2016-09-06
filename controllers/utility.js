var configEnv = require('../config/env.json');
var NODE_ENV = process.env.NODE_ENV;
var ned_1_files = require('../data/ned_1_files.json');
var ned_2_files = require('../data/ned_2_files.json');
var ned_13_files = require('../data/ned_13_files.json');
var S3_ELEV_LOCATION = configEnv[NODE_ENV].S3_ELEV_LOCATION;

function getElvFileInfo(type, coordName, callback) {
	console.log('getFileLocation coordName='+coordName);

	var result = [];
	var file_type = type;
	var file_name = '';
	var file_path;
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
			file_path =  S3_ELEV_LOCATION + file_type + '/';
			console.log('elevation file found!');
			result[0] = file_type;
			result[1] = file_name;
			result[2] = file_path;
		}
		else {
			throw 'elevation file error';	
		}
		console.log('file_name='+file_name+', file_path='+file_path);
		console.log('result ='+result.length);	
		callback(null, result);
	}
	catch(err){
        console.log('Error while getting ned file info:' + err);
		callback(err, null);
    };
}

module.exports.getElvFileInfo = getElvFileInfo;