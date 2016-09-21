var request = require('supertest');
var server = require('../app.js');

describe('Profile API test', function() {

    describe('lat/lon/azimuth', function(done) {
        it('should return profile data based on lat, lon, azimuth, src, and unit', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-77.5&azimuth=45.5&src=ned_1&unit=m')
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
	
        it('should not return profile data if lat is not provided', function(done) {
            request(server)
                .get('/profile.json?lon=-77.5&azimuth=45.5&src=ned_1&unit=m')
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
		
		it('should not return profile data if lon is not provided', function(done) {
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
		
		it('should not return profile data if lat < -90 or lat > 90', function(done) {
            request(server)
                .get('/profile.json?lat=90.5&lon=-90.5&azimuth=45.5&src=ned_1&unit=m')
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
		
		it('should not return profile data if lon < -180 or lon > 180', function(done) {
            request(server)
                .get('/profile.json?lat=38.5&lon=-190.5&azimuth=45.5&src=ned_1&unit=m')
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

	});

});	


        