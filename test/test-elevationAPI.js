'use strict';

var request = require('supertest');
var server = require('../app.js');
var elevation = require('../controllers/elevation.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var should = chai.should();

describe('Elevation API test', function() {

    describe('lat/lon parameters', function(done) {
        it('should return elevation data based on lat and lon only', function(done) {
            request(server)
                .get('/elevation.json?lat=38.22&lon=-78.5')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('elevation').be.equal(430.32);
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid parameters.');
                    done();
                });
        });
        
    });

    describe('lat parameter', function() {

        it('should not return elevation data if lat value is invalid', function(done) {

            request(server)
                .get('/elevation.json?lat=hhh&lon=-98.5&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid latitude (lat) value.');
                    done();
                });
        });

        it('should not return elevation data if lat is out of range [-90, 90]', function(done) {
            request(server)
                .get('/elevation.json?lat=9999&lon=-98.5&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Latitude value is out of range (-90 < lat < 90).');
                    done();
                });
        });

        it('should not return contour if lat has more than 10 decimal places', function(done) {

            request(server)
                .get('/elevation.json?lat=38.4449846689124312341234&lon=-100.9259033203123412341234123&src=ned&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Number of decimal places for lat is larger than 10.');
                    done();
                });
        });

    });

    describe('lon parameter', function() {

        it('should not return elevation data if lon value is invalid', function(done) {

            request(server)
                .get('/elevation.json?lat=38&lon=-asdf&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid longitude (lon) value.');
                    done();
                });
        });

        it('should not return elevation data if lon is out of range [-180, 180]', function(done) {
            request(server)
                .get('/elevation.json?lat=38.5&lon=-999&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Longitude value is out of range (-180 < lon < 180).');
                    done();
                });
        });

        it('should not return contour if lon has more than 10 decimal places', function(done) {

            request(server)
                .get('/elevation.json?lat=38.5&lon=-100.9259033203123412341234123&src=ned&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Number of decimal places for lon is larger than 10.');
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
            var url = '/elevation.json?lat=62&lon=-150&src=ned_2&unit=m&outputcache=false';

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
            var url = '/elevation.json?lat=39&lon=-99&src=ned_13&unit=m&outputcache=false';

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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid source value.');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid unit value.');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid parameters.');
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

    describe('elasticache parameter', function() {
        it('should return JSON from ElastiCache', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&lon=-78.5&src=ned_1&unit=m')
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
