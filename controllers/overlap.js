'use strict';

var dotenv = require('dotenv');
dotenv.load();

var constants = require('./constants.js');
var haat = require('./haat.js');
var profile = require('./profile.js');
var roundTo = require('round-to');

var db_lms;

const K3 = 1;
const HAAT_SRC = 'ned_1';

function cleanDataTypes(application) {
    application.aloc_lat_deg = parseInt(application.aloc_lat_deg) || null;
    application.aloc_lat_mm = parseInt(application.aloc_lat_mm) || null;
    application.aloc_lat_ss = parseFloat(application.aloc_lat_ss) || null;
    application.aloc_long_deg = parseInt(application.aloc_long_deg) || null;
    application.aloc_long_mm = parseInt(application.aloc_long_mm) || null;
    application.aloc_long_ss = parseFloat(application.aloc_long_ss) || null;
    application.aant_horiz_rc_amsl = parseFloat(application.aant_horiz_rc_amsl) || 0;
    application.aant_vert_rc_amsl = parseFloat(application.aant_vert_rc_amsl) || 0;
    application.aafq_horiz_erp_kw = parseFloat(application.aafq_horiz_erp_kw) || 0;
    application.aafq_vert_erp_kw = parseFloat(application.aafq_vert_erp_kw) || 0;
    application.aant_horiz_rc_haat = parseFloat(application.aant_horiz_rc_haat) || 0;
    application.aant_vert_rc_haat = parseFloat(application.aant_vert_rc_haat) || 0;
    application.aant_horiz_rc_hgt = parseFloat(application.aant_horiz_rc_hgt) || 0;
    application.aant_vert_rc_hgt = parseFloat(application.aant_vert_rc_hgt) || 0;
    application.afac_channel = parseInt(application.afac_channel) || null;
    application.aant_antenna_id = parseInt(application.aant_antenna_id) || null;
    application.aant_rotation_deg = parseFloat(application.aant_rotation_deg) || 0;
    return application;
}

function buildAntennaObject(antenna_id, antenna_make, antenna_model, rotation, directional_ind) {
    var antennaObj = {};
    antennaObj.id = parseInt(antenna_id) || null;
    antennaObj.make = antenna_make || null;
    antennaObj.model = antenna_model || null;

    antennaObj.rotation = 0;
    if (antennaObj.make !== null) {
        antennaObj.rotation = parseFloat(rotation) || 0;
    }

    antennaObj.directional = 'N';
    if (constants.DIRECTIONAL_CODES.indexOf(directional_ind) >= 0) {
        antennaObj.directional = 'Y';
    } else {
        antennaObj.directional = 'N';
    }

    return antennaObj;
}

function dmsToDd(degrees, minutes, seconds) {
    var dd = 0;
    dd = degrees + (minutes / 60) + (seconds / 3600);
    return dd;
}

function cleanCoordinates(application) {
    var latitude, longitude;

    latitude = dmsToDd(application.aloc_lat_deg, application.aloc_lat_mm, application.aloc_lat_ss);
    if (application.aloc_lat_dir === 'S') {
        latitude = latitude * -1;
    }

    longitude = dmsToDd(application.aloc_long_deg, application.aloc_long_mm,
        application.aloc_long_ss);
    if (application.aloc_long_dir === 'W') {
        longitude = longitude * -1;
    }

    application.latitude_dd = latitude;
    application.longitude_dd = longitude;
    application.latitude_rad = latitude * constants.RADIAN;
    application.longitude_rad = longitude * constants.RADIAN;
    return application;
}

function cleanTechnicalData(application) {
    var horizRCAMSL, vertRCAMSL, horizERP, vertERP, horizHAAT, vertHAAT;

    horizRCAMSL = parseFloat(application.aant_horiz_rc_amsl) || 0;
    vertRCAMSL = parseFloat(application.aant_vert_rc_amsl) || 0;
    horizERP = parseFloat(application.aafq_horiz_erp_kw) || 0;
    vertERP = parseFloat(application.aafq_vert_erp_kw) || 0;
    horizHAAT = parseFloat(application.aant_horiz_rc_haat) || 0;
    vertHAAT = parseFloat(application.aant_vert_rc_haat) || 0;

    application.rcamsl = Math.max(horizRCAMSL, vertRCAMSL);
    application.erp = Math.max(horizERP, vertERP);
    application.haat = Math.max(horizHAAT, vertHAAT);
    
    return application;
}

