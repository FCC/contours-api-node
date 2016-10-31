'use strict';

var errLat = {
    value: 'Invalid latitude (lat) value.',
    missing: 'Missing latitude (lat) value.',
    decimal: 'Number of decimal places for lat is larger than 10.',
    range: 'Latitude value is out of range (-90 < lat < 90).'
};

var errLon = {
    value: 'Invalid longitude (lon) value.',
    missing: 'Missing longitude (lon) value.',
    decimal: 'Number of decimal places for lon is larger than 10.',
    range: 'Longitude value is out of range (-180 < lon < 180).'
};

function latMissing(lat, url) {
    if (!url.match(/lat=/i)) {
        return true;
    }
}

function lonMissing(lon, url) {
    if (!url.match(/lon=/i)) {
       return true;
    }
}

function getNumDecimal(a) {
    var dum = (parseFloat(a) + '').split('.');

    if (dum.length === 2) {
        return dum[1].length;
    }

    return 0;
}

function latLonValue(coord) {
    if (!coord.match(/^-?\d+\.?\d*$/)) {
        return true;
    }
}

function latRange(lat) {
    if (lat > 90 || lat < -90) {
        return true;
    }
}

function lonRange(lon) {
    if (lon > 180 || lon < -180) {
        return true;
    }
}

module.exports.errLat = errLat;
module.exports.errLon = errLon;
module.exports.latMissing = latMissing;
module.exports.lonMissing = lonMissing;
module.exports.getNumDecimal = getNumDecimal;
module.exports.latLonValue = latLonValue;
module.exports.latRange = latRange;
module.exports.lonRange = lonRange;
