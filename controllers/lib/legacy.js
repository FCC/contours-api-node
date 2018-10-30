'use strict';

const constants = require('../constants');

/**********************************************************************
 * This code is ported from the legacy C engprogs code, bugs and all
 * 
 * Changes Made: 
 *   -  dsprong2 references constants.js names instead of the constants
 *      defined within the function. Now returns JSON object. Also, 
 *      the function now reverses E and W since the legacy function
 *      treated E as 270 degrees and W as 90 degrees. 
 * 
 */

function dsprong2(clat, clong, dist, az) {
    // Change N,W,S,E (0,90,180,270) to N,E,S,W (0,90,180,270)
    az = 360.0 - az;

    const DMC = 111.18;
    const TOL = 0.08;

    var alat = constants.RADIAN * clat;
    var along = constants.RADIAN * clong;

    var blat, blong;
    if (dist >= TOL) {
        var isig = 0;
        var a = az % 360.0;
        if (a < 0.0) {
            a = 360.0 + a;
        }
        if (a > 180.0) {
            a = 360.0 - a;
            isig = 1;
        }

        a = a * constants.RADIAN;
        var bb = constants.PI_HALF - alat;
        var cc = dist * constants.RADIAN / DMC;
        var sinbb = Math.sin(bb);
        var cosbb = Math.cos(bb);
        var coscc = Math.cos(cc);
        var cosaa = cosbb * coscc + sinbb * Math.sin(cc) * Math.cos(a);
        if(cosaa <= -1.0) {
            cosaa = -1.0;
        }
        if (cosaa >= 1.0) {
            cosaa = 1.0;
        }
        var aa = Math.acos(cosaa);
        var cosc = (coscc - cosaa * cosbb) / (Math.sin(aa) * sinbb);
        if (cosc <= -1.0) {
            cosc = -1.0;
        }
        if (cosc >= 1.0) {
            cosc = 1.0;
        }
        var c = Math.acos(cosc);
        blat = constants.PI_HALF - aa;
        blong = along - c;
        if (isig === 1) {
            blong = along + c;
        }
        if (blong > constants.PI) {
            blong = blong - constants.TWO_PI;
        }
        if (blong < constants.PI * -1) {
            blong = blong + constants.TWO_PI;
        }
        blat = blat * constants.DEGREE;
        blong = blong * constants.DEGREE;
    } else {
        blat = alat;
        blong = along;
    }

    return {
        'blat': blat,
        'blong': blong
    };
}

module.exports.dsprong2 = dsprong2;