function cleanAntennaData(application, antenna, pattern) {
    delete application.aant_antenna_id;
    delete application.aant_antenna_type_code;
    delete application.aant_make;
    delete application.aant_model;
    delete application.aant_rotation_deg;
    application.antenna = antenna;
    application.antenna.pattern = pattern;
    delete application.antenna.pattern.derp;
    delete application.antenna.pattern.d_ind;
    delete application.antenna.pattern.rotation;
    delete application.field_values;
    return application;
}

function getNondirectionalPattern(erp, degrees) {
    var radials = 360 / degrees;
    var data = [];
    for (var i=0; i<radials; i++) {
        data.push({
            'azimuth': i * degrees,
            'field_value': 1.0,
            'erp': erp,
            'addl_az': 'N',
            'src': 'ND-generated'
        });
    }
    return data;
}

function getPattern(antenna, derp, fieldValues=[]) {
    var azimuths = [];
    var tmp_az, tmp_fv;
    
    if (antenna.directional === undefined) {
        console.log('missing directional parameter');
        return null;
    }

    if (['N','Y'].indexOf(antenna.directional) < 0) {
        console.log('invalid directional parameter');
        return null;
    }

    // Set up the starting object
    var dataObj = {
        'status': 0,
        'd_ind': antenna.directional,
        'rotation': antenna.rotation,
        'ndbaz': null,
        'azimuths': [],
    };

    if (antenna.make === undefined) {
        antenna.make = null;
    }

    if (antenna.model === undefined) {
        antenna.model = null;
    }

    if (antenna.id === undefined) {
        antenna.id = null;
    }

    if (antenna.directional === 'N') {
        azimuths = [];
        azimuths = getNondirectionalPattern(derp, 5);
        dataObj.azimuths = azimuths;
        dataObj.ndbaz = azimuths.length;
        dataObj.status = 1;
        return dataObj;
    }

    if (antenna.id === null) {
        azimuths = [];
        if (antenna.make === null || antenna.model === null) {
            dataObj.status = 2;
        } else {
            dataObj.status = 3;
        }
        azimuths = getNondirectionalPattern(derp, 5);
        dataObj.azimuths = azimuths;
        dataObj.ndbaz = azimuths.length;
        return dataObj;
    }

    if (dataObj.status === 0 && fieldValues.length > 0) {
        azimuths = [];
        fieldValues.forEach(row => {
            tmp_az = parseFloat(row.aafv_azimuth);
            tmp_fv = parseFloat(row.aafv_field_value);
            if (antenna.rotation > 0.01) {
                tmp_az = tmp_az + antenna.rotation;
                if (tmp_az >= 360.0) {
                    tmp_az = tmp_az - 360.0;
                }
            }
            azimuths.push({
                'azimuth': tmp_az,
                'field_value': tmp_fv,
                'erp': (tmp_fv * tmp_fv) * derp,
                'addl_az': row.aafv_addl_azimuth_ind,
                'src': 'db'
            });
        });

        dataObj.azimuths = azimuths;
        dataObj.ndbaz = azimuths.length;
    } else {
        azimuths = [];
        dataObj.status = -1;
        azimuths = getNondirectionalPattern(derp, 5);
        dataObj.azimuths = azimuths;
        dataObj.ndbaz = azimuths.length;
    }

    return dataObj;
}

function getRCAMSL(application, res) {
    if (application.rcamsl === 0 || application.rcamsl === undefined) {
        var haatObj;
        haat.getHAAT(
            {
                'url': 'haat.json?lat='+application.latitude_dd+'&lon='+application.longitude_dd+
                        '&nradial=8&rcamsl=0'
            },
            res,
            data => {
                haatObj = data;
            }
        );
        var sumjunk = 0;
        for (var k=1; k<=haatObj.haat_azimuth.length; k++) {
            sumjunk = sumjunk + haatObj.haat_azimuth[k-1];
        }
        var vachaat = sumjunk / haatObj.haat_azimuth.length;
        return application.erp - vachaat;
    } else {
        return application.rcamsl;
    }
}

function prettifyCoordinate(degrees, minutes, seconds, direction) {
    return degrees+'\u00B0 '+
            minutes+'\u2032 '+
            roundTo(parseFloat(seconds),2)+'\u2033 '+
            direction;
}


