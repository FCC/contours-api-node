'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();


describe('Coords API test', function() {
    // The projection API
    describe('Projection API', function() {

        describe('Correct params and vals', function() {

            it('should return new coordinates in the output projection outProj', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=39.1313111&inProj=wgs84&outProj=nad27&outType=DMS')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.output.projection.should.be.equal('EPSG:4267 (NAD27)');
                    done();
                });
            
            

            });
            
            it('should return new coordinates in the output projection outProj without outType', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=39.1313111&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('output').property('projection').be.equal('EPSG:4267 (NAD27)');
                    done();
                });
            });
        });

        describe('Missing params', function() {

            it('should return an error JSON object if lon parameter is missing', function(done) {
            request(server)
                .get('/project?lat=39.1313111&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if lat parameter is missing', function(done) {
            request(server)
                .get('/project?lon=39.1313111&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if inProj parameter is missing', function(done) {
            request(server)
                .get('/project?lon=-77.2121212&lat=39.1313111&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if outProj parameter is missing', function(done) {
            request(server)
                .get('/project?lon=-77.2121212&lat=39.1313111&inProj=wgs84')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });
            
        });

        describe('Invalid params values', function() {

            it('should return an error JSON object if the value of lon parameter is invalid', function(done) {
            request(server)
                .get('/project?lon=abc&lat=39.1313111&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude error');
                    done();
                });
            });

            it('should return an error JSON object if the value of lat parameter is invalid', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=abc&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude error');
                    done();
                });
            });

            it('should return an error JSON object if the value of inProj parameter is invalid', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=39.1313111&inProj=utm13&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Input projection invalid');
                    done();
                });
            });

            it('should return an error JSON object if the value of outProj parameter is invalid', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=39.1313111&inProj=wgs84&outProj=utm13')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Output projection invalid');
                    done();
                });
            });
            
        });

        describe('Out of range error', function() {

            it('should return an error JSON object if lon parameter is not between -180 and 180', function(done) {
            request(server)
                .get('/project?lon=-277.7201723&lat=39.1313111&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude error');
                    done();
                });
            });

            it('should return an error JSON object if lat parameter is not between -90 and 90', function(done) {
            request(server)
                .get('/project?lon=-77.2112121&lat=90.101011&inProj=wgs84&outProj=nad27')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude error');
                    done();
                });
            });
            
        });
    });

    // The dd2dms API
    describe('dd2dms API', function() {

        describe('Correct params and vals', function() {

            it('should return degree|minute|second format from decimal degree input', function(done) {
            request(server)
                .get('/dd2dms?lat=28.23113&lon=25.324242')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.output.lon_parsed.degrees.should.be.equal(25);
                    done();
                });
            });

        });

        describe('Missing params', function() {

            it('should return an error JSON object if lon parameter is missing', function(done) {
            request(server)
                .get('/dd2dms?lat=28.23113')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if lat parameter is missing', function(done) {
            request(server)
                .get('/dd2dms?lon=25.324242')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });
            
        });

        describe('Invalid param values', function() {

            it('should return an error JSON object if the value of lon parameter is invalid', function(done) {
            request(server)
                .get('/dd2dms?lon=xyz&lat=25.324242')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude error');
                    done();
                });
            });

            it('should return an error JSON object if the value of lat parameter is invalid', function(done) {
            request(server)
                .get('/dd2dms?lat=mno&lon=25.324242')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude error');
                    done();
                });
            });

        });

        describe('Out of range error', function() {

            it('should return an error JSON object if lon parameter is not between -180 and 180', function(done) {
            request(server)
                .get('/dd2dms?lat=28.23113&lon=3125.324242')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude error');
                    done();
                });
            });

            it('should return an error JSON object if lat parameter is not between -90 and 90', function(done) {
            request(server)
                .get('/dd2dms?lat=1028.23113&lon=25.324242')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude error');
                    done();
                });
            });
            
        });

    });

    // The dms2dd API
    describe('dms2dd API', function() {

        describe('Correct params and vals', function() {

            it('should return decimal degrees format from degree|minute|second input', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=E&latD=28&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.output.lon.should.be.equal(-48.7289508);
                    
                    done();
                });
            
            

            });

        });

        describe('Missing params', function() {

            it('should return an error JSON object if lonD parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if lonM parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if lonS parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if lonDi parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if latD parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if latM parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if latS parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

            it('should return an error JSON object if latDi parameter is missing', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Missing one or more of the params');
                    done();
                });
            });

        });

        describe('Invalid params values', function() {

            it('should return an error JSON object if the value of lonD parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=xyz&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if if the value of lonM parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=xyz&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude minutes error');
                    done();
                });
            });

            it('should return an error JSON object if the value of lonS parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=xyz&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude seconds error');
                    done();
                });
            });

            it('should return an error JSON object if the value of lonDi parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=123&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude direction error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latD parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=xyz&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latM parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=xyz&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude minutes error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latS parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=xyz&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude seconds error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latDi parameter is invalid', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=123')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude direction error');
                    done();
                });
            });
            
        });

        describe('Not integers, degrees and minutes', function() {

            it('should return an error JSON object if the value of lonD is not an integer', function(done) {
            request(server)
                .get('/dms2dd?lonD=24.001&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if if the value of lonM parameter is not an integer', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=54.0001&lonS=44.222223&lonDi=E&latD=28&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude minutes error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latD parameter is not an integer', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=25.002&latM=23&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if the value of latM parameter is not an integer', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.222223&lonDi=E&latD=28&latM=45.45&latS=34.222223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude minutes error');
                    done();
                });
            });
            
        });

        describe('Out of range error', function() {

            it('should return an error JSON object if lonD parameter is out of the range -180 - 180', function(done) {
            request(server)
                .get('/dms2dd?lonD=-248&lonM=43&lonS=44.223&lonDi=E&latD=28&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if lonM parameter is out of the range 0-60', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=77&lonS=44.223&lonDi=E&latD=28&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude minutes error');
                    done();
                });
            });

            it('should return an error JSON object if lonS parameter is out of the range 0.0-60.0', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=60.505&lonDi=E&latD=28&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude seconds error');
                    done();
                });
            });

            it('should return an error JSON object if lonDi parameter is not E or W', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=T&latD=28&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Longitude direction error');
                    done();
                });
            });

            it('should return an error JSON object if latD parameter is out of the range -90 - 90', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=E&latD=101&latM=23&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude degrees error');
                    done();
                });
            });

            it('should return an error JSON object if latM parameter is out of the range 0-60', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=E&latD=28&latM=66&latS=34.223&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude minutes error');
                    done();
                });
            });

            it('should return an error JSON object if latS parameter is out of the range 0.0-60.0', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=E&latD=28&latM=23&latS=64.01&latDi=N')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude seconds error');
                    done();
                });
            });

            it('should return an error JSON object if latDi parameter is not N or S', function(done) {
            request(server)
                .get('/dms2dd?lonD=-48&lonM=43&lonS=44.223&lonDi=E&latD=28&latM=23&latS=34.223&latDi=L')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('error_type').be.equal('Latitude direction error');
                    done();
                });
            });

        });

    });

});