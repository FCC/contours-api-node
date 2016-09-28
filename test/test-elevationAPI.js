'use strict';

var request = require('supertest');
var server = require('../app.js');
var elevation = require('../controllers/elevation.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var should = chai.should();

describe('Elevation API test', function() {

    describe('lat/lon', function(done) {
        it('should return elevation data based on lat and lon only', function(done) {
            request(server)
                .get('/elevation.json?lat=38.22&lon=-78.5')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation');
                    done();
                });
        });

        it('should not return elevation data if lat and lon are not provided', function(done) {
            request(server)
                .get('/elevation.json?outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid parameters');
                    done();
                });
        });

        it('should check for invalid lat/lon input values', function(done) {
            request(server)
                .get('/elevation.json?lat=hhh&lon=ppp&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid input - latitude/longitude');
                    done();
                });
        });

        it('should check that -90 <= lat < 90 and -180 <= lon < 180', function(done) {
            request(server)
                .get('/elevation.json?lat=-9999&lon=9999&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid input - latitude/longitude');
                    done();
                });
        });
    });

    describe('src', function() {
        var srcVals = {
            'ned': '3DEP 1 arc-second',
            'ned_1': '3DEP 1 arc-second',
            'globe30': 'globe30',
            'usgs': '3DEP 1/3 arc-second',
        };       

        for (var key in srcVals) {
            chkSrc(key);
        }

        function chkSrc(key) {
            it('should return elevation data if src = ' + key, function(done) {
                var url = '/elevation.json?lat=38.6&lon=-78.5&outputcache=false&src=' + key;

                request(server)
                    .get(url)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }

                        res.body.features[0].properties.should.have.property('dataSource').be.equal(srcVals[key]);
                        done();
                    });
            });
        }

        it('should return elevation data if src = ned_2', function(done) {
            var url = '/elevation.json?lat=62.67414334669093&lon=-146.42578125&src=ned_2&unit=m&outputcache=';

            request(server)
                .get(url)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('dataSource').be.equal('3DEP 2 arc-second');
                    done();
                });
        });

        it('should return elevation data if src = ned_13', function(done) {
            var url = '/elevation.json?lat=39.095962936305476&lon=-103.9306640625&src=ned_13&unit=m&outputcache=';

            request(server)
                .get(url)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('dataSource').be.equal('3DEP 1/3 arc-second');
                    done();
                });
        });

        it('should return dataSource = ned if src is not provided', function(done) {
            request(server)
                .get('/elevation.json?lat=39.33&lon=-78.2&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('dataSource').be.equal('3DEP 1 arc-second');
                    done();
                });
        });

        it('should check for invalid src values', function(done) {
            request(server)
                .get('/elevation.json?lat=38.33&lon=-78.2&src=9999&unit=9999&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid input - source');
                    done();
                });
        });
    });

    describe('unit', function() {
        var unitVals = {
            'meters': 'm',
            'miles': 'mi',
            'feet': 'ft'
        };

        for (var key in unitVals) {
            chkUnit(key);
        }

        function chkUnit(key) {

            it('should return elevation data in ' + key, function(done) {
                var url = '/elevation.json?lat=38.22&lon=-78.5&outputcache=false&unit=' + unitVals[key];

                request(server)
                    .get(url)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }

                        res.body.features[0].properties.should.have.property('unit').be.equal(unitVals[key]);
                        done();
                    });
            });
        }

        it('should check for invalid unit values', function(done) {

            request(server)
                .get('/elevation.json?lat=38.33&lon=-78.2&unit=9999&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid input - unit');
                    done();
                });
        });

    });

    describe('src and unit', function() {

        it('should return elevation data if src and unit provided', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&lon=-78.5&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation');
                    done();
                });
        });

    });

    describe('all parameters', function() {

        it('should not return elevation data if src, unit, lat, and lon are missing', function(done) {

            request(server)
                .get('/elevation.json?outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid parameters');
                    done();
                });
        });


    });


    describe('format values', function() {
        it('should return JSON format', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&lon=-78.5&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    done();
                });
        });
    });

});