function buildResponse(app, data) {
    var i, j, D2;
    var responseObj = {
        'applications' : {
            'applicant': {},
            'others': []
        }
    };
    var baseObj;
    for (i=0; i<app.length; i++) {
        baseObj = {};
        baseObj.application_id = app[i].aapp_application_id;
        baseObj.file_number = app[i].aapp_file_num;
        baseObj.licensee = null;
        baseObj.call_sign = app[i].aapp_callsign;
        baseObj.channel = app[i].afac_channel;
        baseObj.station_class = app[i].station_class_code;
        baseObj.service = app[i].service_code;
        baseObj.city = app[i].afac_community_city;
        baseObj.state = app[i].afac_community_state_code;
        baseObj.country = app[i].country_code;
        baseObj.latitude_dd = app[i].latitude_dd;
        baseObj.latitude_dms = prettifyCoordinate(app[i].aloc_lat_deg, app[i].aloc_lat_mm, app[i].aloc_lat_ss, app[i].aloc_lat_dir);
        baseObj.longitude_dd = app[i].longitude_dd;
        baseObj.longitude_dms = prettifyCoordinate(app[i].aloc_long_deg, app[i].aloc_long_mm, app[i].aloc_long_ss, app[i].aloc_long_dir);
        baseObj.herp = roundTo(app[i].aafq_horiz_erp_kw,2);
        baseObj.verp = roundTo(app[i].aafq_vert_erp_kw,2);
        baseObj.hhaat = roundTo(app[i].aant_horiz_rc_haat,1);
        baseObj.vhaat = roundTo(app[i].aant_vert_rc_haat,1);
        baseObj.hrcamsl = roundTo(app[i].aant_horiz_rc_amsl,1);
        baseObj.vrcamsl = roundTo(app[i].aant_vert_rc_amsl,1);
        baseObj.beam_tilt = null;
        baseObj.hrcagl = roundTo(app[i].aant_horiz_rc_hgt,1);
        baseObj.vrcagl = roundTo(app[i].aant_vert_rc_hgt,1);
        baseObj.ind215 = app[i].contour_215_protection_ind;
        baseObj.antenna = {};
        baseObj.antenna.directional = app[i].antenna.directional;
        baseObj.antenna.make = app[i].antenna.make;
        baseObj.antenna.model = app[i].antenna.model;
        baseObj.antenna.rotation = app[i].antenna.rotation;
        if (i === 0) {
            responseObj.applications.applicant = baseObj;
        } else {
            responseObj.applications.others[i-1] = baseObj;
        }
    }

    // Print the following data for each other IX against the applicant protected
    
    var tmpObj;
    responseObj.o_ix_to_a_pr = [];
    for (i=1; i<app.length; i++) {
        responseObj.o_ix_to_a_pr[i-1] = {
            'a_pr_name': 'PROTECTED',
            'a_pr_fs': roundTo(data.pr_con[0],2),
            'o_ix_name': 'INTERFERING',
            'o_ix_fs': roundTo(data.o_ix_con[i],2)
        };
        responseObj.o_ix_to_a_pr[i-1].data = [];
        for (j=0; j<data.naz[0]; j+=2) {
            tmpObj = {
                'azimuth': roundTo(data.azd[0][j],1),
                'erp': roundTo(data.erp[0][j],3),
                'haat': roundTo(data.haat[0][j],1)//,
//                'dist': roundTo(data.pr_dist[0][j],1),
//                'o_to_a_azimuth': roundTo(data.o_to_a_pr_azd[i][j],1),
//                'o_to_a_erp': roundTo(data.o_to_a_pr_erp[i][j],3),
//                'o_to_a_haat': roundTo(data.o_to_a_pr_haat[i][j],1),
//                'o_to_a_dist': roundTo(data.o_to_a_pr_dist[i][j],1),
//                'o_to_a_fs': roundTo(data.o_to_a_pr_fs[i][j],2),
//                'o_to_a_ix': data.o_to_a_pr_fs[i][j] >= data.o_ix_con[i]
            };
            responseObj.o_ix_to_a_pr[i-1].data.push(tmpObj);
        }
//        responseObj.o_ix_to_a_pr[i-1].onedata = [];
//        if (data.a_ix_number[i] !== 0) {
//            for (j=1,D2=(data.dbd_a_pr_naz[i]-j+1); D2>0; D2--,j+=1) {
//                tmpObj = {
//                    'azimuth': roundTo(data.dbd_a_pr_azd[i][j-1],1),
//                    'erp': roundTo(data.dbd_a_pr_erp[i][j-1],3),
//                    'haat': roundTo(data.dbd_a_pr_haat[i][j-1],1),
//                    'dist': roundTo(data.dbd_a_pr_dist[i][j-1],1),
//                    'o_to_a_azimuth': roundTo(data.dbd_o_to_a_pr_azd[i][j-1],1),
//                    'o_to_a_erp': roundTo(data.dbd_o_to_a_pr_erp[i][j-1],3),
//                    'o_to_a_haat': roundTo(data.dbd_o_to_a_pr_haat[i][j-1],1),
//                    'o_to_a_dist': roundTo(data.dbd_o_to_a_pr_dist[i][j-1],1),
//                    'o_to_a_fs': roundTo(data.dbd_o_to_a_pr_fs[i][j-1],2),
//                    'o_to_a_ix': roundTo(data.dbd_a_ix_overlap[i][j-1],2)
//                };
//                responseObj.o_ix_to_a_pr[i-1].onedata.push(tmpObj);
//            }
//        }
//    }

    responseObj.a_ix_to_o_pr = [];
    for (i=1; i<app.length; i++) {
        responseObj.a_ix_to_o_pr[i-1] = {
            'o_pr_name': 'PROTECTED',
            'o_pr_fs': roundTo(data.pr_con[i],2),
            'a_ix_name': 'INTERFERING',
            'a_ix_fs': roundTo(data.dbd_a_ix_con[i],2)
        };
        responseObj.a_ix_to_o_pr[i-1].data = [];
        for (j=0; j<data.naz[0]; j+=2) {
            tmpObj = {
                'azimuth': roundTo(data.azd[i][j],1),
                'erp': roundTo(data.erp[i][j],3),
                'haat': roundTo(data.haat[i][j],1)//,
//               'dist': roundTo(data.pr_dist[i][j],1),
//                'a_to_o_azimuth': roundTo(data.a_to_o_pr_azd[i][j],1),
//                'a_to_o_erp': roundTo(data.a_to_o_pr_erp[i][j],3),
//                'a_to_o_haat': roundTo(data.a_to_o_pr_haat[i][j],1),
//                'a_to_o_dist': roundTo(data.a_to_o_pr_dist[i][j],1),
//                'a_to_o_fs': roundTo(data.a_to_o_pr_fs[i][j],2),
//                'a_to_o_ix': data.a_to_o_pr_fs[i][j] >= data.dbd_a_ix_con[i]
            };
            responseObj.a_ix_to_o_pr[i-1].data.push(tmpObj);
        }
//        responseObj.a_ix_to_o_pr[i-1].onedata = [];
//        if (data.o_ix_number[i] !== 0) {
//            for (j=1,D2=(data.dbd_o_pr_naz[i]-j+1); D2>0; D2--,j+=1) {
//                tmpObj = {
//                    'azimuth': roundTo(data.dbd_o_pr_azd[i][j-1],1),
//                    'erp': roundTo(data.dbd_o_pr_erp[i][j-1],3),
//                    'haat': roundTo(data.dbd_o_pr_haat[i][j-1],1),
//                    'dist': roundTo(data.dbd_o_pr_dist[i][j-1],1),
//                    'a_to_o_azimuth': roundTo(data.dbd_a_to_o_pr_azd[i][j-1],1),
//                    'a_to_o_erp': roundTo(data.dbd_a_to_o_pr_erp[i][j-1],3),
//                    'a_to_o_haat': roundTo(data.dbd_a_to_o_pr_haat[i][j-1],1),
//                    'a_to_o_dist': roundTo(data.dbd_a_to_o_pr_dist[i][j-1],1),
//                    'a_to_o_fs': roundTo(data.dbd_a_to_o_pr_fs[i][j-1],2),
//                    'a_to_o_ix': roundTo(data.dbd_o_ix_overlap[i][j-1],2)
//                };
//                responseObj.a_ix_to_o_pr[i-1].onedata.push(tmpObj);
//            }
        }
    }

    responseObj.raw_data = {
        'raw_app_data': app,
        'raw_toutput_data': data
    };

    return responseObj;
}

