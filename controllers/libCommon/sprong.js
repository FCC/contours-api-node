'use strict';

var constants = require('../constants.js');

function runsprong(rad_lat_in, rad_lon_in, distance_mi, azimuth_deg, direction=constants.SPRONG_CLOCKWISE) {
    /*
     * The FCC's C code from which this program was derived referenced degrees in a 
     * counter-clockwise direction (0=North, 90=West, 180=South, 270=East). However, 
     * we want to be able to reference clockwise (0=North, 90=East, 180=South, 270=West)
     * when desired. The direction parameter can be cw or ccw to account for this. If none
     * is provided, cw is the default.
     */

    if (direction === constants.SPRONG_CLOCKWISE) {
        azimuth_deg = 360 - azimuth_deg;
    } else if (direction === constants.SPRONG_COUNTERCLOCKWISE) {
        azimuth_deg = 0 + azimuth_deg;
    }

    var tolerance = 0.05;

    var rad_lat_out, rad_lon_out;
    var isig = 0;
    var a, aa, bb, c, cc;
    var cosa, cosaa, sinaa, sinbb, cosbb, cosc, sincc, coscc;
    
    if (distance_mi < tolerance) {
        rad_lat_out = rad_lat_in;
        rad_lon_out = rad_lon_in;
    } else {
        isig = 0;
        a = azimuth_deg % 360.0;
        if (a < 0.0) {
            a = 360.0 + a;
        }
        if (a > 180.0) {
            a = 360.0 - a;
            isig = 1;
        }

        a = parseFloat(a * constants.RADIAN);
        bb = constants.PI_HALF - rad_lat_in;
        cc = distance_mi * constants.RADIAN / constants.DMC;

        cosa = Math.cos(a);
        sinbb = Math.sin(bb);
        cosbb = Math.cos(bb);
        coscc = Math.cos(cc);
        sincc = Math.sin(cc);

        cosaa = cosbb * coscc + sinbb * sincc * cosa;
        if (cosaa <= -1.0) {
            cosaa = -1.0;
        }
        if (cosaa >= 1.0) {
            cosaa = 1.0;
        }
        aa = Math.acos(cosaa);
        sinaa = Math.sin(aa);
        cosc = (coscc - cosaa * cosbb) / (sinaa * sinbb);
        if (cosc <= -1.0) {
            cosc = -1.0;
        }
        if (cosc >= 1.0) {
            cosc = 1.0;
        }
        c = Math.acos(cosc);

        rad_lat_out = constants.PI_HALF - aa;
        rad_lon_out = rad_lon_in - c;
        if (isig === 1) {
            rad_lon_out = rad_lon_in + c;
        }
        if (rad_lon_out > Math.PI) {
            rad_lon_out = rad_lon_out - constants.TWO_PI;
        }
        if (rad_lon_out < (-1 * Math.PI)) {
            rad_lon_out = rad_lon_out + constants.TWO_PI;
        }
    }

    return {
        'input': {
            'latitude_rad': rad_lat_in,
            'longitude_rad': rad_lon_in,
            'distance': distance_mi,
            'azimuth': azimuth_deg
        },
        'output': {
            'latitude_rad': rad_lat_out,
            'longitude_rad': rad_lon_out
        }
    };
}

function runsprongDD(dd_lat_in, dd_lon_in, distance_mi, azimuth_deg, direction=constants.SPRONG_CLOCKWISE) {
    var rad_lat_in = dd_lat_in * constants.RADIAN;
    var rad_lon_in = dd_lon_in * constants.RADIAN;
    return runsprong(rad_lat_in, rad_lon_in, distance_mi, azimuth_deg, direction);
}

module.exports.runsprong = runsprong;
module.exports.runsprongDD = runsprongDD;