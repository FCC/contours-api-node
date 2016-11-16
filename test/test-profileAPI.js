var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Profile API test', function() {

    describe('all parameters', function(done) {
        it('should return profile data based on lat, lon, azimuth, src, and unit', function(done) {
            request(server)
                .get('/profile.json?lat=37.4399740523&lon=-97.4267578125&azimuth=45.5&start=10&end=100&num_points=100&src=ned_1&unit=m')
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

     describe('lat parameter', function(done) {

        it('should not return profile data if lat value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=aksdf&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
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

        it('should not return profile data if lat parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lon=-98.5azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing latitude (lat) value.');
                    done();
                });
        });

        it('should not return profile data if lat < -90 or lat > 90', function(done) {
            request(server)
                .get('/profile.json?lat=138.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
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

        it('should not return profile data if lat has more than 10 decimal places', function(done) {

            request(server)
                .get('/profile.json?lat=38.01234567896&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
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

    describe('lon parameter', function(done) {

        it('should not return profile data if lon value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=dsaf&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
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

        it('should not return profile data if lon parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing longitude (lon) value.');
                    done();
                });
        });

        it('should not return profile data if lon < -180 or lon > 180', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-998.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
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

        it('should not return profile data if lon has more than 10 decimal places', function(done) {

            request(server)
                .get('/profile.json?lat=38&lon=-98.01234567891&azimuth=45.5&start=10&end=100&num_points=100&src=ned_1&unit=m&outputcache=false')
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

    describe('format parameter', function(done) {
        it('should return data in CSV format', function(done) {
            request(server)
                .get('/profile.csv?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /csv/)
                .expect(200, done);
        });

        it('should not return data if format value is invalid', function(done) {
            request(server)
                .get('/profile.adsf?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect(400, done);
        });
    });

    describe('azimuth parameter', function(done) {
        it('should not return profile data if azimuth is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-77.5&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing azimuth.');
                    done();
                });
        });

        it('should not return profile data if azimuth value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=asdf&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid azimuth value.');
                    done();
                });
        });

        it('should not return profile data if azimuth < 0 or azimuth > 360', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=4555.5&start=10&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Azimuth value out of range.');
                    done();
                });
        });

        it('should set azimuth to 0 if provided azimuth value = 360', function(done) {
            request(server)
                .get('/profile.json?lat=37.4399740523&lon=-97.4267578125&azimuth=360&start=10&end=100&num_points=100&src=ned_1&unit=m&outputcache')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('azimuth').be.equal(0);
                    done();
                });
        });
    });

    describe('start parameter', function(done) {
        it('should not return profile data if start value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=adsf&end=1000&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid start value.');
                    done();
                });
        });
    });

    describe('end parameter', function(done) {
        it('should not return profile data if start value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=10&end=lkadjkl&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid end value.');
                    done();
                });
        });

        it('should not return profile data if end value <= start value', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=5&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('End is not larger than start.');
                    done();
                });
        });
    });

    describe('src parameter', function(done) {
        it('should return profile data based on src = globe30', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=100&num_points=10&src=globe30&unit=m&outputcache=false')
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

        it('should return profile data based on globe30 if src is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-77.5&azimuth=45.5&start=10&end=1000&num_points=10&unit=m&outputcache=false')
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

        it('should not return profile data if src is not ned_1 or globe30', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=kdkd&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid src - must be ned_1 or globe30.');
                    done();
                });
        });
    });

    describe('unit parameter', function(done) {
        it('should return profile data based on unit = mi', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=mi&outputcache=false')
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
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=ft&outputcache=false')
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

        /*it('should return profile data based on meters if unit is not m, mi, ft', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=phjjhk&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid unit - must be m, ft, or mi');
                    done();
                });
        });*/

        it('should not return profile if unit is not m, mi, ft', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=10&src=ned_1&unit=alskfd&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid unit - must be m, ft, or mi.');
                    done();
                });
        });
    });

    describe('end parameter', function(done) {
        it('should not return profile data if end parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&num_points=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing end.');
                    done();
                });
        });
    });

    describe('num_points parameter', function(done) {
        it('should not return profile data if num_points parameter is not provided', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=10&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing num_points.');
                    done();
                });
        });

        it('should not return profile data if num_points value is invalid', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=98.5&azimuth=45.5&start=10&end=100&num_points=asdf&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid num_points value.');
                    done();
                });
        });

        it('should not return profile data if num_points < 2', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-98.5&azimuth=45.5&start=10&end=1000&num_points=1&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('num_points is smaller than 2.');
                    done();
                });
        });
    });
});