function getContourValues(napp, apps) {
    var chandiff = new Array(napp);
    var output = {
        'protcon': new Array(napp),
        'ixcon': new Array(napp),
        'app_ixcon': new Array(napp)
    };
    for (var n=0; n<napp; n++) {
        output.protcon[n] = 60.0;
        if (apps[n].afac_channel <= 220 || apps[n].station_class === 'D') {
            output.protcon[n] = 60.0;
        } else if (apps[n].station_class === 'B') {
            output.protcon[n] = 54.0;
        } else if (apps[n].station_class === 'B1') {
            output.protcon[n] = 57.0;
        }
    }

    for (n=1; n<napp; n++) {
        chandiff[n] = Math.abs(apps[0].afac_channel - apps[n].afac_channel);
        if (chandiff[n] === 0) {
            output.ixcon[n] = output.protcon[0] - 20.0;
            output.app_ixcon[n] = output.protcon[n] - 20.0;
        } else if (chandiff[n] === 1) {
            output.ixcon[n] = output.protcon[0] - 6.0;
            output.app_ixcon[n] = output.protcon[n] - 6.0;
        } else if (chandiff[n] === 2 || chandiff[n] === 3) {
            output.ixcon[n] = output.protcon[0] + 40.0;
            output.app_ixcon[n] = output.protcon[n] + 40.0;
        }
    }

    return output;
}

