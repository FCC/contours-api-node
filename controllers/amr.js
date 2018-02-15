var dotenv = require('dotenv').load();
var NODE_ENV = process.env.NODE_ENV;
var NODE_PORT =  process.env.PORT;
var host =  process.env.HOST;
var geo_host =  process.env.GEO_HOST;
var geo_space = process.env.GEO_SPACE;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;
var db_contour = require('./db_contour.js');

var CONTEXT_PATH = process.env.CONTEXT_PATH || 'api/contours/';
if (NODE_ENV == 'DEV' || NODE_ENV == 'LOCAL') {
	var CONTEXT_PATH = '';
}

//var PG_DB = process.env.CONTOURS_PG;
//var pg_schema = process.env.CONTOURS_SCHEMA;

//db
//var pg_query = require('pg-query');
//pg_query.connectionParameters = PG_DB;



var http = require('http');
var https = require('https');
var async = require('async');

var protocol = http;
if (geo_host.toLowerCase().match(/https/)) {
	protocol = https;
}

function amrProcess(req, res) {

	try {
	
		var lat = req.params.lat;
		var lon = req.params.lon;

	    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
	        console.log('error: invalid lat/lon');
	        res.send({
	            'status': 'error',
				'msg': 'invalid lat/lon'
	        });
	        return;
		}
		
		
		lon = parseFloat(lon);
		lat = parseFloat(lat);

	    var q = "SELECT ST_Intersects(geom, ST_Setsrid(ST_Makepoint(" +
				"$2" + "," + "$1" + "), 4326)) FROM " + CONTOURS_SCHEMA + ".amr_country_border WHERE iso = 'USA'";
		var vals = [lat, lon];
		
		db_contour.any(q,vals)
		.then(function(data_rows) {
			var insideUs = data_rows[0].st_intersects;

			if(insideUs){
				var url = "http://ned.usgs.gov/epqs/pqs.php?x=" + lon + "&y=" + lat + "&units=Meters&output=json";
	            http.get(url, function(res1) {
	                var data = "";
	                res1.on('data', function(chunk) {
	                    data += chunk;
	                });
	                res1.on("end", function() {
	                	console.log('Returned from http://ned.usgs.gov');
	                    processElevation(data,lon,lat,insideUs,res);
	                });
	            }).on("error", function() {
	                console.log('error accessing ' + url);
	                res.send({
	                    'status': 'error',
						'msg': 'error accessing usgs site'
	                });
	            });

			}
			else{

				var entry = {
	                "location": {
	                    "latlng": {
	                        "lat": lat,
	                        "lng": lon
	                    	},
	                    "isInsideUs": insideUs
	                	}
	            };
			
				res.send(entry);

			}

		})
		.catch(function(error) {
			console.error('error running query', error);
			res.send({
				'status': 'error',
				'msg': 'error running query US intersection'
					});

		});
		}
		catch (e) {
			console.error('Exception in amrProcess:'+e);
		}

		/*
		pg_query(q, vals, function(pg_err, pg_rows, pg_res){
			if (pg_err){
			console.error('error running pg_query', pg_err);
			res.send({
				'status': 'error',
				'msg': 'error running pg_query US intersection'
			});
			}
			else {
				var insideUs = pg_rows[0].st_intersects;
				
	        if (insideUs) {

	            var url = "http://ned.usgs.gov/epqs/pqs.php?x=" + lon + "&y=" + lat + "&units=Meters&output=json";
	            http.get(url, function(res1) {
	                var data = "";
	                res1.on('data', function(chunk) {
	                    data += chunk;
	                });
	                res1.on("end", function() {
	                	console.log('Returned from http://ned.usgs.gov');
	                    processElevation(data);
	                });
	            }).on("error", function() {
	                console.log('error accessing ' + url);
	                res.send({
	                    'status': 'error',
						'msg': 'error accessing usgs site'
	                });
	            });

	        } else {
	            var entry = {
	                "location": {
	                    "latlng": {
	                        "lat": lat,
	                        "lng": lon
	                    },
	                    "isInsideUs": insideUs
	                }
	            };
	            res.send(entry);
	        }
		}
	    });
		}
	catch (e) {
		console.error('Exception in amrProcess:'+e);
		}
		*/
}

