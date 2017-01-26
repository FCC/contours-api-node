// **********************************************************

'use strict';

// **********************************************************

var conductivity = require('./conductivity.js');
var db_lms = require('./db_lms.js');
var db_contour = require('./db_contour.js');

var getAntListCDBS = function(callback) {

	var q = "SELECT ant_sys_id, application_id, lat_deg, lat_min, lat_sec, lat_dir, lon_deg, lon_min, lon_sec, lon_dir " +
			"FROM mass_media.gis_am_ant_sys WHERE lat_dir = 'N' and lon_dir = 'W' and am_dom_status in ('L', 'C') " +
			"and hours_operation in ('D', 'U') and application_id in " +
			"(SELECT b.application_id from mass_media.gis_facility a, mass_media.gis_am_eng_data b " +
			 "WHERE a.facility_id = b.facility_id  and b.am_dom_status in ('L', 'C') and a.fac_status = 'LICEN' order by a.facility_id )"
	//console.log(q)
			 
	db_lms.any(q)
	.then(function (data) {
		if (data.length == 0) {
			console.log('\n' + 'no valid record found');
			callback('no valid record found', null);
			return;
		}
		else {
			callback(null, data);
			return;
		}
		
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});

}

var getAntListContour = function(callback) {

	var q = "SELECT ant_sys_id, application_id, lat_deg, lat_min, lat_sec, lat_dir, lon_deg, lon_min, lon_sec, lon_dir " +
			"FROM contour.conductivity_batch ORDER BY ant_sys_id"
	//console.log(q)
			 
	db_contour.any(q)
	.then(function (data) {
		callback(null, data);
		return;
		
	})
	.catch(function (err) {
		console.log('\n' + err);
		callback(err, null);
	});

}





var getOneConductivity = function(aData, n, callback) {

	var lat_nad27 = getDecimalLatLon(aData[n].lat_deg, aData[n].lat_min, aData[n].lat_sec, aData[n].lat_dir);
	var lon_nad27 = getDecimalLatLon(aData[n].lon_deg, aData[n].lon_min, aData[n].lon_sec, aData[n].lon_dir);
	var q = "SELECT ST_AsGeoJson(ST_Transform(ST_GeomFromText('POINT(" + lon_nad27 + " " + lat_nad27 + ")', 4267),4326)) as latlon";
	console.log('\n' + 'NAD27 to WGS84 Query='+q);
	db_contour.any(q)
		.then(function (data) {
					
			var latlon84 = JSON.parse(data[0].latlon);
			console.log(latlon84);
			
			var lat_84 = latlon84.coordinates[1];
			var lon_84 = latlon84.coordinates[0];
			lat_84 = Math.floor(lat_84*1000000+0.5)/1000000;
			lon_84 = Math.floor(lon_84*1000000+0.5)/1000000;

			console.log('start getting conductivity at ' + lat_84 + ' ' + lon_84);
			
			conductivity.getConductivity(lat_84, lon_84, 360, 1200, function(error, result) {
			
				if (error) {
					callback(error, null);
					return;
				}
				else {
					console.log('getOneConductivity: done getting conductivity');
					//console.log(JSON.stringify(result));
					q = "DELETE FROM contour.conductivity_batch WHERE ant_sys_id = " +
					aData[n].ant_sys_id + " and application_id = " + aData[n].application_id  + ";";
				
					q += "INSERT INTO contour.conductivity_batch (" +
						"ant_sys_id, application_id, lat_deg, lat_min, lat_sec, lat_dir, " +
						"lon_deg, lon_min, lon_sec, lon_dir, conductivity, create_ts) " + 
						"VALUES (" + aData[n].ant_sys_id + ", " + aData[n].application_id + ", " +
						aData[n].lat_deg + ", " + aData[n].lat_min + ", " + aData[n].lat_sec + ", '" + aData[n].lat_dir + "', " +
						aData[n].lon_deg + ", " + aData[n].lon_min + ", " + aData[n].lon_sec + ", '" + aData[n].lon_dir + "', " +
						"'" + JSON.stringify(result) + "', now())";
						
					//console.log(q)
					
					db_contour.any(q)
					.then(function (data) {
						callback(null, "ok");
					})
					.catch(function (err) {
						console.log('\n' + err);
						callback(err, null);
						return;
					});		
				}
			});
			
		})
		.catch(function (err) {
			console.log('\n' + err);
			callback(err, null);
			return;
		});




}