function fm215Adjust(country, state, channel, stationClass, erp, haat, rc, chk, ichk) {
    var resultObj = {
        'rcamsl_adj': rc,
        'erp_adj': erp,
        'haat_adj': haat,
        'adjusted': false
    };
    
    if (channel <= 220 || country !== 'US' || chk === 'Y') {
        return resultObj;
    }

    resultObj.adjusted = true;
    var erp_max, haat_max;
    if (stationClass === 'A') {
        if (ichk === 1) {
            erp_max = 6;
        } else {
            erp_max = 3;
        }
        if (state === 'PR' || state === 'VI') {
            haat_max = 240;
        } else {
            haat_max = 100;
        }
    } else if (stationClass === 'B') {
        erp_max = 50;
        haat_max = 150;
        if (state === 'PR' || state === 'VI') {
            haat_max = 472;
        }
    } else if (stationClass === 'B1') {
        erp_max = 25;
        haat_max = 100;
        if (state === 'PR' || state === 'VI') {
            haat_max = 150;
        }
    } else if (stationClass === 'C') {
        erp_max = 100;
        haat_max = 600;
    } else if (stationClass === 'C0') {
        erp_max = 100;
        haat_max = 450;
    } else if (stationClass === 'C1') {
        erp_max = 100;
        haat_max = 299;
    } else if (stationClass === 'C2') {
        erp_max = 50;
        haat_max = 150;
    } else if (stationClass === 'C3') {
        erp_max = 25;
        haat_max = 100;
    } else if (stationClass === 'L1') {
        erp_max = 0.1;
        haat_max = 30;
    } else if (stationClass === 'L2') {
        erp_max = 10;
        haat_max = 30;
    } else {
        erp_max = erp;
        haat_max = haat;
        resultObj.adjusted = false;
    }

    resultObj.rcamsl_adj = rc + (haat_max - haat);
    resultObj.haat_adj = haat_max;
    resultObj.erp_adj = erp_max;
    return resultObj;
}

function getFmDA(app, herp) {
    var i, j, min_index, n;
    var numaz = app.antenna.pattern.azimuths.length;
    var tempaz, temprad, add;
    var temp_dbaz = new Array(numaz);
    var temp_dbrad = new Array(numaz);
    var dbaz = new Array(numaz);
    var dbrad = new Array(numaz);
    var az = new Array(100);
    var rad = new Array(100);
    var newaz = new Array(100);
    var newrad = new Array(100);
    for (i=0; i<numaz; i++) {
        dbaz[i] = app.antenna.pattern.azimuths[i].azimuth;
        dbrad[i] = app.antenna.pattern.azimuths[i].field_value;
    }

    var output = {
        'newaz': newaz,
        'numaz': 0,
        'daerp': new Array(numaz)
    };
    if (app.antenna.rotation !== 0) {
        for (j=1; j<=numaz; j++) {
            dbaz[j-1] = dbaz[j-1] + app.antenna.rotation;
            if (dbaz[j-1] >= 360.0) {
                dbaz[j-1] = dbaz[j-1] % 360.0;
            }
        }
        min_index = 1;
        for (j=1; j<=numaz; j++) {
            if (dbaz[j-1] < dbaz[min_index-1]) {
                min_index = j;
            }
        }
        for (i=min_index,j=1; j<=numaz; j++,i++) {
            if (i > numaz) {
                i = 1;
            }
            temp_dbaz[j-1] = dbaz[i-1];
            temp_dbrad[j-1] = dbrad[i-1];
        }
        for (j=1; j<=numaz; j++) {
            dbaz[j-1] = temp_dbaz[j-1];
            dbrad[j-1] = temp_dbrad[j-1];
        }
    }

    n = 1;
    for (j=1; j<=numaz; j++) {
        az[n-1] = dbaz[j-1];
        rad[n-1] = dbrad[j-1];
        n = n + 2;
    }

    az[n-1] = az[0] + 360.0;
    rad[n-1] = rad[0];

    for (n=2; n<=(2*numaz); n+=2) {
        tempaz = az[n] - az[n-2];
        if (tempaz > 5) {
            temprad = rad[n] - rad[n-2];
            add = 5.0 * temprad / tempaz;
            az[n-1] = az[n-2] + 5.0;
            rad[n-1] = rad[n-2] + add;
        } else {
            az[n-1] = 0;
            rad[n-1] = 0;
        }
    }

    i = 0;
    for (n=1; n<=(2*numaz); n++) {
        if (rad[n-1] !== 0) {
            i = i + 1;
            newaz[i-1] = az[n-1];
            newrad[i-1] = rad[n-1];
        }
        az[n-1] = 0;
        rad[n-1] = 0;
    }

    numaz = i + 1;
    newaz[numaz-1] = newaz[0] + 360;
    newrad[numaz-1] = newrad[0];

    for (j=1; j<=numaz; j++) {
        output.daerp[j-1] = herp * newrad[j-1] * newrad[j-1];
    }

    output.numaz = numaz;
    output.newaz = newaz;
    return output;
}

