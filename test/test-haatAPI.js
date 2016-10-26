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

    describe('lat/lon parameters', function(done) {
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lat value');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lon value');
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

                    res.body.features[0].properties.should.have.property('statusCode').be.equal('400');
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lat value out of range');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lon value out of range');
                    done();
                });
        });

        it('should not return haat data if lat/lon is not a number', function(done) {
            request(server)
                .get('/haat.json?lat=aaa&lon=-77.5&nradial=360&rcamsl=1000&src=ned_1&unit=m&outputcache=false')
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing nradial value');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('nradial value out of range');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid nradial value');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing rcamsl value');
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
                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid rcamsl value');
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