//#############################################
function processElevation(data,lon,lat,insideUs,res) {
					
	var data = JSON.parse(data);
	var Elevation_Query = data.USGS_Elevation_Point_Query_Service;
	var elevation = Elevation_Query.Elevation_Query.Elevation;
	var rcamsl = parseFloat(elevation) + 10; //antenna height
	rcamsl = Math.round(rcamsl * 10) / 10;

	var lat1 = Math.abs(lat);
	var dlat = Math.floor(lat1);
	var mlat = Math.floor((lat1 - dlat) * 60);
	var slat = Math.round(Math.round((lat1 - (dlat + mlat / 60.0)) * 3600));
	if (slat == 60) {
		slat = 0;
		mlat++;
	}
	if (mlat == 60) {
		mlat = 0;
		dlat++;
	}
	ns = 1
	if (lat < 0) {
		ns = -1
	}
	var lon1 = Math.abs(lon);
	var dlon = Math.floor(lon1);
	var mlon = Math.floor((lon1 - dlon) * 60);
	var slon = Math.round(Math.round((lon1 - (dlon + mlon / 60.0)) * 3600));
	if (slon == 60) {
		slon = 0;
		mlon++;
	}
	if (mlon == 60) {
		mlon = 0;
		dlon++;
	}
	ew = 1
	if (lon < 0) {
		ew = -1
	}

	var url = "http://transition.fcc.gov/fcc-bin/haat_calculator?dlat=" + 
			dlat + "&mlat=" + mlat + "&slat=" + slat + "&ns=" + ns + "&dlon=" + 
			dlon + "&mlon=" + mlon + "&slon=" + slon + "&ew=" + ew + "&nad=83&rcamsl=" + 
			rcamsl + "&nradials=360&terdb=0&text=1";
	
	console.log('getting HAAT')

	http.get(url, function(res1) {
		var data = "";
		res1.on('data', function(chunk) {
			data += chunk;
		});
		res1.on("end", function() {
			console.log('HAAT returned');		
			processHaat(data,lon,lat,insideUs,res);
		});
	}).on("error", function() {
		console.log('error accessing ' + url);
		res.send({
			'status': 'error',
			'msg': 'error accessing transition site'
		});
	});
}

function processHaat(data,lon,lat,insideUs,res) {
	var haatData = data;
	//read haat-dist look up table
	var fs = require('fs');
	var file = "data/ht.json";
	fs.readFile(file, 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		processHaat2(haatData,data,lon,lat,insideUs,res);
	});
}

