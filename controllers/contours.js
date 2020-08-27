// **********************************************************

'use strict';

// **********************************************************

var NODE_PORT = process.env.PORT;

var GeoJSON = require('geojson');
var math = require('mathjs');

var haat = require('./haat.js');
var tvfm_curves = require('./tvfm_curves.js');
var area = require('./area.js');
var population = require('./population.js');
var validate = require('./validate.js');
var conductivity = require('./conductivity');
var gwave = require('./gwave');
var db_contour = require('./db_contour');
var amPattern = require('./amPattern');


function getContours(req, res, callback) {
    var dataObj = {};
    dataObj['status'] = 'error';
    dataObj['statusCode'] = '400';
    dataObj['statusMessage'] = '';
    GeoJSON.defaults = {Point: ['lat', 'lon'], include: ['status', 'statusCode', 'statusMessage']};
    var returnJson;

    try {
        console.log('\n================== start contours process ==============');
        console.log(new Date());

        var startTime, endTime;

        startTime = new Date().getTime();

        var src = req.query.src;
        var lat = req.query.lat;
        var lon = req.query.lon;
        var rcamsl = req.query.rcamsl;
        var nradial = req.query.nradial;
        var unit = req.query.unit;
        var erp = req.query.erp;
        //var curve_type = req.query.curve_type;

        var field = req.query.field;
        var channel = req.query.channel;
        var curve = req.query.curve;
        var serviceType = req.query.serviceType;

        var pattern = req.query.pattern;
        if (pattern) {
            pattern = decodeURIComponent(pattern);
        } else {
            pattern = undefined;
        }
        var ant_rotation = req.query.ant_rotation;

        var pop = req.query.pop;
        var areaFlag = req.query.area;

        if (serviceType === undefined) {
            console.log('Missing serviceType');
            dataObj.statusMessage = 'Missing serviceType parameter.';
            returnError(dataObj, function (ret) {
                //res.status(400).send(GeoJSON.parse(ret, {}));
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        serviceType = serviceType.toLowerCase();

        if (['tv', 'fm', 'am'].indexOf(serviceType) < 0) {
            console.log('invalid serviceType value');
            dataObj.statusMessage = 'Invalid serviceType value.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        // Common parameters ===========================================================================================
        if (src === undefined) {
            src = '';
        }

        if (unit === undefined) {
            unit = 'm';
        }

        if (lat === undefined) {
            dataObj.statusMessage = 'Missing lat parameter.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (lon === undefined) {
            dataObj.statusMessage = 'Missing lon parameter.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (!lat.match(/^-?\d+\.?\d*$/)) {
            dataObj.statusMessage = 'Invalid lat value.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (!lon.match(/^-?\d+\.?\d*$/)) {
            dataObj.statusMessage = 'Invalid lon value.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (parseFloat(lat) > 90 || parseFloat(lat) < -90) {
            dataObj.statusMessage = 'lat value out of range.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (parseFloat(lon) > 180 || parseFloat(lon) < -180) {
            dataObj.statusMessage = 'lon value out of range.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (validate.getNumDecimal(lat) > 10) {
            dataObj.statusMessage = 'Number of decimal places for lat is larger than 10.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        if (validate.getNumDecimal(lon) > 10) {
            dataObj.statusMessage = 'Number of decimal places for lon is larger than 10.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        lat = parseFloat(lat);
        lon = parseFloat(lon);

        if (field === undefined) {
            dataObj.statusMessage = 'Missing field parameter.';
            returnError(dataObj, function (ret) {
                returnJson = GeoJSON.parse(ret, {});
            });
            return callback(returnJson);
        }

        // if (!field.match(/^-?\d+\.?\d*$/)) {
        //     dataObj.statusMessage = 'Invalid field value.';
        //     returnError(dataObj, function (ret) {
        //         returnJson = GeoJSON.parse(ret, {});
        //     });
        //     return callback(returnJson);
        // }

        field = parseFloat(field);

        if (pattern !== undefined) {
            if (parseInt(pattern.split(';').length) < 8) {
                dataObj.statusMessage = 'Pattern provided has too few radials. Must contain at least 8.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }
        }

        var full_pattern = getFullAntennaPattern(nradial, pattern);

        // =============================================================================================================

        if (serviceType === 'fm' || serviceType === 'tv') {
        // TV & FM
            if (nradial === undefined) {
                dataObj.statusMessage = 'Missing nradial parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!nradial.match(/^\d+$/)) {
                dataObj.statusMessage = 'Invalid nradial value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (parseFloat(nradial) < 8 || parseFloat(nradial) > 360) {
                dataObj.statusMessage = 'nradial value out of range [8, 360].';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            nradial = parseInt(nradial, 10);

            if (rcamsl === undefined) {
                dataObj.statusMessage = 'Missing rcamsl parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!rcamsl.match(/^-?\d+\.?\d*$/)) {
                dataObj.statusMessage = 'Invalid rcamsl value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            rcamsl = parseFloat(rcamsl);

            if (erp === undefined) {
                dataObj.statusMessage = 'Missing erp parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!erp.match(/^\d*\.?\d*$/)) {
                dataObj.statusMessage = 'Invalid erp value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            erp = parseFloat(erp);

            if (serviceType === 'tv' && (channel === undefined || channel === '')) {
                dataObj.statusMessage = 'Missing channel parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (curve === undefined) {
                dataObj.statusMessage = 'Missing curve parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (src != undefined && ['', 'ned_1', 'ned_2', 'globe30'].indexOf(src.toLowerCase()) < 0) {
                dataObj.statusMessage = 'Invalid src value';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (channel && !channel.match(/^\d+$/)) {
                dataObj.statusMessage = 'Invalid channel value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!curve.match(/^\d$/)) {
                dataObj.statusMessage = 'Invalid curve value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (parseFloat(curve) < 0 || parseFloat(curve) > 2) {
                dataObj.statusMessage = 'Curve value out of range [0, 2].';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            curve = parseInt(curve, 10);

            if (ant_rotation == undefined || ant_rotation == '') {
                ant_rotation = 0;
            } else if (!ant_rotation.match(/^\d+\.?\d*$/)) {
                dataObj.statusMessage = 'Invalid ant_rotation value.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            } else {
                ant_rotation = parseFloat(ant_rotation);
            }

            if (ant_rotation > 0) {
                pattern = rotatePattern(pattern, ant_rotation);
            }

            if (channel !== undefined) {
                channel = parseInt(channel, 10);
            }

            var hostname = req.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                hostname = hostname + ':' + NODE_PORT;
            }
            console.log(`req.protocol: ${req.protocol}`);

            //get haat
            var haat_url = 'haat.json?lat=' + lat + '&lon=' + lon + '&rcamsl=' + rcamsl + '&nradial=' + nradial + '&src=' + src + '&unit=' + unit;

            console.log('calling HAAT with req=' + haat_url);

            var haat_req = {};
            haat_req['url'] = haat_url;

            haat.getHAAT(haat_req, res, function (haat_data) {
                // console.log('getHAAT data='+haat_data);

                if (haat_data) {
                    console.log('data returned from HAAT');
                    console.log('statusCode=' + haat_data.features[0].properties.statusCode);

                    if (haat_data.features[0].properties.statusCode + '' !== '200') {
                        console.log('HAAT error: ' + haat_data.features[0].properties.statusMessage);
                        dataObj.statusMessage = haat_data.features[0].properties.statusMessage;
                        returnError(dataObj, function (ret) {
                            returnJson = GeoJSON.parse(ret, {});
                        });
                        return callback(returnJson);
                    }

                    console.log('after status check');

                    var dist;
                    var azimuth;
                    var relativeField;
                    var ERPincludingRelativeField;
                    var haat;
                    var latlon;
                    var latlon_1st;
                    var coordinates = [];
                    var distance_tmp = 0;
                    var fs_or_dist = 2;
                    var flag = [];
                    var channel_use = channel;
                    if (serviceType === 'fm') {
                        channel_use = 6;
                    }
                    var contourData = [];
                    for (var i = 0; i < haat_data.features[0].properties.haat_azimuth.length; i++) {
                        azimuth = haat_data.features[0].properties.azimuth[i];
                        haat = haat_data.features[0].properties.haat_azimuth[i];
                        if (haat > 1600) {
                            haat = 1600;
                        }
                        if (haat < 30) {
                            haat = 30;
                        }

                        relativeField = full_pattern[i];

                        ERPincludingRelativeField = math.round(erp * full_pattern[i] * full_pattern[i], 6);
                        // console.log(full_pattern)
                        dist = tvfm_curves.tvfmfs_metric(ERPincludingRelativeField, haat, channel_use, field, distance_tmp, fs_or_dist, curve, flag);

                        // console.log('azimuth', azimuth, 'haat', haat, 'power', ERPincludingRelativeField, 'channel', channel_use, 'field', field, 'distance_tmp', distance_tmp, 'curve', curve, 'dist', dist)

                        if (isNaN(dist)) {
                            console.log('error in distance calculation');
                            dataObj.statusMessage = 'Error in distance calculation.';
                            returnError(dataObj, function (ret) {
                                returnJson = GeoJSON.parse(ret, {});
                            });
                            return callback(returnJson);
                        }

                        if (dist < 0) {
                            dist = 1;
                        }
                        latlon = conductivity.getLatLonFromDist(lat, lon, haat_data.features[0].properties.azimuth[i], dist);
                        if (i === 0) {
                            latlon_1st = latlon;
                        }

                        coordinates.push([math.round(latlon[1], 10), math.round(latlon[0], 10)]);

                        contourData.push({
                            'x': math.round(latlon[1], 6),
                            'y': math.round(latlon[0], 6),
                            'z': 0,
                            'distance': math.round(dist, 4),
                            'haat': haat,
                            'erp': erp,
                            'ERPincludingRelativeField': ERPincludingRelativeField,
                            'relativeField': relativeField,
                            'azimuth': azimuth
                        });

                    }
                    coordinates.push([math.round(latlon_1st[1], 10), math.round(latlon_1st[0], 10)]);

                    console.log('output coordinates size=' + coordinates.length);

                    coordinates = [[coordinates]];

                    endTime = new Date().getTime();

                    if (coordinates.length > 0) {
                        dataObj.status = 'success';
                        dataObj.statusCode = '200';
                        dataObj.statusMessage = 'ok';
                        dataObj.coordinates = coordinates;
                        dataObj.antenna_lat = lat;
                        dataObj.antenna_lon = lon;
                        dataObj.field = field;
                        dataObj.erp = erp;
                        dataObj.serviceType = serviceType;
                        dataObj.curve = curve;
                        dataObj.channel = channel;
                        dataObj.rcamsl = rcamsl;
                        dataObj.nradial = nradial;
                        dataObj.unit = unit;
                        dataObj.elevation_data_source = haat_data.features[0].properties.elevation_data_source;
                        dataObj.elapsed_time = endTime - startTime;
                        dataObj.contourData = contourData;

                        var geom = JSON.stringify({'type': 'MultiPolygon', 'coordinates': coordinates});

                        console.log('areaFlag', areaFlag);
                        if (areaFlag === 'true') {
                            area.getArea(geom, function (error, response) {
                                if (error) {
                                    console.log('Area API error: ', error);
                                    dataObj.area = -999;
                                    dataObj.area_unit = response.area_unit;
                                } else {
                                    dataObj.area = response.area;
                                    dataObj.area_unit = response.area_unit;
                                }

                                if (pop === 'true') {
                                    population.getPopulation(geom, function (error, response) {
                                        if (error) {
                                            dataObj.population = -999;
                                        } else {
                                            dataObj.population = response.population;
                                        }

                                        console.log('output dataObj=' + dataObj);

                                        var return_data = [dataObj];
                                        GeoJSON.defaults = {
                                            MultiPolygon: coordinates,
                                            include: ['status', 'statusCode', 'statusMessage']
                                        };

                                        var return_json = GeoJSON.parse(return_data, {
                                            MultiPolygon: 'coordinates',
                                            include: ['status', 'statusCode', 'statusMessage', 'antenna_lat', 'antenna_lon', 'field', 'erp', 'serviceType', 'curve', 'channel', 'rcamsl', 'nradial', 'unit', 'elevation_data_source', 'area', 'area_unit', 'population', 'elapsed_time', 'contourData']
                                        });

                                        callback(return_json);
                                    });
                                } else {
                                    console.log('output dataObj=' + dataObj);
                                    var return_data = [dataObj];
                                    GeoJSON.defaults = {
                                        MultiPolygon: coordinates,
                                        include: ['status', 'statusCode', 'statusMessage']
                                    };

                                    var return_json = GeoJSON.parse(return_data, {
                                        MultiPolygon: 'coordinates',
                                        include: ['status', 'statusCode', 'statusMessage', 'antenna_lat', 'antenna_lon', 'field', 'erp', 'serviceType', 'curve', 'channel', 'rcamsl', 'nradial', 'unit', 'elevation_data_source', 'area', 'area_unit', 'elapsed_time', 'contourData']
                                    });

                                    return callback(return_json);
                                }
                            });
                        } else {
                            if (pop === 'true') {
                                population.getPopulation(geom, function (error, response) {
                                    if (error) {
                                        dataObj.population = -999;
                                    } else {
                                        dataObj.population = response.population;
                                    }

                                    console.log('output dataObj=' + dataObj);

                                    var return_data = [dataObj];
                                    GeoJSON.defaults = {
                                        MultiPolygon: coordinates,
                                        include: ['status', 'statusCode', 'statusMessage']
                                    };

                                    var return_json = GeoJSON.parse(return_data, {
                                        MultiPolygon: 'coordinates', include: ['status', 'statusCode', 'statusMessage',
                                            'antenna_lat', 'antenna_lon', 'field', 'erp', 'serviceType', 'curve', 'channel', 'rcamsl', 'nradial', 'unit', 'elevation_data_source', 'population', 'elapsed_time', 'contourData']
                                    });

                                    callback(return_json);
                                });
                            } else {
                                console.log('output dataObj=' + dataObj);
                                var return_data = [dataObj];
                                GeoJSON.defaults = {
                                    MultiPolygon: coordinates,
                                    include: ['status', 'statusCode', 'statusMessage']
                                };

                                var return_json = GeoJSON.parse(return_data, {
                                    MultiPolygon: 'coordinates', include: ['status', 'statusCode', 'statusMessage',
                                        'antenna_lat', 'antenna_lon', 'field', 'erp', 'serviceType', 'curve', 'channel', 'rcamsl', 'nradial', 'unit', 'elevation_data_source', 'elapsed_time', 'contourData']
                                });

                                return callback(return_json);
                            }
                        }
                    }
                } else {
                    console.log('HAAT response error:');
                    dataObj.statusMessage = 'HAAT calculation error.';
                    returnError(dataObj, function (ret) {
                        returnJson = GeoJSON.parse(ret, {});
                    });
                    return callback(returnJson);
                }
            });

        } else if (serviceType === 'am') {
            // AM
            console.log(`====== coverage am =======`);
            var frequency = req.query.frequency;
            var power = req.query.power;
            var rms = req.query.rms;
            dataObj.inputData = {};

            if (!frequency) {
                dataObj.statusMessage = 'Missing frequency parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!power) {
                dataObj.statusMessage = 'Missing power parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            if (!rms) {
                dataObj.statusMessage = 'Missing rms parameter.';
                returnError(dataObj, function (ret) {
                    returnJson = GeoJSON.parse(ret, {});
                });
                return callback(returnJson);
            }

            var data = {};
            pattern = pattern.split(';');
            pattern = pattern.filter(n => n);
            pattern = pattern.map(n => {
                return n.split(',');
            });

            var nonDirectional = pattern.map(n => { return n[1]; }).every((val, i, arr) => val === arr[0]);
            console.log(`non-directional= ${nonDirectional}`);

            //convert freq khz to mhz
            frequency = frequency / 1000;

            // get cond at origin
            var q = `with pt as (select st_geomfromtext('POINT(` + lon + ` ` + lat + `)', 4326) as geom) select conductivity from contour.conductivity c, pt where st_intersects(c.geom, pt.geom)`;
            // console.log(q)
            db_contour.one(q)
                .then(cond => {
                    if (cond) {
                        try {
                            var c = cond.conductivity;
                            console.log(`cond= ${c}`);

                            var queries = [];
                            var outputData = [];
                            for (var i = 0; i < pattern.length; i++) {
                                var az = pattern[i][0];
                                var rad = pattern[i][1];

                                if (rms === 'theoretical') {
                                    rad = rad * Math.sqrt(power/1);
                                }

                                // console.log(`rad= ${rad}`)
                                // console.log(`field= ${field}`)

                                var dist = gwave.amDistance(c, 0, frequency, field, rad);
                                // console.log(`dist= ${dist}`);
                                data[az] = {'fs1km': rad, 'distance': dist, 'cond': []};

                                // find conductivities
                                var line = conductivity.createLine({'latStart': lat, 'lonStart': lon, 'azimuth': az, 'distance': 2000}); // hard code dist to 2000?
                                line = `ST_GeomFromText('LineString(` + line + `)', 4326)`;

                                // if (az == 0) {
                                //     console.log(line)
                                // }

                                var q = `select ` + az + ` as az, ` + rad + ` as fs1km, st_astext((st_dump(foo.st_intersection)).geom) as wkt,` +
                                  `st_x(st_endpoint((st_dump(foo.st_intersection)).geom)) as start_lon,` +
                                  `st_y(st_endpoint((st_dump(foo.st_intersection)).geom)) as start_lat,` +
                                  `foo.id,` +
                                  `foo.conductivity ` +
                                  `from (with line as (select ` + line + ` as geom) ` +
                                  `select st_intersection(cond.geom, line.geom), * ` +
                                  `from contour.conductivity cond, line ` +
                                  `where st_intersects(cond.geom, line.geom)) as foo`;

                                //   console.log(q)
                                //   console.log('\n')

                                queries.push(q);
                            }

                            var qArray = queries.join('; ');

                            db_contour.multi(qArray)
                                .then(result => {
                                    if (result) {
                                        try {
                                            result.forEach(ints=> {
                                                ints.forEach(i=> {
                                                    if (i['az'] in data) {
                                                        // get distance
                                                        var lat1 = lat;
                                                        var lon1 = lon;
                                                        var lat2 = i['start_lat'];
                                                        var lon2 = i['start_lon'];
                                                        var cond = i['conductivity'];
                                                        var fs1km = i['fs1km'];
                                                        var dist = conductivity.getDistFromLatLon(lat1, lon1, lat2, lon2);
                                                        data[i['az']]['cond'].push({'az': i['az'], 'fs1km': fs1km, 'distance': dist, 'conductivity': cond, 'lat': lat2, 'lon': lon2});
                                                    }
                                                });
                                            });

                                            var coordinates = [];
                                            var latlon_1st;
                                            var distances = {};
                                            for (var d in data) {
                                                var az = d;
                                                console.log(`\n================== azimuth ${az} =====================`);
                                                var conds = [];
                                                for (var c in data[d]['cond']) {
                                                    conds.push(data[d]['cond'][c]['conductivity']);
                                                }

                                                // console.log(`conductivities:`);
                                                // console.log(conds);

                                                if (conds.includes(null)) {
                                                    console.log('ERROR= null cond found');
                                                }
                                                if (conds.every((val, i, arr) => val === arr[0])) {
                                                    console.log('conductivity zones= homogenous');
                                                    console.log(`dist: ${dist}`);
                                                    var latlon = conductivity.getLatLonFromDist(lat, lon, az, dist);
                                                    if (parseInt(az) === 0) {
                                                        latlon_1st = latlon;
                                                    }
                                                    coordinates.push([math.round(latlon[1], 10), math.round(latlon[0], 10)]);
                                                    distances[az] = dist;
                                                    outputData.push({'azimuth': az, 'conductivity_zones': [], 'distance': dist})
                                                } else {
                                                    console.log('conductivity zones= multiple');
                                                    // order by ascending intersection
                                                    var sorted = data[d]['cond'].sort(function(a, b) {
                                                        return a['distance'] - b['distance'];
                                                    });

                                                    if (az === 0) {
                                                        console.log('sections=');
                                                        console.log(sorted);
                                                    }
                                                    var zones = [];
                                                    sorted.forEach(d=> {
                                                        zones.push({'conductivity': parseFloat(d.conductivity), 'distance': d.distance});
                                                    });

                                                    var rad = data[d]['fs1km'];

                                                    var ed = amPattern.calEquivDistance(zones, field, frequency, rad);
                                                    console.log(ed);

                                                    var ed_latlon = conductivity.getLatLonFromDist(lat, lon, az, ed);
                                                    console.log(`\n*************** equiv dist= ${ed}`);
                                                    console.log('\n');
                                                    if (parseInt(az) === 0) {
                                                        latlon_1st = ed_latlon;
                                                    }
                                                    coordinates.push([math.round(ed_latlon[1], 10), math.round(ed_latlon[0], 10)]);
                                                    distances[az] = ed;
                                                    outputData.push({'azimuth': az, 'conductivity_zones': zones, 'distance': ed});
                                                }
                                            }
                                            // close
                                            coordinates.push([math.round(latlon_1st[1], 10), math.round(latlon_1st[0], 10)]);

                                            if (coordinates.length > 0) {
                                                dataObj.status = 'success';
                                                dataObj.statusCode = '200';
                                                dataObj.statusMessage = 'ok';
                                                dataObj.inputData.serviceType = req.query.serviceType;
                                                dataObj.inputData.lat = req.query.lat;
                                                dataObj.inputData.lon = req.query.lon;
                                                dataObj.inputData.frequency = req.query.frequency;
                                                dataObj.inputData.field = req.query.field;
                                                dataObj.inputData.power = req.query.power;
                                                dataObj.inputData.nradial = req.query.nradial;
                                                dataObj.inputData.pattern = req.query.pattern;
                                                dataObj.inputData.rms = req.query.rms;

                                                dataObj.outputData = outputData;
                                                dataObj.antenna_lat = lat;
                                                dataObj.antenna_lon = lon;

                                                dataObj.coordinates = [[coordinates]];
                                                GeoJSON.defaults = {
                                                    MultiPolygon: [[coordinates]]
                                                };
                                                returnJson = GeoJSON.parse([dataObj], {
                                                    MultiPolygon: 'coordinates',
                                                    include: ['status', 'statusCode', 'statusMessage', 'inputData', 'outputData', 'antenna_lat', 'antenna_lon']
                                                });
                                                // console.log(JSON.stringify(returnJson))
                                                return callback(returnJson);
                                            }

                                        } catch (err) {
                                            console.log(err);
                                        }
                                    }
                                });
                        } catch (err) {
                            console.log(err);
                        }
                    }
                });
        }
    } catch (err) {
        console.log('catch err=' + err);
        dataObj.statusMessage = 'Contours error occurred.';
        returnError(dataObj, function (ret) {
            returnJson = GeoJSON.parse(ret, {});
        });
        return callback(returnJson);
    }
}

function returnError(data, callback) {
    console.log('returnError');
    var ret = [{
        status: 'error',
        statusCode: '400',
        statusMessage: data.statusMessage
    }];
    return callback(ret);
}

function getFullAntennaPattern(nradial, pattern) {
    var i, j, j1, j2, az, az1, az2, field, field1, field2;

    var full_pattern = [];
    if (pattern === undefined) {
        for (i = 0; i < nradial; i++) {
            full_pattern.push(1);
        }
        return full_pattern;
    }

    var azimuths = [];
    var fields = [];
    var dum = pattern.split(';');

    for (i = 0; i < dum.length; i++) {
    	var a = parseFloat(dum[i].split(',')[0]);
    	var f = parseFloat(dum[i].split(',')[1]);
        if (!isNaN(a)) {
            azimuths.push(a);
        }
        if (!isNaN(f)) {
            fields.push(f);
        }
    }

    for (i = 0; i < nradial; i++) {
        az = i * 360.0 / nradial;
        j1 = -1;
        j2 = -1;
        for (j = 0; j < azimuths.length - 1; j++) {
            az1 = azimuths[j];
            field1 = fields[j];
            az2 = azimuths[j + 1]; //next
            field2 = fields[j + 1];
            if (az >= az1 && az <= az2) {
                j1 = j;
                j2 = j + 1;
            }
        }
        if (j1 === -1) {
            j1 = azimuths.length - 1;
            j2 = 0;
        }

        az1 = azimuths[j1];
        field1 = fields[j1];
        az2 = azimuths[j2];
        field2 = fields[j2];

        if (az2 < az1) {
            az2 += 360;
            if (az < az1) {
                az += 360;
            }
        }

        field = field1 + (field2 - field1) * (az - az1) / (az2 - az1);

        field = math.round(field, 4);

        full_pattern.push(field);
    }

    return full_pattern;
}

function rotatePattern(data, ant_rotation) {
    var i;
    var pattern = '';
    var az;
    var az_value = [];
    var data_arr = data.split(';');
    // console.log(data_arr)

    for (i = 0; i < data_arr.length; i++) {
        az = parseFloat(data_arr[i].split(',')[0]) + ant_rotation;
        if (az >= 360) {
            az -= 360;
        }
        if (!isNaN(az)) {
            az_value.push([az, parseFloat(data_arr[i].split(',')[1])]);
        }
    }

    az_value = az_value.sort(function(a, b) {
        if (a[0] === b[0]) {
            return 0;
        } else if (!isNaN(a[0] && !isNaN(b[0]))) {
            return (a[0] < b[0]) ? -1 : 1;
        }
    });

    for (i = 0; i < az_value.length; i++) {
        pattern += az_value[i][0] + ',' + az_value[i][1] + ';';
    }

    pattern = pattern.replace(/;$/, '');

    return pattern;
}


module.exports.getContours = getContours;