function getDirectionalERPs(napp, apps) {
    var output = {
        'erp': new Array(napp),
        'azd': new Array(napp),
        'naz': new Array(napp)
    };
    var i, j, k, D7, D9, twerp;
    var fmdaresult;
    for (i=1; i<=napp; i++) {
        if (apps[i-1].antenna.directional !== 'Y') {
            output.naz[i-1] = 73;
            for (j=1,D7=(output.naz[i]-j+1); D7>0; D7--,j+=1) {
                if (apps[i-1].aafq_horiz_erp_kw >= apps[i-1].aafq_vert_erp_kw) {
                    output.erp[i-1] = apps[i-1].aafq_horiz_erp_kw;
                } else {
                    output.erp[i-1] = apps[i-1].aafq_vert_erp_kw;
                }
            }
        } else {
            if (apps[i-1].aafq_horiz_erp_kw >= apps[i-1].aafq_vert_erp_kw) {
                twerp = apps[i-1].aafq_horiz_erp_kw;
            } else {
                twerp = apps[i-1].aafq_vert_erp_kw;
            }
            fmdaresult = getFmDA(apps[i-1], twerp);
            output.naz[i-1] = fmdaresult.numaz;
            output.erp[i-1] = new Array(fmdaresult.numaz);
            output.azd[i-1] = new Array(fmdaresult.numaz);
            for (k=1,D9=(output.naz[i-1]-k+1); D9>0; D9--,k+=1) {
                output.erp[i-1][k-1] = fmdaresult.daerp[k-1];
                output.azd[i-1][k-1] = fmdaresult.newaz[k-1];
            }
        }
    }
    return output;
}

function gethaat(dlat, dlon, rcamsl, naz, azd) {
    var haat = [];

    for (var j=0; j<naz; j++) {
        profile.getProfile({
            'query': {
                'src': HAAT_SRC,
                'lat': roundTo(dlat,10),
                'lon': roundTo(dlon,10),
                'azimuth': azd[j],
                'start': 2 * constants.KM_MULTIPLIER,
                'end': 10 * constants.KM_MULTIPLIER,
                'num_points': 51,
                'unit': 'm',
                'format': 'json'
            }
        },{

        }, elevObj => {
            haat[j] = rcamsl - elevObj.data.features[0].properties.average_elevation;
        });
    }

    if (j === naz) {
        haat[j-1] = haat[0];
    }
    return haat;
}

function gethaat3(start, napp, dlat, dlon, rcamsl, naz, azd) {
    var i;
    var haat = new Array(napp);

    for (i=start; i<napp; i++) {
        haat[i] = gethaat(dlat, dlon, rcamsl, naz[i], azd[i]);
    }
    return haat;
}

function gethaat4(start, napp, dlat, dlon, rcamsl, naz, azd) {
    var i;
    var haat = new Array(napp);

    for (i=start; i<napp; i++) {
        haat[i] = gethaat(dlat[i], dlon[i], rcamsl[i], naz[i], azd[i]);
    }
    return haat;
}

