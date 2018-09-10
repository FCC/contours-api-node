'use strict';

var profile = require('./profile.js');
var distance = require('./distance.js');

const MIME_JSON = 'application/json';
const PROFILE_KEY = 'profile';
const DISTANCE_KEY = 'distance';
const SUPPORTED = [
    PROFILE_KEY
];
const MAX_BATCH = 500;
const TRUNCATE_BATCH = false;

var execProfile, execDistance, buildResponseObject, getString;

function process(req, res, callback) {
    var response = {};
    response.status = 'error';
    response.statusCode = '400';
    response.statusMessage = '';

    // Check HTTP headers
    if (!req.is(MIME_JSON)) {
        console.log('invalid content-type header');
        response.statusMessage = 'The Content-Type header was not set properly.';
        return callback(response);
    }

    var payload = req.body;

    // Verify that the API name is one that supports batch calls
    if (payload.api === undefined) {
        console.log('api parameter not provided');
        response.statusMessage = 'Missing api parameter';
        return callback(response);
    }

    if (SUPPORTED.indexOf(payload.api) < 0) {
        console.log('invalid api');
        response.statusCode = '501';
        response.statusMessage = 'API not supported';
        return callback(response);
    }

    // Verify that an array of requests was provided in the JSON payload and it doesn't exceed our
    //  maximum batch size.
    if (payload.requests === undefined) {
        console.log('requests array not provided');
        response.statusMessage = 'Missing requests parameter';
        return callback(response);
    }

    if (!Array.isArray(payload.requests)) {
        console.log('requests array not provided');
        response.statusMessage = 'Invalid requests parameter';
        return callback(response);
    }

    if (payload.requests.length === 0) {
        console.log('requests array not provided');
        response.statusMessage = 'Batch not provided';
        return callback(response);
    }

    var numRequests = payload.requests.length;
    if (numRequests > MAX_BATCH) {
        if (TRUNCATE_BATCH) {
            numRequests = MAX_BATCH;
        } else {
            console.log('exceeds max batch size');
            response.statusMessage = 'Number of requests exceeds maximum batch size ('+MAX_BATCH+')';
            return callback(response);
        }
    }

    // Correct JSON schema provided for the batch processor, but the individual requests may still 
    //  be malformed. We will let the individual API handle the request validation and we'll just
    //  return the error.

    var output = {
        'requests': new Array(numRequests),
        'responses': new Array(numRequests)
    };
    for (var i=0; i<numRequests; i++) {
        // Loop through each request and send it to the API

        output.requests[i] = {};
        output.requests[i].request = payload.requests[i];
        output.requests[i].sequenceNumber = i;

        output.responses[i] = {};

        // Call the appropriate proxy function for the API specified in the payload
        if (payload.api === PROFILE_KEY) {
            output.responses[i] = execProfile(output.requests[i].request);
        } else if (payload.api === DISTANCE_KEY) {
            output.responses[i] = execDistance(output.requests[i].request);
        }

        output.responses[i].sequenceNumber = i;

    }

    response.statusCode = '200';
    response.statusMessage = 'ok';
    response.status = 'success';
    response.data = output;
    return callback(response);
}

/*
 * Proxy Functions - Each API that is batched needs a proxy function to parse the
 * request object, pass it to the respective controller, and return the response.
 */

// Proxy function for the PROFILE API
function execProfile(req) {
    var apiRequest = {
        'query': {}
    };

    var apiResponse = {};

    // We need to mock the query string parameter object so all items need to be strings.
    // Default to empty string if one wasn't provided
    apiRequest.query.lat = getString(req.lat);
    apiRequest.query.lon = getString(req.lon);
    apiRequest.query.azimuth = getString(req.azimuth);
    apiRequest.query.start = getString(req.start);
    apiRequest.query.end = getString(req.end);
    apiRequest.query.num_points = getString(req.num_points);
    apiRequest.query.src = getString(req.src);
    apiRequest.query.unit = getString(req.unit);
    apiRequest.query.format = getString(req.format);

    try {
        profile.getProfile(apiRequest, apiResponse, function(data) {
            apiResponse = buildResponseObject(data, null);
        });
    }
    catch(err) {
        console.error('\n\n execProfile err '+err);  
        apiResponse = buildResponseObject(null, err);
    }
    return apiResponse;
}

// Proxy function for the DISTANCE API
/* istanbul ignore next */
function execDistance(req) {
    var apiRequest = {
        'query': {}
    };

    var apiResponse = {};

    // We need to mock the query string parameter object so all items need to be strings.
    // Default to empty string if one wasn't provided
    apiRequest.query.computationMethod = getString(req.computationMethod);
    apiRequest.query.serviceType = getString(req.serviceType);
    apiRequest.query.haat = getString(req.haat);
    apiRequest.query.channel = getString(req.channel);
    apiRequest.query.field = getString(req.field);
    apiRequest.query.erp = getString(req.erp);
    apiRequest.query.distance = getString(req.distance);
    apiRequest.query.curve = getString(req.curve);
    apiRequest.query.format = getString(req.format);

    try {
        distance.getDistance(apiRequest, apiResponse, function(data) {
            apiResponse = buildResponseObject(data, null);
        });
    }
    catch(err) {
        console.error('\n\n execProfile err '+err);  
        apiResponse = buildResponseObject(null, err);
    }
    return apiResponse;
}

// Common response object format. Will be used by the proxy functions.
function buildResponseObject(data, err) {
    var dataObj = {};
    if (err) {
        dataObj.status = 'error';
        dataObj.statusCode = '400';
        dataObj.statusMessage = err;
    } else {
        dataObj.status = 'success';
        dataObj.statusCode = '200';
        dataObj.statusMessage = 'ok';
        dataObj.data = data;
    }
    return dataObj;
}

function getString(param) {
    if (param === undefined || param === null) {
        return '';
    } else {
        return param.toString();
    }
}

module.exports.process = process;