function processHaat2(haatData,ht_str,lon,lat,insideUs,res) {
	console.log('Processing HAAT');

	var ht_json = JSON.parse(ht_str);
	
	var data_arr = haatData.split("\n");
	var i, j, az, dum, dum1, key0, dist, latlon, lat0, lon0;
	var haat = [];
	for (i = 0; i < data_arr.length; i++) {
		dum = data_arr[i].split("|");
		if (dum.length == 4) {
			dum1 = Math.round(parseFloat(dum[2].replace(/ +/g, "")));
			if (dum1 < 30) {
				dum1 = 30;
			}
			if (dum1 > 1500) {
				dum1 = 1500;
			}
			haat.push(dum1);
		}
	}

	var uuid = require('uuid');
	var uuid0 = uuid.v4();
	var dbus = [34, 37, 40, 48, 51, 54, 94, 97, 100]
	var row_str = "";
	for (i = 0; i < 9; i++) {
		if (dbus[i] <= 54) {
			var point_str = "";
			var polygon_str = "";
			for (az = 0; az < haat.length; az++) {
				key0 = dbus[i] + ":" + haat[az];
				dist = ht_json[key0];
				latlon = getLatLonPoint(lat, lon, az, dist);
				var lat0 = Math.round(latlon[0] * 1000000) / 1000000;
				var lon0 = Math.round(latlon[1] * 1000000) / 1000000;
				point_str = lon0 + " " + lat0;
				if (az == 0) {
					point_str_first = point_str;
				}
				polygon_str += point_str + ",";
			}
			polygon_str += point_str_first
			multipolygon_str = "MULTIPOLYGON(((" + polygon_str + ")))";

			row_str += "('" + uuid0 + "'," + "$1" + "," + "$2" + "," + dbus[i] + "," + 
						"ST_GeomFromText('" + multipolygon_str + "', 4326), now())" + ", ";
									
		} else {
			if (dbus[i] == 94) {
				var radius = 440;
			} else if (dbus[i] == 97) {
				var radius = 310;
			} else if (dbus[i] == 100) {
				var radius = 220;
			}

			row_str += "('" + uuid0 + "'," + lat + "," + lon + "," + dbus[i] + "," + 
			"ST_Buffer(ST_MakePoint(" + "$2" + "," + "$1" + ")::geography, " + radius + ")::geometry, now()), ";

		}
	}

	row_str = row_str.replace(/, +$/, "");

	//insert_rows
	var q = "INSERT INTO " + CONTOURS_SCHEMA + ".amr_interfering_contours (uuid, lat, lon ,dbu, geom, create_ts) VALUES " + row_str;
	var vals = [lat, lon];


	/*pg_query(q, vals, function(pg_err, pg_rows, pg_res){
		if (pg_err){
		console.error('error running pg_query', pg_err);
		return res.send({
			'status': 'error',
			'msg': 'error inserting contours'
		});
		}
		else {
	*/
	db_contour.none(q,vals)
	.then(function(){
			console.log('Interferring contours created');

			var asyncTasks = [];
			var data_co_usa = [];
			var data_1_usa = [];
			var data_23_usa = [];
			var intersectsCanada = false;
			var intersectsMexico = false;
			var intersectsCaribbean = false;
			var data_co_mex = [];
			var data_1_mex = [];
			var data_23_mex = [];

			//co-channel usa
			asyncTasks.push(function(callback) {
				var q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FL', 'FX') and a.class in ('A', 'C', 'C0', 'C1', 'C2', 'C3', 'D', 'L1') and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 40 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FL', 'FX') and a.class = 'B1' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 37 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FL', 'FX') and a.class = 'B' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 34 and ST_Intersects(a.geom, b.geom)";

				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
						data_co_usa = data_rows;
						callback();
					})
				.catch(function(error){
						console.error('error running query', error);
						callback();
					});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_co_usa = pg_rows;
					callback();
					}
				
				});
				*/
				
			});

			//first-adjacent usa
			asyncTasks.push(function(callback) {
				q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FL', 'FX') and a.class in ('A', 'C', 'C0', 'C1', 'C2', 'C3', 'D', 'L1') and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 54 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FL', 'FX') and a.class = 'B1' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 51 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FL', 'FX') and a.class = 'B' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 48 and ST_Intersects(a.geom, b.geom)";
				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
						data_1_usa = data_rows;
						callback();
					})
				.catch(function(error){
						console.error('error running query', error);
						callback();
					});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_1_usa = pg_rows;
					callback();
					}
				});
				*/
			
			});

			//2nd/3rd-adjacent usa
			asyncTasks.push(function(callback) {
				q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FL', 'FX') and a.class in ('A', 'C', 'C0', 'C1', 'C2', 'C3', 'D', 'L1') and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 100 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FL', 'FX') and a.class = 'B1' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 97 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FL', 'FX') and a.class = 'B' and a.country = 'US' and b.uuid = '" + uuid0 + "' and b.dbu = 94 and ST_Intersects(a.geom, b.geom)";
				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
						data_23_usa = data_rows;
						callback();
					})
				.catch(function(error){
						console.error('error running query', error);
						callback();
					});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_23_usa = pg_rows;
					callback();
					}
				});
				*/
			
			});

			//34dBu intersects with Canada?
			asyncTasks.push(function(callback) {
				q = "SELECT true as intersects FROM " + CONTOURS_SCHEMA + ".amr_canada_border a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
					WHERE b.uuid = '" + uuid0 + "' and b.dbu = 34 and ST_Intersects(a.geom, b.geom) is true";
				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
						if (data_rows.length > 0) {
							intersectsCanada = true;
						}
						callback();
				})
				.catch(function(error){
						console.error('error running query', error);
						callback();
					});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
						if (pg_rows.length > 0) {
							intersectsCanada = true;
						}
					callback();
					}
				});
				*/
				
			});

			//130km from MEX
			asyncTasks.push(function(callback) {
				var q = "WITH tmp_table as \
					(SELECT ST_Buffer(st_makepoint(" + "$2" + "," + "$1" + ")::geography, 130000)::geometry as geom1) \
					SELECT true as intersects FROM " + CONTOURS_SCHEMA + ".amr_mexico_border a, tmp_table b where st_intersects(a.geom, b.geom1) is True"
				var vals = [lat, lon];

				db_contour.any(q,vals)
				.then(function(data_rows){
					if (data_rows.length > 0) {
						intersectsMexico = true;
					}
					callback();
				})
				.catch(function(error){
					console.error('error running query', error);
					callback();
				});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
						if (pg_rows.length > 0) {
							intersectsMexico = true;
						}
					callback();
					}
				});
				*/
			
			});

			//is caribbean
			asyncTasks.push(function(callback) {
				var q = "SELECT true as intersects FROM " + CONTOURS_SCHEMA + 
						".amr_state_2010 WHERE id in ('PR', 'VI') and ST_Intersects(geom, ST_Setsrid(ST_Makepoint(" +
						"$2" + "," + "$1" + "), 4326))"
				var vals = [lat, lon];
				
				db_contour.any(q,vals)
				.then(function(data_rows){
					if (data_rows.length > 0) {
						intersectsCaribbean = true;
					}
					callback();
				})
				.catch(function(error){
					console.error('error running query', error);
					callback();
				});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
						if (pg_rows.length > 0) {
							intersectsCaribbean = true;
						}
					callback();
					}
				});
				*/		
			});

			//co-channel Mexico
			asyncTasks.push(function(callback) {
				var q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FA', 'FR') and a.class in ('A', 'AA', 'C1', 'C', 'D') and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 40 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FA', 'FR') and a.class = 'B1' and a.country = 'MX'  and b.uuid = '" + uuid0 + "' and b.dbu = 37 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 220 and a.service in ('FM', 'FA', 'FR') and a.class = 'B' and a.country = 'MX'  and b.uuid = '" + uuid0 + "' and b.dbu = 34 and ST_Intersects(a.geom, b.geom)";
				var vals = [];
				
				db_contour.any(q)
				.then(function(data_rows){
					data_co_mex = data_rows;
					callback();
				})
				.catch(function(error){
					console.error('error running query', error);
					callback();
				});

				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_co_mex = pg_rows;
					callback();
					}
				});
				*/

			});

			//first-adjacent mex
			asyncTasks.push(function(callback) {
				var q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FA', 'FR') and a.class in ('A', 'AA','C1', 'C', 'D') and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 54 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FA', 'FR') and a.class = 'B1' and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 51 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 219 and a.service in ('FM', 'FA', 'FR') and a.class = 'B' and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 48 and ST_Intersects(a.geom, b.geom)";
				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
					data_1_mex = data_rows;
					callback();
				})
				.catch(function(error){
					console.error('error running query', error);
					callback();
				});
				
				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_1_mex = pg_rows;
					callback();
					}
				});
				*/

			});

			//2nd/3rd-adjacent mex
			asyncTasks.push(function(callback) {
				q = "SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FA', 'FR') and a.class in ('A', 'AA', 'C1', 'C', 'D') and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 100 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FA', 'FR') and a.class = 'B1' and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 97 and ST_Intersects(a.geom, b.geom) \
				union \
				SELECT a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel, a.station_lat, a.station_lon, a.uuid, ST_Area(ST_Intersection(a.geom, b.geom)::geography)/1000000 as area, ST_Area(b.geom::geography)/1000000 as area1 \
				FROM " + CONTOURS_SCHEMA + ".fm_contours a, " + CONTOURS_SCHEMA + ".amr_interfering_contours b \
				WHERE a.channel > 217 and a.service in ('FM', 'FA', 'FR') and a.class = 'B' and a.country = 'MX' and b.uuid = '" + uuid0 + "' and b.dbu = 94 and ST_Intersects(a.geom, b.geom)";
				var vals = [];

				db_contour.any(q)
				.then(function(data_rows){
					data_23_mex = data_rows;
					callback();
				})
				.catch(function(error){
					console.error('error running query', error);
					callback();
				});

				/*
				pg_query(q, vals, function(pg_err, pg_rows, pg_res){
					if (pg_err){
					console.error('error running pg_query', pg_err);
					callback();
					}
					else {
					data_23_mex = pg_rows;
					callback();
					}
				});
				*/
			});

			async.parallel(asyncTasks, function() {

				var location = {
					"latlng": {
						"lat": lat,
						"lng": lon
					},
					"isInsideUs": insideUs
				};
				var entry = {
					"uuid": uuid0,
					"data_co_usa": data_co_usa,
					"data_1_usa": data_1_usa,
					"data_23_usa": data_23_usa,
					"data_co_mex": data_co_mex,
					"data_1_mex": data_1_mex,
					"data_23_mex": data_23_mex,
					"location": location,
					"intersectsCanada": intersectsCanada,
					"intersectsMexico": intersectsMexico,
					"intersectsCaribbean": intersectsCaribbean
				};
				res.send(entry);

			});
		})
	.catch(function(error){
		console.error('error running query', error);
		return res.send({
			'status': 'error',
			'msg': 'error inserting contours'
			});
		});
	
}
//#############################################

