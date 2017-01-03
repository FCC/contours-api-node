
// **********************************************************

'use strict';

// **********************************************************
var dotenv = require('dotenv').load();
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var db_contour = require('./db_contour.js');

console.log(CONTOURS_PG)

var promise = require('bluebird');
var options = {
  // Initialization Options
  promiseLib: promise
};
var pgp = require('pg-promise')(options);
var async = require('async');

//var getLineConductivity = function(lineOption, callback) {

var getLineConductivity = function(lineOption){ return function(callback) {


	var i, lat1, lon1, lat2, lon2;
	var intersections = [];
	

	
	//var latlon = getLatLonFromDist(latStart, lonStart, azimuth, distance);
	
	//var latEnd = latlon[0];
	//var lonEnd = latlon[1];
	//var lineOption = {"azimuth": azimuth, "distance": distance, "latStart": latStart, "lonStart": lonStart};
			
	var line = createLine(lineOption);
	
	//console.log(line)
	
	var line = "ST_GeomFromText('LineString(" + line + ")', 4326)";
	
	
	findIntersects(line, function(error, response) {
		if (error) {
			callback(error, []);
		}
		else {
			//console.log(response);
			
			var asyncTasks = [];
			for (i = 0; i < response.length; i++) {
			//console.log(i)
				asyncTasks.push(findIntersection(line, response[i]));
			}
			//console.log(asyncTasks)
			
			async.parallel(asyncTasks, function(error, result){
				//console.log("all done");
				if (error) {
					callback(error, []);
				
				}
				else {
					var distance = [];
					var bearing_line = [];
					var bearing_seg = [];
					var bearings;
					for (i = 0; i < result.length; i++) {
						//console.log(i, result[i].intersection)
						
						var data = JSON.parse(result[i].intersection[0].data)

						lat1 = lineOption.latStart;
						lon1 = lineOption.lonStart;
						lat2 = data.coordinates[1];
						lon2 = data.coordinates[0];
						distance[i] = getDistFromLatLon(lat1, lon1, lat2, lon2);
						result[i].distance = distance[i];
						
						//get bearings
						bearings = getBearings(lineOption, result[i]);
						//console.log('bearings==========', bearings)
						result[i].bearings = bearings;
						
					}
					
					//console.log('result before=', result)
					result.sort(function(a,b) {return a.distance - b.distance;});
					//console.log('result after', result)

					
					
					var result_all = {"lineOption": lineOption, "result": result};
					callback(null, result_all);
				}
			});
		}
	});

}}

	
var getLatLonFromDist = function(lat1, lon1, az, d) {
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

var findIntersects = function(line, callback) {
	var q = "SELECT * FROM " + CONTOURS_SCHEMA + ".conductivity_m3 WHERE ST_Intersects(geom, " + line + ")";
	
	//console.log(q)
	
	db_contour.any(q)
		.then(function (data) {
			callback(null, data);	
		})
		.catch(function (err) {
			callback(err, null);
		});
};


var findIntersection = function (line, seg) {return function(callback) {

	var q = "SELECT ST_AsGeoJSON(ST_Intersection(geom, " + line + ")) as data FROM " + CONTOURS_SCHEMA + ".conductivity_m3 " +
			"WHERE seg_id = " + seg.seg_id;
			
	db_contour.any(q)
		.then(function (data) {
		//console.log('data', data)
		var result = {"seg": seg, "intersection": data}
		callback(null, result);	
		})
		.catch(function (err) {
			callback(err, []);
		});
	


	};

}

var getDistFromLatLon = function(lat1, lon1, lat2, lon2) {
    var lat1 = lat1 * Math.PI / 180.0;
    var lon1 = lon1 * Math.PI / 180.0;
	var lat2 = lat2 * Math.PI / 180.0;
    var lon2 = lon2 * Math.PI / 180.0;
    var R = 6371; //earth radius in kms

	var dlon = lon2 - lon1;
	var dlat = lat2 - lat1;
	
	var a = (Math.sin(dlat/2.0))*(Math.sin(dlat/2.0)) + Math.cos(lat1)*Math.cos(lat2) * (Math.sin(dlon/2.0))*(Math.sin(dlon/2.0));
	var c = 2 * Math.atan2( Math.sqrt(a), Math.sqrt(1-a) );
	var d = R * c;

	return d;
}

var getBearings = function(lineOption, result) {

	var latlon, lat1, lon1, lat2, lon2, bearing_line, bearing_seg;
	var inner_values, outer_values;

	var distToIntersect = result.distance;
	//console.log("in getBearings", 'line=', lineOption, 'result', result);
	var latStart = parseFloat(lineOption.latStart);
	var lonStart = parseFloat(lineOption.lonStart);
	var latIntersect = parseFloat(JSON.parse(result.intersection[0].data).coordinates[1]);
	var lonIntersect = parseFloat(JSON.parse(result.intersection[0].data).coordinates[0]);
	var azimuth = parseFloat(lineOption.azimuth);
	var distToIntersect = getDistFromLatLon(latStart, lonStart, latIntersect, lonIntersect);
	
	latlon = getLatLonFromDist(latStart, lonStart, azimuth, distToIntersect - 1);
	lat1 = latlon[0];
	lon1 = latlon[1];
	latlon = getLatLonFromDist(latStart, lonStart, azimuth, distToIntersect + 1);
	lat2 = latlon[0];
	lon2 = latlon[1];
	bearing_line = computeBearing(lat1, lon1, lat2, lon2);
	
	bearing_seg = computeBearing(result.seg.lat1, result.seg.lon1, result.seg.lat2, result.seg.lon2);
	if (bearing_seg > 180) {
		bearing_seg -= 180;
	}
	
	//console.log('lat1 lon1 lat 2 lon2=, bearing=', lat1, lon1, lat2, lon2, bearing_line, bearing_seg)
	
	return {"bearing_line": bearing_line, "bearing_seg": bearing_seg};
}

var computeBearing = function(lat1, lon1, lat2, lon2) {

	lat1 = lat1 * Math.PI / 180.0;
    lon1 = lon1 * Math.PI / 180.0;
	lat2 = lat2 * Math.PI / 180.0;
    lon2 = lon2 * Math.PI / 180.0;
	
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	var brng = Math.atan2(y, x) * 180 / Math.PI;
	if (brng < 0) {
		brng += 360;
	}
	
	if (lat1 == lat2) {
		brng = 90;
	}
	
	return brng;

}

var createLine = function(lineOption) {

	var i, latlon, lat, lon, dist;
	var coordinates = "";
	for (i = 0; i < lineOption.distance; i++) {
		dist = i;
		latlon = getLatLonFromDist(lineOption.latStart, lineOption.lonStart, lineOption.azimuth, dist);
		lat = latlon[0];
		lon = latlon[1];
		
		coordinates += lon + " " + lat + ","
	}
	
	coordinates = coordinates.replace(/,$/, '');
	return coordinates;
}


var getZones = function(this_line, opposite_line) {
	var i, bearing_line, bearing_seg, value_west, value_east, inner_values, outer_values, distances;
		//console.log('this', JSON.stringify(this_line), 'oppo', JSON.stringify(opposite_line));
	
	distances = [];
	inner_values = [];
	outer_values = [];
	for (i = 0; i < this_line.result.length; i++) {
		distances.push(this_line.result[i].distance);
	
		var bearing_line = this_line.result[i].bearings.bearing_line;
		var bearing_seg = this_line.result[i].bearings.bearing_seg;
		var value_west = this_line.result[i].seg.value_west;
		var value_east = this_line.result[i].seg.value_east;
	
		//console.log(i, 'bearings==== ', bearing_line , ' -- ', bearing_seg, 'value_wst', value_west, 'value_east', value_east) ;
	
		if (bearing_seg < 90) {
			//west is on top of the line segment
			if (bearing_line >= bearing_seg && bearing_line <= bearing_seg + 180) {
				inner_values[i] = value_west;
				outer_values[i] = value_east;
			}
			else {
				inner_values[i] = value_east;
				outer_values[i] = value_west;
			}
		
		
		}
		else {
			//east is on top of line segment
			if (bearing_line >= bearing_seg && bearing_line <= bearing_seg + 180) {
				inner_values[i] = value_east;
				outer_values[i] = value_west;
			}
			else {
				inner_values[i] = value_west;
				outer_values[i] = value_east;
			}
		}
	
	}
	
	
		
	var zones = [];
	for (i = 0; i < this_line.result.length; i++) {
		zones.push({"conductivity": inner_values[i], "distance": Math.round(distances[i]*10)/10})
	}

	if (zones.length > 0) {
		zones.push({"conductivity": outer_values[this_line.result.length-1], "distance": this_line.lineOption.distance});
	}
	else {
		zones.push({"conductivity": 5000, "distance": this_line.lineOption.distance});
	}
	
	
	var ret = {"azimuth": this_line.lineOption.azimuth, "zones": zones}
		
	return ret;



}



var getConductivity = function(latStart, lonStart, nradial, distance, callback) {

var asyncTasks = [];
var lineOption, azimuth;
var i, ii, zones;
var delta = 360/nradial;
for (i = 0; i <nradial; i++) {
	azimuth = i * delta;
	lineOption = {"latStart": latStart, "lonStart": lonStart, "azimuth": azimuth, "distance": distance};
	asyncTasks.push(getLineConductivity(lineOption));
}

//console.log(asyncTasks);

async.parallel(asyncTasks, function(error, result){
	console.log("all done");
	
	//console.log(result)
	if (error) {
		callback(error, []);
	
	}
	else {
		var zones_all = [];
		for (i = 0; i < nradial; i++) {	
			ii = i + nradial/2;
			if (i >= nradial/2) {
				ii = i - nradial/2;
			}
	
			zones = getZones(result[i], result[ii]);
			
			zones_all.push(zones);
		}
		
		//console.log(zones_all);
		
		//in inputData, convert lat/;on to original value bu subtracting the 0.000001, which is added at the beginning
		//to prevent the radial from hitting the joining points of 2 conductivity segments.
		var inputData = {"lat": latStart - 0.000001, "lon": lonStart - 0.000001, "nradial": nradial, "distance": distance};

		callback(null, {"inputData": inputData, "conductivity": zones_all});
	
	}
});

}

var fetchConductivity = function(req, res) {

	var lat = req.query.lat;
	var lon = req.query.lon;
	var nradial = req.query.nradial;
	var distance = req.query.distance;
	
	if (lat == undefined) {
		console.log('lat missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'lat missing'
		});
		return;
	}
	
	if (lon == undefined) {
		console.log('lon missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'lon missing'
		});
		return;
	}
	if (nradial == undefined) {
		console.log('nradial missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'nradial missing'
		});
		return;
	}
	if (distance == undefined) {
		console.log('distance missing');
		res.status(400).send({
			'status': 'error',
			'statusCode':'400',
			'statusMessage': 'distance missing'
		});
		return;
	}
	
	if ( !lat.match(/^\d+\.\d*$/)) {
		console.log('invalid lat value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid lat value.'
		});
		return;
	}
	
	if ( !nradial.match(/^\d+$/)) {
		console.log('invalid nradial value');
		res.status(400).send({
		'status': 'error',
		'statusCode':'400',
		'statusMessage': 'Invalid nradial value.'
		});
		return;
	}
	
	//add a type value to lat/lon to make it a long decimal
	//so the line won't hit the end point of conductivity segments
	
	lat = parseFloat(lat);
	lon = parseFloat(lon);
	nradial = parseInt(nradial);
	distance = parseFloat(distance);
	
	var lat_use = lat + 0.000001;
	var lon_use = lon + 0.000001;
	
	console.log(lat, lon, lat_use, lon_use)
	
	
	getConductivity(lat_use, lon_use, nradial, distance, function(error, response) {
	if (error) {
	res.send({"error": error});
	}
	else {
	
	res.send(response);
	
	}

});
	


}


module.exports.getConductivity = getConductivity;
module.exports.fetchConductivity = fetchConductivity;












