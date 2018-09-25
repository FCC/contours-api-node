'use strict';

function getFmOverlap(req, res, callback) {
    var dataObj = {};
    dataObj.statusCode = 400;
    dataObj.statusMessage = 'error';
    dataObj.status = '';

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
            'WHERE to_number(ant.aant_antenna_id,"99999999") = $1 '+
            'AND ant.aant_antenna_record_id=afv.aafv_aant_antenna_record_id';

            dbLMS.task(t => {
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
                    throw "Please verify application IDs.";
                }

                // Stuff

                return responseObj;
            })
            .then(responseObj => {
                dataObj.status = "success";
                dataObj.statusCode = 200;
                dataObj.statusMessage = "ok";
                dataObj.responseObj = responseObj;
                return dataObj;
            })
            .catch(error => {
                console.log(error);
                dataObj.status = "error";
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