function getLatLonPoint(lat1, lon1, az, d) {
    lat1 = lat1 * Math.PI / 180.0;
    lon1 = lon1 * Math.PI / 180.0;
    az = az * Math.PI / 180.0;

    var R = 6371.0;
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(az));
    var lon2 = lon1 + Math.atan2(Math.sin(az) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

    lat2 = lat2 * 180 / Math.PI;
    lon2 = lon2 * 180 / Math.PI;

    return [lat2, lon2]
}

function interferingContours(req, res) {
    var uuid = req.params.id;
    var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + 
			geo_space + ":amr_interfering_contours&maxFeatures=50&outputFormat=json&sortBy=dbu&cql_filter=uuid='" + uuid + "'";
		
	console.log(url);
		
    protocol.get(url, function(res1) {
        var data = "";
        res1.on('data', function(chunk) {
            data += chunk;
        });
        res1.on("end", function() {
            res.send(data);
        });
    }).on("error", function() {
        res.send({
			'status': 'error',
			'msg': 'error selecting interfering contours'
		});
    });
}

function fmContours(req, res) {

    var uuid = req.params.id;
    //var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + geo_space + ":fm_contours&maxFeatures=50&outputFormat=json&sortBy=area+D&cql_filter=facility_id=" + facility_id + "+AND+filenumber='" + filenumber + "'+AND+class='" + class0 + "'+AND+station_lat=" + station_lat + "+AND+station_lon=" + station_lon + "+AND+service+IN+('FM','FL','FX', 'FA', 'FR')";
    var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + geo_space + ":fm_contours&maxFeatures=50&outputFormat=json&sortBy=area+D&cql_filter=uuid='" + uuid + "'";
	
    protocol.get(url, function(res1) {
        var data = "";
        res1.on('data', function(chunk) {
            data += chunk;
        });
        res1.on("end", function() {
            res.send(data);
        });
    }).on("error", function() {
        res.send({
			'status': 'error',
			'msg': 'error getting FM contours'
		});
	});
}

