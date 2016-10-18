var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();


describe('GET API docs', function() {
    it('should render API docs', function(done) {
        request(server)
            .get('/')
            .expect(200, done);
    });
});

describe('Test 404', function() {
    it('should return a 404 error', function(done) {
        request(server)
            .get('/asdfsad')
            .expect(404, done);
    });
});

describe('Test 500', function() {
    it('should return an Internal Server Error (500)', function(done) {
        request(server)
            .get('/tv/facilityid/.json')
            .expect(500)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }

                done();
            });
    });
});

describe('Test redirect when NODE_ENV = LOCAL or DEV', function() {
    it('should redirect /api/contours to /', function(done) {
        
        request(server)
            .get('/api/contours/tv/facilityid/65670.json')
            .expect(301, done);
    });
});