function getDecimalLatLon(deg, min, sec, dir) {

	var value = parseFloat(deg) + parseFloat(min)/60.0 + parseFloat(sec)/3600.0;
	if (dir == 'W' || dir == 'S') {
		value = -1 * value;
		
	}
	
	return value;
}

var getCon = function(aData, n) {
	console.log('n=' + n);
	if (n < aData.length) {
		try {
			getOneConductivity(aData, n, function(error, response) {
				if (error) {
				console.log(error);
				}
				else {
				
				console.log(response);
				}
				getCon(aData, n+1);
				
			});
		
		}
		catch (e){
			console.log('\n' +e);
			getCon(aData, n+1);
		}
	}
	else {
		setTimeout(function() {
			startBatch();
		}, 180000);
		console.log('wait for 180 seconds...\n');
	}
}

var getNewAntList = function(antData, antDataCon) {
	var i, j;
	var isNew;
	var antDataNew = [];
	
	for (i = 0; i < antData.length; i++) {
		isNew = true;
		for (j = 0; j < antDataCon.length; j++) {
			if (antDataCon[j].ant_sys_id == antData[i].ant_sys_id) {
			if (antDataCon[j].application_id == antData[i].application_id) {
			if ( antDataCon[j].lat_deg == antData[i].lat_deg) {
			if ( antDataCon[j].lat_min == antData[i].lat_min) {
			if ( antDataCon[j].lat_sec == antData[i].lat_sec) {
			if ( antDataCon[j].lat_dir == antData[i].lat_dir) {
			if ( antDataCon[j].lon_deg == antData[i].lon_deg) {
			if ( antDataCon[j].lon_min == antData[i].lon_min) {
			if ( antDataCon[j].lon_sec == antData[i].lon_sec) {
			if ( antDataCon[j].lon_dir == antData[i].lon_dir) {
				isNew = false;
				break;
			}
			}
			}
			}
			}
			}
			}
			}
			}
			}
		}
		
		if (antData[i].lon_deg > 130 && antData[i].lon_dir == "W" && antData[i].lat_deg < 50 && antData[i].lat_dir == "N") {
			isNew = false;
		}
		
		if (isNew) {
			antDataNew.push(antData[i]);
		}
	
	}
	
	//console.log('number of antenna from CDBS = ' + antData.length);
	//console.log('\nnumber of antenna in Contour = ' + antDataCon.length);
	console.log('\nnew antenna to process = ' + antDataNew.length);
	return antDataNew;

}






var startBatch = function() {
console.log('== start conductivity batch job: ' + (new Date()).toString()  );

	getAntListCDBS(function(error, antData) {
		if (error) {
		
			setTimeout(function() {
				startBatch();
			}, 180000);
			console.log('wait for 180 seconds...\n');
		}
		else {
			
			getAntListContour(function(error, antDataCon) {
				if (error) {
					setTimeout(function() {
						startBatch();
					}, 180000);
					console.log('wait for 180 seconds...\n');
				}
				else {
					var antDataNew = getNewAntList(antData, antDataCon);
					if (antDataNew.length > 0) {
						getCon(antDataNew, 0);
					}
					else {
						setTimeout(function() {
							startBatch();
						}, 180000);
						console.log('0, wait for 180 seconds... ' + (new Date()).toString());
					}
				
				}
			
			});
			
		}


});




}

//startBatch();

module.exports.startBatch = startBatch;