function amContour(req, res) {

	try {

	    var callsign = req.params.callsign;

	    var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" +
	        geo_space + ":am_contours&maxFeatures=50&outputFormat=json&cql_filter=callsign='" +
	        callsign + "'+AND+((class='A'+AND+contour_level=2)+OR+(class IN ('B','C','D')+AND+contour_level=2))";

	    protocol.get(url, function(res1) {
	        var data = "";
	        res1.on('data', function(chunk) {
	            data += chunk;
	        });
	        res1.on("end", function() {
	            res.send(data);
	        });
	    }).on("error", function() {
	        console.log('error accessing ' + url);
			res.send({
				'status': 'error',
				'msg': 'error selecting AM contours'
			});
	    });
	}
	catch (e) {
		console.error('Exception in amContour:'+e);
	}
}

function fmForAvailableChannel(req, res) {

	try {
	    var channel = parseInt(req.params.channel);
	    var uuid0 = req.params.uuid0;

	    var ch1 = channel - 3;
	    if (ch1 < 218) {
	        ch1 = 218;
	    }
	    var ch2 = channel + 3;
	    if (ch1 > 300) {
	        ch1 = 300;
	    }

		// the below comments were used for the old code using pg-query module
	    //var pg = require('pg');
	    //var client = new pg.Client(PG_DB);
	    //client.connect();

	    var q = "WITH tmp_table as \
			(SELECT ST_Buffer(geom::geography, 50000)::geometry as geom1 \
			FROM " + CONTOURS_SCHEMA + ".amr_interfering_contours WHERE uuid = '" + uuid0 + "' and dbu = 34) \
			SELECT a.uuid, a.callsign, a.filenumber, a.facility_id, a.service, a.class, a.channel \
			FROM " + CONTOURS_SCHEMA + ".fm_contours a, tmp_table b \
			WHERE a.channel >= " + ch1 + " and a.channel <= " + ch2 + " and a.service in ('FM', 'FL', 'FX', 'FA', 'FR')  and ST_Intersects(a.geom, b.geom1) \
			ORDER BY channel";
		var vals = [];

		// the old code uses pg-query module is commented out.
		// pg-query module relies on pg module.
		// I updated pg module version because another 
		// newer module called pg-promise relies on pg.
		// the updated pg version was made to automatically drop db connections.
		// the new code "db_contour.any.then.catch" is the pg-promise style.
		db_contour.any(q)
        .then(function(data_rows) {
	        if (data_rows.length == 0) {
	            res.send({
	                "features": []
	            });
			} 
			else {

	            var uuid_tuple = "";
	            for (var i = 0; i < data_rows.length; i++) {
	                uuid_tuple += "'" + data_rows[i].uuid + "',";
	            }
	            uuid_tuple = "(" + uuid_tuple.replace(/,$/, "") + ")";

	            var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + 
						geo_space + ":fm_contours&maxFeatures=500&outputFormat=json&sortBy=area+D&cql_filter=uuid+IN+" + uuid_tuple;
	            protocol.get(url, function(res1) {
	                var data = "";
	                res1.on('data', function(chunk) {
	                    data += chunk;
	                });
	                res1.on("end", function() {
	                    res.send(data);
	                });
	            }).on("error", function() {
	                console.log('error');
					res.send({
						'status': 'error',
						'msg': 'error getting FM contours'
					});
	            });

	        }
				
		})
		.catch(function(error) {
			console.error('error running query', error);
		});
		
		/*
		pg_query(q, vals, function(pg_err, pg_rows, pg_res){
			if (pg_err){
				console.error('error running pg_query', pg_err);
			}
			else {
			var data = pg_rows;
	        if (data.length == 0) {
	            res.send({
	                "features": []
	            });
	        } else {

	            var uuid_tuple = "";
	            for (var i = 0; i < data.length; i++) {
	                uuid_tuple += "'" + data[i].uuid + "',";
	            }
	            uuid_tuple = "(" + uuid_tuple.replace(/,$/, "") + ")";

	            var url = geo_host + "/" + geo_space + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + 
							geo_space + ":fm_contours&maxFeatures=500&outputFormat=json&sortBy=area+D&cql_filter=uuid+IN+" + uuid_tuple;
	            protocol.get(url, function(res1) {
	                var data = "";
	                res1.on('data', function(chunk) {
	                    data += chunk;
	                });
	                res1.on("end", function() {
	                    res.send(data);
	                });
	            }).on("error", function() {
	                console.log('error');
					res.send({
						'status': 'error',
						'msg': 'error getting FM contours'
					});
	            });

	        }

		}
		});
		*/
	}
	catch (e) {
		console.error('Exception in fmForAvailableChannel:'+e);
	}

}

