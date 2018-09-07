'use strict';

var profile = require('./profile.js');

const MIME_JSON = 'application/json';
const PROFILE_KEY = 'profile';
const SUPPORTED = [
    PROFILE_KEY
];
const MAX_BATCH = 500;

var execProfile;

function process(req, res, callback) {
    var response = {};
    response.status = 'error';
    response.statusCode = 400;
    response.statusMessage = '';

    // Check HTTP headers
    if (!req.is(MIME_JSON)) {
        console.log('invalid content-type header');
        response.statusMessage = 'The Content-Type header was not set properly.';
        return callback(response);
    }

    if (!req.accepts(MIME_JSON)) {
        console.log('invalid accepts header');
        response.statusCode = 406;
        response.statusMessage = 'Not Acceptable';
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
        response.statusCode = 501;
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
        console.log('exceeds max batch size');
        response.statusMessage = 'Number of requests exceeds maximum batch size ('+MAX_BATCH+')';
        return callback(response);
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

        output.requests[i] = payload.requests[i];
        output.requests[i].sequenceNumber = i;

        if (payload.api === PROFILE_KEY) {
            output.responses[i] = execProfile(output.requests[i], res, function(err, data) {
                var dataObj = {};
                if (err) {
                    dataObj.status = 'error';
                    dataObj.statusCode = 400;
                    dataObj.statusMessage = err;
                } else {
                    dataObj.status = 'success';
                    dataObj.statusCode = 200;
                    dataObj.statusMessage = 'ok';
                    dataObj.data = data;
                }
                return dataObj;
            });
            output.responses[i].sequenceNumber = i;
        }

    }

    response.statusCode = 200;
    response.statusMessage = 'ok';
    response.status = 'success';
    response.data = output;
    return callback(response);
}

execProfile = function(jsonRequest, response, success) {
    var apiRequest = {
        'query': {}
    };
    // We need to mock the query string parameter object so all items need to be strings.
    // Default to empty string if one wasn't provided
    apiRequest.query.lat = jsonRequest.lat.toString() || '';
    apiRequest.query.lon = jsonRequest.lon.toString() || '';
    apiRequest.query.azimuth = jsonRequest.azimuth.toString() || '';
    apiRequest.query.start = jsonRequest.start.toString() || '';
    apiRequest.query.end = jsonRequest.end.toString() || '';
    apiRequest.query.num_points = jsonRequest.num_points.toString() || '';
    apiRequest.query.src = jsonRequest.src.toString() || '';
    apiRequest.query.unit = jsonRequest.unit.toString() || '';
    apiRequest.query.format = jsonRequest.format.toString() || 'json';

    try {
        return profile.getProfile(apiRequest, response, function(data){
            if(data){
                return success(null, data);    
            }
            return success(null, null);           
        });
    }
    catch(err) {
        console.error('\n\n execProfile err '+err);  
        return success(err, null);
    }  
};

module.exports.process = process;
