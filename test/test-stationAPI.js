'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Station API test', function() {

    describe('service_type', function(done) {

        it('should return station data if station type is am, fm, or tv', function(done) {
            request(server)
                .get('/station.json?service_type=AM&callsign=waam')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('200');
                    
                    done();
                });
        });

        it('should not return station data if station type is not am, fm, or tv', function(done) {
            request(server)
                .get('/station.json?service_type=')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('error: invalid service type: GH');
                    done();
                });
        });
    });

    describe('callsign and facility_id', function(done) {

        it('should not return station data if callsign and facility_id are provided', function(done) {
            request(server)
                .get('/station.json?service_type=FM&callsign=wnpr&facility_id=13627')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('Both callsign and facility_id provided');
                    done();
                });
        });

        it('should not return station data if callsign or facility_id are not provided', function(done) {
            request(server)
                .get('/station.json?service_type=FM')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('no callsign or facility_id provided');
                    done();
                });
        });

        it('should not return station data if callsign is undefined and facility_id is invalid', function(done) {
            request(server)
                .get('/station.json?service_type=FM&facility_id=13627ggg')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid facility_id value');
                    done();
                });
        });

        it('should return an error 400 if no parameters are provided', function(done) {
            request(server)
                .get('/station.json')
                .expect('Content-Type', /json/)
                .expect(400, done);
        });
    });

    describe('CDBS connection', function(done) {

        it('should return an error 400 if it can not connect to CDBS with FM callsign=wnpr', function(done) {
            request(server)
                .get('/station.json?service_type=FM&callsign=wnpr')
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('should return an error 400 if it can not connect to CDBS for an AM callsign=WAAM', function(done) {
            request(server)
                .get('/station.json?service_type=AM&callsign=WAAM')
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('should return an error 400 if it can not connect to CDBS for an TV callsign=WBAL-TV', function(done) {
            request(server)
                .get('/station.json?service_type=TV&callsign=WBAL-TV')
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('should return an error 400 if it can not connect to CDBS for an TV facility_id=65670', function(done) {
            request(server)
                .get('/station.json?service_type=TV&facility_id=65670')
                .expect('Content-Type', /json/)
                .expect(400, done);
        });


        it('should return an error 400 if CDBS can not execute query', function(done) {
            request(server)
                .get('/station.json?service_type=TV&facility_id=65670')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('error executing CDBS query');
                    done();
                });
        });

        it('should return a status of 200 when CDBS disconnects', function(done) {
            request(server)
                .get('/station.json?service_type=TV&facility_id=65670')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('ok');
                    done();
                });
        });
    });
});
