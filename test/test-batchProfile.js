'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

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
    this.timeout(10000);

    it('should return 400 error without json content-type header', function(done) {
        request(server)
            .post('/batch.json')
            .expect(400, done);
    });

    it('should return 400 error and message with an invalid json content-type header', function(done) {
        request(server)
            .post('/batch.json')
            .set('Content-Type','text/html')
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(400);
                    expect(res.body.statusMessage).to.equal('The Content-Type header was not set properly.');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 400 error if api is not set in request JSON', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        delete(localObject.api);
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .expect((res) => {
                expect(res.body.statusMessage).to.equal('Missing api parameter');
            })
            .expect(400, done);
    });

    it('should return 501 error if invalid API is requested', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        localObject.api = 'garbage';
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(501);
                    expect(res.body.statusMessage).to.equal('API not supported');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 400 error if payload array is not provided', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(400);
                    expect(res.body.statusMessage).to.equal('Missing requests parameter');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 400 error if request payload is not an array', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = {
            'foo': 'bar'
        };
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(400);
                    expect(res.body.statusMessage).to.equal('Invalid requests parameter');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 400 error if payload array is empty', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = [];
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(400);
                    expect(res.body.statusMessage).to.equal('Batch not provided');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 400 error if payload array is more than 500 items', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = [];
        for (var i=0; i<550; i++) {
            localObject.requests[i] = testObject.requests[0];
        }
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(400);
                    expect(res.body.statusMessage).to.equal('Number of requests exceeds maximum batch size (500)');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return 200 status and response if payload is processed successfully', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(200);
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.have.property('responses');
                    expect(res.body.data).to.have.property('requests');
                    expect(res.body.data.responses.length).to.equal(localObject.requests.length);
                    expect(res.body.data.requests[0]).to.have.property('sequenceNumber');
                    expect(res.body.data.responses[0]).to.have.property('sequenceNumber');
                    expect(res.body.data.responses[0].statusCode).to.equal('200');
                    expect(res.body.data.responses[1].statusCode).to.equal('200');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });

    it('should return nested errors in the response objects if request is bad', function(done) {
        var localObject = {};
        localObject.api = testObject.api;
        localObject.requests = testObject.requests;
        localObject.requests[0].azimuth = 400;
        request(server)
            .post('/batch.json')
            .set('Content-Type','application/json')
            .send(localObject)
            .end((err, res) => {
                if (err) { throw err; }
                try {
                    expect(res.statusCode).to.equal(200);
                    expect(res.body).to.have.property('data');
                    expect(res.body.data).to.have.property('responses');
                    expect(res.body.data.responses.length).to.equal(2);
                    expect(res.body.data.responses[0]).to.have.property('data');
                    expect(res.body.data.responses[0].data.features[0].properties.statusCode).to.be.equal('400');
                    expect(res.body.data.responses[0].data.features[0].properties.statusMessage).to.be.equal('Azimuth value out of range.');
                    expect(res.body.data.responses[1].data.features[0].properties.statusCode).to.be.equal('200');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });
});