function getFmOverlap(req, res, callback) {
    var NODE_ENV = process.env.NODE_ENV;
    if (NODE_ENV === 'DEV') {
        // We can't use LMS LIVE in Contours DEV
        console.log('Using: '+process.env.LMS_PG);
        db_lms = require('./db_lms.js');
    } else {
        console.log('Using: '+process.env.LMS_LIVE_PG);
        db_lms = require('./db_lms_live.js');
    }

    var dataObj = {};
    dataObj.statusCode = 400;
    dataObj.statusMessage = '';
    dataObj.status = 'error';

    try {
        console.log('\n================== start FM overlap (FMOVER) analysis process ==============');
        var appIdA = req.query.app_id_applicant;
        var appIdO = req.query.app_id_other;

        if (appIdA === undefined) {
            console.log('missing app_id_applicant parameter');
            dataObj.statusMessage = 'Missing app_id_applicant parameter.';
            return callback(dataObj);
        }

        if (!appIdA.match(/^\w+$/)) {
            console.log('invalid app_id_applicant value');
            dataObj.statusMessage = 'Invalid app_id_applicant value.';
            return callback(dataObj);
        }

        if (appIdO === undefined) {
            console.log('missing app_id_other parameter');
            dataObj.statusMessage = 'Missing app_id_other parameter.';
            return callback(dataObj);
        }

        if (Array.isArray(appIdO)) {
            appIdO.forEach(id => {
                if (!id.match(/^\w+$/)) {
                    console.log('invalid app_id_other value');
                    dataObj.statusMessage = 'Invalid app_id_other channel.';
                    return callback(dataObj);
                }
            });
        } else {
            if (!appIdO.match(/^\w+$/)) {
                console.log('invalid app_id_other value');
                dataObj.statusMessage = 'Invalid app_id_other value.';
                return callback(dataObj);
            }
        }

        var appList = [
            appIdA
        ];
        if (Array.isArray(appIdO)) {
            appIdO.forEach(app => {
                appList.push(app);
            });
        } else if (typeof appIdO === 'string') {
            appList.push(appIdO);
        }

        // Inputs are clean, continue.
        var responseObj = {};
        var tOutput = {}; // We will mirror the C code object/storage to make it easier to translate
        var i;
        var dlat = [];
        var dlon = [];
        var rcamsl = [];

        var appQuery = 'SELECT app.aapp_application_id, app.aapp_file_num, app.aapp_callsign, '+
            'loc.aloc_lat_dir, loc.aloc_lat_deg, loc.aloc_lat_mm, loc.aloc_lat_ss, loc.aloc_long_dir, '+
            'loc.aloc_long_deg,loc.aloc_long_mm, loc.aloc_long_ss, ant.aant_horiz_rc_amsl, '+
            'ant.aant_vert_rc_amsl, frq.aafq_horiz_erp_kw, frq.aafq_vert_erp_kw, af.afac_channel, '+
            'af.station_class_code, mapp.contour_215_protection_ind, ant.aant_antenna_type_code, '+
            'ant.aant_make, ant.aant_model, ant.aant_antenna_id, ant.aant_rotation_deg, af.afac_community_city, '+
            'af.afac_community_state_code, af.country_code, ant.aant_horiz_rc_haat, ant.aant_vert_rc_haat, '+
            'fac.service_code, ant.aant_horiz_rc_hgt, ant.aant_vert_rc_hgt '+
            'FROM common_schema.application app, mass_media.app_location loc, mass_media.app_antenna ant, '+
            'mass_media.app_antenna_frequency frq, common_schema.application_facility af, '+
            'mass_media.app_mm_application mapp, common_schema.facility fac '+
            'WHERE app.aapp_application_id=loc.aloc_aapp_application_id '+
            'AND af.afac_facility_id=fac.facility_id '+
            'AND ant.aant_aloc_loc_record_id=loc.aloc_loc_record_id '+
            'AND ant.aant_antenna_record_id=frq.aafq_aant_antenna_record_id '+
            'AND af.afac_application_id=app.aapp_application_id '+
            'AND app.aapp_application_id=mapp.aapp_application_id '+
            'AND app.aapp_application_id IN (${appIds:csv})';

        var antennaQuery = 'SELECT afv.aafv_azimuth, afv.aafv_field_value, afv.aafv_addl_azimuth_ind '+
            'FROM mass_media.app_antenna_field_value afv, mass_media.app_antenna ant '+
            'WHERE ant.aant_antenna_id = $1 '+
            'AND ant.aant_antenna_record_id=afv.aafv_aant_antenna_record_id';

        db_lms.task(t => {
            return t.map(appQuery, { 'appIds': appList }, app => {
                if (app.aant_antenna_id !== null) {
                    return t.any(antennaQuery, app.aant_antenna_id).then(field_values => {
                        app.field_values = field_values;
                        return app;
                    });
                } else {
                    return app;
                }
            }).then(t.batch);
        })
        .then(data => {
            if (data.length < 2) {
                throw 'Please verify application IDs.';
            }

            var antennaObj, patternObj;
            tOutput.napp = data.length;
            for (i=0; i<tOutput.napp; i++) {
                console.log('Clean up the object, pre-processing');
                // Clean up the object, pre-processing
                data[i] = cleanDataTypes(data[i]);
                data[i] = cleanCoordinates(data[i]);
                data[i] = cleanTechnicalData(data[i]);
                antennaObj = buildAntennaObject(data[i].aant_antenna_id, 
                    data[i].aant_make, data[i].aant_model, data[i].aant_rotation_deg, 
                    data[i].aant_antenna_type_code);
                patternObj = getPattern(antennaObj, data[i].erp, data[i].field_values);
                data[i] = cleanAntennaData(data[i], antennaObj, patternObj);
                // Done cleaning up
                console.log('Done cleaning up');

                dlat[i] = data[i].latitude_dd;
                dlon[i] = data[i].longitude_dd;
                data[i].rcamsl = getRCAMSL(data[i], res);
                rcamsl[i] = data[i].rcamsl;
            }

            var output = getContourValues(tOutput.napp, data);
            tOutput.o_ix_con = output.ixcon;
            var a_ix_tempcon = output.app_ixcon;
            tOutput.pr_con = output.protcon;

            // Adjustments for 73.215
            console.log('Adjustments for 73.215');
            // If the first station does not use 73.215 rules, skip 73.215 adjustments
            var adjustmentObj;
            if (data[0].contour_215_protection_ind === 'Y') {
                // If both stations are on reserved channels, skip 73.215 adjustments.
                if ((data[0].afac_channel < 200 || data[0].afac_channel > 220) ||
                    (data[1].afac_channel < 200 || data[1].afac_channel > 220)) {
                    if (data[1].aafq_horiz_erp_kw >= data[1].aafq_vert_erp_kw) {
                        adjustmentObj = fm215Adjust(data[1].country_code, 
                            data[1].afac_community_state_code, data[1].afac_channel,
                            data[1].station_class, data[1].aafq_horiz_erp_kw, data[1].rcamsl,
                            data[1].contour_215_protection_ind, K3);
                    } else {
                        adjustmentObj = fm215Adjust(data[1].country_code, 
                            data[1].afac_community_state_code, data[1].afac_channel,
                            data[1].station_class, data[1].aafq_vert_erp_kw, data[1].rcamsl,
                            data[1].contour_215_protection_ind, K3);
                    }
                    if (adjustmentObj.adjusted) {
                        data[1].is_215_adjusted = true;
                        data[1].erp_unadjusted = data[1].erp;
                        data[1].rcamsl_unadjusted = data[1].rcamsl;
                        data[1].haat_unadjusted = data[1].haat;
                        data[1].erp = adjustmentObj.erp_adj;
                        data[1].rcamsl = adjustmentObj.rcamsl_adj;
                        data[1].haat = adjustmentObj.haat_adj;
                    }
                }
            }

            console.log('Get directional ERPs');
            var directionalERPs = getDirectionalERPs(tOutput.napp, data);
            tOutput.erp = directionalERPs.erp;
            tOutput.azd = directionalERPs.azd;
            tOutput.naz = directionalERPs.naz;

            tOutput.dbd_a_ix_con = new Array(tOutput.napp);
            tOutput.a_ix_con = new Array(tOutput.napp);
            for (i=0; i<tOutput.napp; i++) {
                tOutput.dbd_a_ix_con[i] = a_ix_tempcon[i];
                tOutput.a_ix_con[i] = a_ix_tempcon[i];
            }

            console.log('Get HAATs and contour distances');
            tOutput.haat = gethaat4(0, tOutput.napp, dlat, dlon, rcamsl, tOutput.naz, tOutput.azd);

            responseObj = buildResponse(data, tOutput);
            return responseObj;
        })
        .then(responseObj => {
            dataObj.status = 'success';
            dataObj.statusCode = 200;
            dataObj.statusMessage = 'ok';
            dataObj.responseObj = responseObj;
            return dataObj;
        })
        .catch(error => {
            console.log(error);
            dataObj.status = 'error';
            dataObj.statusCode = 400;
            dataObj.statusMessage = error;
            return dataObj;
        })
        .done(obj => {
            return callback(obj);
        });

    } catch (err) {
        console.log('err='+err);
        dataObj.error = err.stack;
        dataObj.statusMessage = 'error';
        return callback(dataObj);
    }
}

module.exports.getFmOverlap = getFmOverlap;