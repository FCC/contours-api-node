var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Profile API test', function() {

    describe('lat/lon parameters', function(done) {
        it('should return profile data based on lat, lon, azimuth, src, and unit', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
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

        it('should not return profile data if lat value is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lat value');
                    done();
                });
        });

        it('should not return profile data if lat parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lat');
                    done();
                });
        });

        it('should not return profile data if lat < -90 or lat > 90', function(done) {
            request(server)
                .get('/profile.json?lat=900&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lat value out of range');
                    done();
                });
        });

        it('should not return profile data if lon value is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&azimuth=45.5&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lon value');
                    done();
                });
        });

        it('should not return profile data if lon value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=dsaf&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid lon value');
                    done();
                });
        });

        it('should not return profile data if lon < -180 or lon > 180', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-998.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lon value out of range');
                    done();
                });
        });

        it('should return data in CSV format', function(done) {
            request(server)
                .get('/profile.csv?lat=38.5&lon=-98.5&azimuth=45.5&outputcache=false')
                .expect('Content-Type', /csv/)
                .expect(200, done);
        });

    });

    describe('azimuth parameter', function(done) {
        it('should not return profile data if azimuth is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-77.5&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing azimuth value');
                    done();
                });
        });

        it('should not return profile data if azimuth value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=asdf&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid azimuth value');
                    done();
                });
        });

        it('should not return profile data if azimuth < 0 or azimuth > 360', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=4555.5&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('azimuth value out of range');
                    done();
                });
        });

        it('should set azimuth to 0 if provided azimuth value = 360', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=360&start=10&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('azimuth').be.equal('0');
                    done();
                });
        });
    });

    describe('start parameter', function(done) {
        it('should not return profile data if start value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=adsf&end=1000&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid start value');
                    done();
                });
        });
    });

    describe('end parameter', function(done) {
        it('should not return profile data if start value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=10&end=lkadjkl&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid end value');
                    done();
                });
        });

        it('should not return profile data if end value <= start value', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=5&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('end is not larger than start');
                    done();
                });
        });
    });

    describe('src parameter', function(done) {
        it('should return profile data based on src = globe30', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=100&num_points=10&src=globe30&unit=m')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('globe30');
                    done();
                });
        });

        it('should return profile data based on ned_1 if src is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-77.5&azimuth=45.5&unit=m')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('ned_1');
                    done();
                });
        });

        it('should not return profile data if src is not ned_1 or globe30', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=kdkd&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('wrong src - must be ned_1 or globe30');
                    done();
                });
        });
    });

    describe('unit parameter', function(done) {
        it('should return profile data based on unit = mi', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&src=ned_1&unit=mi&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('unit').be.equal('mi');
                    done();
                });
        });

        it('should return profile data based on unit = ft', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&src=ned_1&unit=ft&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('unit').be.equal('ft');
                    done();
                });
        });

        it('should return profile data based on meters if unit is not m, mi, ft', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&src=ned_1&unit=phjjhk&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('unit').be.equal('m');
                    done();
                });
        });

        it('should not return profile if unit is not m, mi, ft', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=alskfd')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('wrong unit - must be m, ft, or mi');
                    done();
                });
        });
    });

    describe('end parameter', function(done) {
        it('should not return profile data if end parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&num_points=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing end');
                    done();
                });
        });
    });

    describe('num_points parameter', function(done) {
        it('should not return profile data if num_points parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=10&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing num_points');
                    done();
                });
        });

        it('should not return profile data if num_points value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=10&end=100&num_points=asdf&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid num_points value');
                    done();
                });
        });

        it('should not return profile data if num_points < 2', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=1&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('num_points is smaller than 2');
                    done();
                });
        });
    });
});