function allAMCallsignList(req, res) {

	try {
		var q = "SELECT distinct callsign FROM " + CONTOURS_SCHEMA + ".am_contours ORDER BY callsign";
		var vals = [];
		
		// the old code uses pg-query module is commented out.
		// pg-query module relies on pg module.
		// I updated pg module version because another 
		// newer module called pg-promise relies on pg.
		// the updated pg version was made to automatically drop db connections.
		// the new code "db_contour.any.then.catch" is the pg-promise style.
		db_contour.any(q)
        .then(function(data_rows) {
				var callsign_list = [];
				for (var i = 0; i < data_rows.length; i++) {
					callsign_list.push(data_rows[i].callsign);
				}
				res.send(callsign_list);
		})
		.catch(function(error) {
			console.error('error running query', error);
			res.send({
				'status': 'error',
				'msg': 'error getting AM call sign lists'
			});
		});
		
		
		/*		
		pg_query(q, vals, function(pg_err, pg_rows, pg_res){
			if (pg_err){
				console.error('error running pg_query', pg_err);
				res.send({
					'status': 'error',
					'msg': 'error getting AM call sign lists'
				});
			}
			else {
				var data = pg_rows;
				var callsign_list = [];
				for (var i = 0; i < data.length; i++) {
					callsign_list.push(data[i].callsign);
				}
				res.send(callsign_list);
			}
		});
		*/
	}
	catch(e) {
		console.error('Exception in allAMCallsignList: '+e);
	}
}


module.exports.amrProcess = amrProcess;
module.exports.interferingContours = interferingContours;
module.exports.fmContours = fmContours;
module.exports.amContour = amContour;
module.exports.fmForAvailableChannel = fmForAvailableChannel;
module.exports.allAMCallsignList = allAMCallsignList;