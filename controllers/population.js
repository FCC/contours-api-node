
// **********************************************************

'use strict';

// **********************************************************
var dotenv = require('dotenv').load();
var CONTOURS_PG = process.env.CONTOURS_PG;
var CONTOURS_SCHEMA = process.env.CONTOURS_SCHEMA;

var db = require('./db_contour.js');

var getPopulation = function(geom, callback) { // geom is a geojson string
	console.log("============== Population API ===============");

	var i, j;

	getStateList(db, geom, function(error, response) {
		if (error) {
			callback(error, {"population": null});
		}
		else {
			var fullStateList = response.fullStateList;
			var partialStateList = response.partialStateList;
			
			//console.log(fullStateList, partialStateList);
			
			getCountyList(db, geom, partialStateList, function(error, response) {
				if (error) {
					callback(error, {"population": null});
				}
				else {
					var fullCountyList = response.fullCountyList;
					var partialCountyList = response.partialCountyList;
					//console.log(fullCountyList, partialCountyList);
					
					getTractList(db, geom, partialCountyList, function(error, response) {
						if (error) {
							callback(error, {"population": null});
						}
						else {
						
							var fullTractList = response.fullTractList;
							var partialTractList = response.partialTractList;
							
							//console.log(fullTractList, partialTractList);
							
							getPartialTractPopulation(db, geom, partialTractList, function(error, response) {
								if (error) {
									callback(error, {"population": null});
								}
								else {
									var partialTractPopulation = response.population;
									console.log("partialTractPopulation", partialTractPopulation);
									
									getFullTractPopulation(db, fullTractList, function(error, response) {
										if (error) {
											callback(error, {"population": null});
										}
										else {
											var fullTractPopulation = response.population;
											console.log("fullTractPopulation", fullTractPopulation);
											
											getFullCountyPopulation(db, fullCountyList, function(error, response) {
												if (error) {
													callback(error, {"population": null});
												}
												else {
													var fullCountyPopulation = response.population;
													console.log("fullCountyPopulation", fullCountyPopulation);
													
													getFullStatePopulation(db, fullStateList, function(error, response) {
														if (error) {
															callback(error, {"population": null});
														}
														else {
															var fullStatePopulation = response.population;
															console.log("fullStatePopulation", fullStatePopulation);
															
															var totalPopulation = partialTractPopulation +
																					fullTractPopulation +
																					fullCountyPopulation +
																					fullStatePopulation;
																					
															callback(null, {"population": totalPopulation});
															
														}
													});
												}
											});	
										}
									});
								}
							});
						}

					});
				}
			});	
		}
	});

}

var getStateList = function(db, geom, callback) {
	var i;

	var q = "SELECT id, ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as intersect, " +
			"ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as contain " +
			"FROM " + CONTOURS_SCHEMA + ".state_2010 ORDER BY id";
	db.any(q)
		.then(function (data) {	
			var fullStateList = [];
			var partialStateList = [];
			for (i = 0; i < data.length; i++) {
				if (data[i].contain) {
					fullStateList.push(data[i].id);
				}
				else if (data[i].intersect) {
					partialStateList.push(data[i].id);
				}
			}
			callback(null, {"fullStateList": fullStateList, "partialStateList": partialStateList});
		})
		.catch(function (err) {
			callback(err, {"fullStateList": [], "partialStateList": []});
		});

}


