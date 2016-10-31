'use strict';

var request = require('supertest');
var server = require('../app.js');
var haat = require('../controllers/haat.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('HAAT API test', function() {


    /*describe.only('set NODE_ENV', function(done) {
        it('should set data_dir to /var/data', function(done) {
            // haat.NODE_ENV = 'DEV';
            // expect(haat.data_dir).to.equal('/var/data');

            console.log(haat);
        });
    });*/

    describe('all parameters', function(done) {
        it('should return HAAT data based on lat, lon, nradial, rcamsl, src, and unit', function(done) {
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

    });

    describe('lat parameter', function(done) { 
        it('should not return HAAT data if lat value is invalid', function(done) {
            request(server)
                .get('/haat.json?lat=aaa&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
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

        it('should not return haat data if lat is not provided', function(done) {
            request(server)
                .get('/haat.json?lon=-98.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing latitude (lat) value.');
                    done();
                });
        });

        it('should not return haat data if lat < -90 or lat > 90', function(done) {
            request(server)
                .get('/haat.json?lat=90.5&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
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
    });

    describe('lon parameter', function(done) {
        it('should not return HAAT data if lon value is invalid', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-adsf&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
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

        it('should not return haat data if lon is not provided', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing longitude (lon) value.');
                    done();
                });
        });

        it('should not return haat data if lon < -180 or lon > 180', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-190.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Longitude value is out of range (-180 < lon < 180).');
                    done();
                });
        });
    });

    describe('nradial parameter', function(done) {
        it('should not return haat data if nradial is not provided', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing nradial value.');
                    done();
                });
        });

        it('should not return haat data if nradial < 1 or nradial > 360', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=0&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('nradial value out of range.');
                    done();
                });
        });

        it('should not return haat data if nradial is not a number', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-98.5&nradial=dsd&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid nradial value.');
                    done();
                });
        });
    });

    describe('rcamsl parameter', function(done) {
        it('should not return haat data if rcamsl is not provided', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-98.5&nradial=360&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Missing RCAMSL value.');
                    done();
                });
        });

        it('should not return haat data if rcamsl is not a number', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=aaa&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('Invalid RCAMSL value.');
                    done();
                });
        });
    });

    describe('src parameter', function(done) {
        this.timeout(5000);

        it('should return haat data based on src = ned_1 if src != ned_1 or globe30', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=1000&src=kasdf&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('ned_1');
                    done();
                });
        });

        it('should return haat data based on src = ned_1', function(done) {
            request(server)
                .get('/haat.json?lat=35.1019340572&lon=-97.2509765625&nradial=10&rcamsl=100&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('ned_1');
                    done();
                });
        });

        it('should return haat data based on src = globe30', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=1000&src=globe30&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('globe30');
                    done();
                });
        });
    });

    describe('unit parameter', function(done) {
        this.timeout(5000);

        it('should return haat data based on unit = m if unit != m, mi, ft', function(done) {
            request(server)
                .get('/haat.json?lat=38.5&lon=-77.5&nradial=360&rcamsl=1000&src=globe30&unit=aks&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('200');
                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('globe30');
                    done();
                });
        });
    });

    describe('format parameter', function(done) {
        it('should return data in CSV format', function(done) {
            request(server)
                .get('/haat.csv?lat=38.5&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
                .expect('Content-Type', /csv/)
                .expect(200, done);
        });
    });

});
