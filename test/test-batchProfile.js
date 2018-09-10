'use strict';

var supertest = require('supertest');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var assert = require('assert');

var api = supertest('http://localhost:6479');

var compare;

const testObject = {
    'api': 'profile',
    'requests': [
        {
            'lat': 34.6875,
            'lon': -82.986944444,
            'azimuth': 0,
            'start': 0,
            'end': 16.09344,
            'num_points': 51,
            'src': 'ned_1',
            'unit': 'm',
            'format': 'json'
          },
          {
            'lat': 34.6875,
            'lon': -82.986944444,
            'azimuth': 180,
            'start': 0,
            'end': 16.09344,
            'num_points': 51,
            'src': 'ned_1',
            'unit': 'm',
            'format': 'json'
          }
    ]
};

describe('Batch Profile API', function() {
    it('Return 400 error without json content-type header', function(done) {
        api.post('/batch.json')
            .expect(400, done);
    });

    it('Return 400 error and message with an invalid json content-type header', function(done) {
        api.post('/batch.json')
            .set('Content-Type','text/html')
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('The Content-Type header was not set properly.');
            })
            .expect(400, done);
    });

    it('Return 400 error if api is not set in request JSON', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        delete(localObject.api);
        api.post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('Missing api parameter');
            })
            .expect(400, done);
    });

    it('Return 501 error if invalid API is requested', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        localObject.api = 'garbage';
        api.post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('API not supported');
            })
            .expect(501, done);
    });

    it('Return 400 error if payload array is not provided', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = [];
        api.post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('Batch not provided');
            })
            .expect(400, done);
    });

    it('Return 400 error if payload array is more than 500 items', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = [];
        for (var i=0; i<550; i++) {
            localObject.requests[i] = testObject.requests[0];
        }
        api.post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('Number of requests exceeds maximum batch size (500)');
            })
            .expect(400, done);
    });

    it('Return 200 status and response if payload is processed successfully', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        api.post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body).to.have.property('data');
                expect(res.body.data).to.have.property('responses');
                expect(res.body.data).to.have.property('requests');
                expect(res.body.data.responses.length).to.equal(localObject.requests.length);
                expect(res.body.data.requests[0]).to.have.property('sequenceNumber');
                expect(res.body.data.responses[0]).to.have.property('sequenceNumber');
                expect(res.body.data.responses[0].statusCode).to.be.equal(200);
                expect(res.body.data.responses[1].statusCode).to.be.equal(200);
            })
            .expect(200, done);
    }).timeout(15000);
});

function compare(expected, actual) {
    if (expected !== actual) {
        throw new Error('Expected=\''+expected+'\', Actual=\''+actual+'\'');
    }
}