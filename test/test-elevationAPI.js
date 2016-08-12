var request = require('supertest');
var server = require('../app.js');

describe('Elevation API test', function() {

    describe('lat/lon', function() {
        it('should return elevation data based on lat and lon only', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&long=-78.5')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('elevation');
                    done();
                });
        });

        it('should not return elevation data if lat and lon are not provided', function(done) {

            request(server)
                .get('/elevation.json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('unable to process elevation data');
                    done();
                });
        });

        it('should check for invalid lat/lon input values', function(done) {

            request(server)
                .get('/elevation.json?lat=9999&long=9999')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('Invalid Input - Latitude/Longitude');
                    done();
                });
        });
    });

    describe('src', function() {
        var srcVals = {
            'ned_1': '3DEP 1 arc-second',
            // 'ned_13': '3DEP 1/3 arc-second',            
            'usgs': '3DEP 1/3 arc-second'
        };

        for (var key in srcVals) {
            chkSrc(key);
        }

        function chkSrc(key) {
            it('should return elevation data if src = ' + key, function(done) {
              var url = '/elevation.json?lat=38.22&long=-78.5&src=' + key;

                request(server)
                    .get(url)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }

                        res.body.should.have.property('data source').be.equal(srcVals[key]);
                        done();
                    });
            });
        }

        it('should check for invalid src values', function(done) {

            request(server)
                .get('/elevation.json?lat=38.33&long=-78.2&src=9999&unit=9999')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('Invalid Input - Source');
                    done();
                });
        });
    });

    describe('unit', function() {
        var unitVals = {
            'meters': 'meters'
                // 'miles': 'miles',
                // 'feet': 'ft'
        };

        for (var key in unitVals) {
            chkUnit(key);
        }       

        function chkUnit(key) {
            it('should return elevation data in ' + key, function(done) {
              var url = '/elevation.json?lat=38.22&long=-78.5&unit=' + key;

                request(server)
                    .get(url)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }

                        res.body.should.have.property('unit').be.equal(unitVals[key]);
                        done();
                    });
            });
        }

        it('should check for invalid unit values', function(done) {

            request(server)
                .get('/elevation.json?lat=38.33&long=-78.2&unit=9999')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('Invalid Input - Unit');
                    done();
                });
        });

    });

    describe('src and unit', function() {

        it('should return elevation data if src and unit provided', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&long=-78.5&src=ned_1&unit=meters')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('elevation');
                    done();
                });
        });

    });

    describe('format', function() {
        it('should return JSON format', function(done) {

            request(server)
                .get('/elevation.json?lat=38.22&long=-78.5&src=ned_1&unit=meters')
                .expect('Content-Type', /json/)
                .expect(200, done);
        });
    });
});