var getCountyList = function(db, geom, partialStateList, callback) {
	var i;
			
	var q = "SELECT id, ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as intersect, " +
		"ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as contain " +
		"FROM " + CONTOURS_SCHEMA + ".county_2010 WHERE state_id in " + 
		JSON.stringify(partialStateList).replace('[', '(').replace(']', ')').replace(/"/g, "'") + " ORDER BY id";
		
	db.any(q)
		.then(function (data) {
		
			var fullCountyList = [];
			var partialCountyList = [];
			for (i = 0; i < data.length; i++) {
				if (data[i].contain) {
					fullCountyList.push(data[i].id);
				}
				else if (data[i].intersect) {
					partialCountyList.push(data[i].id);
				}
			}
			callback(null, {"fullCountyList": fullCountyList, "partialCountyList": partialCountyList});
			
		})
		.catch(function (err) {
			callback(err, {"fullCountyList": [], "partialCountyList": []});
		});

}

var getTractList = function(db, geom, partialCountyList, callback) {
	var i;
			
	var q = "SELECT tract_fips, ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as intersect, " +
		"ST_Contains(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom) as contain " +
		"FROM " + CONTOURS_SCHEMA + ".tract_2010 WHERE county_fips in " + 
		JSON.stringify(partialCountyList).replace('[', '(').replace(']', ')').replace(/"/g, "'") + " ORDER BY tract_fips";
		
	db.any(q)
		.then(function (data) {
			var fullTractList = [];
			var partialTractList = [];
			for (i = 0; i < data.length; i++) {
				if (data[i].contain) {
					fullTractList.push(data[i].tract_fips);
				}
				else if (data[i].intersect) {
					partialTractList.push(data[i].tract_fips);
				}
			}
			partialTractList.splice(1,1);
			
			callback(null, {"fullTractList": fullTractList, "partialTractList": partialTractList});
			
		})
		.catch(function (err) {
			callback(err, {"fullTractList": [], "partialTractList": []});
		});

}


var getPartialTractPopulation = function(db, geom, partialTractList, callback) {
	var i;
	
	if (partialTractList.length == 0) {
		callback(null, {"population": 0});
		return;
	}
	
	var q = "SELECT sum(pop_2010) FROM " + CONTOURS_SCHEMA + ".block_2010 " +
			"WHERE tract_fips in " + 
			JSON.stringify(partialTractList).replace('[', '(').replace(']', ')').replace(/"/g, "'") +
			" AND pop_2010 > 0 AND ST_Intersects(ST_SetSRID(ST_GeomFromGeoJSON('" + geom + "'), 4326), geom)";
		
	db.any(q)
		.then(function (data) {
			var population = 0;
			if (data.length > 0) {
				population = parseInt(data[0].sum);
			}
			callback(null, {"population": population});
			
		})
		.catch(function (err) {
			callback(err, {"population": null});
		});
}

var getFullTractPopulation = function(db, fullTractList, callback) {
	var i;
	
	if (fullTractList.length == 0) {
		callback(null, {"population": 0});
		return;
	}
			
	var q = "SELECT sum(pop_2010) FROM " + CONTOURS_SCHEMA + ".tract_pop_2010 WHERE fips in " + 
			JSON.stringify(fullTractList).replace('[', '(').replace(']', ')').replace(/"/g, "'");
		
	db.any(q)
		.then(function (data) {
			var population = 0;
			if (data.length > 0) {
				population = parseInt(data[0].sum);
			}
			callback(null, {"population": population});
			
		})
		.catch(function (err) {
			callback(err, {"population": null});
		});
}

var getFullCountyPopulation = function(db, fullCountyList, callback) {
	var i;
	
	if (fullCountyList.length == 0) {
		callback(null, {"population": 0});
		return;
	}
			
	var q = "SELECT sum(pop_2010) FROM " + CONTOURS_SCHEMA + ".county_pop_2010 WHERE fips in " + 
			JSON.stringify(fullCountyList).replace('[', '(').replace(']', ')').replace(/"/g, "'");
		
	db.any(q)
		.then(function (data) {
			var population = 0;
			if (data.length > 0) {
				population = parseInt(data[0].sum);
			}
			callback(null, {"population": population});
			
		})
		.catch(function (err) {
			callback(err, {"population": null});
		});
}


var getFullStatePopulation = function(db, fullStateList, callback) {

	if (fullStateList.length == 0) {
		callback(null, {"population": 0});
		return;
	}

	if (fullStateList.length > 0) {
		var q = "SELECT sum(pop_2010) FROM " + CONTOURS_SCHEMA + ".state_pop_2010 WHERE fips in " +
			JSON.stringify(fullStateList).replace('[', '(').replace(']', ')').replace(/"/g, "'");
		
		db.any(q)
		.then(function (data) {
			var population = 0;
			if (data.length > 0) {
				population = parseInt(data[0].sum);
			}
			callback(null, {"population": population});
			return;
		})
		.catch(function (err) {
			callback(err, {"population": 0});
			return;
		});		
	}
	else {
		callback(null, {"population": 0});
	}
}


module.exports.getPopulation = getPopulation;
