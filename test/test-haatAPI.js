var request = require('supertest');
var server = require('../app.js');

describe('HAAT API test', function() {

    describe('lat/lon/rcamsl/nradial', function(done) {
        it('should return HAAT data based on lat, lon, nradial, rcamsl, src, and unit', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('haat_azimuth');
                    done();
                });
        });
	
        it('should not return haat data if lat is not provided', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
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
		
		it('should not return haat data if lon is not provided', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lat=38.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
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
		
		it('should not return haat data if nradial is not provided', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&rcamsl=1000&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing nradial value');
                    done();
                });
        });
		
		it('should not return haat data if rcamsl is not provided', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing rcamsl value');
                    done();
                });
        });
		
		it('should not return haat data if lat < -90 or lat > 90', function(done) {
            this.timeout(10000);

            request(server)
                .get('/haat.json?lat=90.5&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
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
		
		it('should not return haat data if lon < -180 or lon > 180', function(done) {
            this.timeout(10000);

           request(server)
                .get('/haat.json?lat=38.5&lon=-190.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
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
		
		it('should not return haat data if nradial < 1 or nradial > 360', function(done) {
            this.timeout(10000);

           request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=0&rcamsl=1000&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('nradial value out of range');
                    done();
                });
        });
		
		it('should not return haat data if lat/lon is not a number', function(done) {
            this.timeout(10000);

           request(server)
                .get('/haat.json?lat=aaa&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid lat/lon value');
                    done();
                });
        });
		
		it('should not return haat data if nradial is not a number', function(done) {
            this.timeout(10000);

           request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=aaa&rcamsl=1000&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid nradial value');
                    done();
                });
        });
		
		it('should not return haat data if rcamsl is not a number', function(done) {
            this.timeout(10000);

           request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=aaa&src=ned_1&unit=m')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid rcamsl value');
                    done();
                });
        });
		

	});

});	


        