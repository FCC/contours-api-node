'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Coverage API test', function() {
    
    describe('/lat/lon/nradial/rcamsl/erp/channel/field/curve/serviceType', function(done) {

        it('should return contour based on lat, lon, nradial, rcamsl, erp, channel, field, curve, serviceType', function(done) {
            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('ok');
                    done();
                });
        });
    });

    describe('lat parameter', function(done) {

        it('should not return contour if lat value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=xxx&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid lat value');
                    done();
                });
        });

        it('should not return contour if lat input is missing', function(done) {

            request(server)
                .get('/coverage.json?lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lat');
                    done();
                });
        });

        it('should not return contour if lat has more than 10 decimal places', function(done) {

            request(server)
                .get('/coverage.json?lat=38.1234567890123&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('number of decimal places for lat is larger than 10');
                    done();
                });
        });

        it('should not return contour if lat value is out of range [-90, 90]', function(done) {

            request(server)
                .get('/coverage.json?lat=99&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lat value out of range');
                    done();
                });
        });
    });

    describe('lon parameter', function(done) {

        it('should not return contour if lon value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=xxx&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid lon value');
                    done();
                });
        });

        it('should not return contour if lon input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing lon');
                    done();
                });
        });

        it('should not return contour if lon has more then 10 decimal places', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.1234567890123&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('number of decimal places for lon is larger than 10');
                    done();
                });
        });

        it('should not return contour if lon value is out of range [-180, 180]', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-181&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('lon value out of range');
                    done();
                });
        });

    });

    describe('channel parameter', function(done) {

         it('should not return contour data if serviceType = tv and channel = 200', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&field=28&erp=52&curve=0&channel=200&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('channel').be.equal(200);
                    done();
                });
        });

        it('should not return contour data if channel = 100', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&field=28&erp=52&curve=0&channel=100&serviceType=tv')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('error in distance calculation');
                    done();
                });
        });

        it('should return contour if serviceType = fm and channel input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&field=28&erp=52&curve=0&serviceType=fm')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('serviceType').be.equal('fm');
                    done();
                });
        });

        it('should not return contour if channel value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=xxx&field=28&erp=52&curve=0&serviceType=tv')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid channel value');
                    done();
                });
        });

        it('should not return contour if serviceType=tv and channel is not provided', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&field=28&erp=52&curve=0&serviceType=tv')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing channel');
                    done();
                });
        });
    });

    describe('nradial parameter', function(done) {

        it('should not return contour if nradial value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=xxx&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid nradial value');
                    done();
                });
        });

        it('should not return contour if nradial input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing nradial');
                    done();
                });
        });

        it('should not return contour if nradial value is out of range [3, 360]', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=2&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('nradial value out of range [3, 360]');
                    done();
                });
        });
    });

    describe('curve parameter', function(done) {

        it('should not return contour if curve input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing curve');
                    done();
                });
        });

        it('should return contour data if curve value is 0', function(done) {
            
            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&serviceType=fm&curve=0&outputcache=false')
                .set('Accept', 'application/json')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('curve').be.equal(0);
                    done();
                });
        });

        it('should return contour data if curve value is 1', function(done) {
            
            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&serviceType=fm&outputcache=false&curve=1')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('curve').be.equal(1);
                    done();
                });
        });

        it('should return contour data if curve value is 2', function(done) {
            
            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&serviceType=fm&outputcache=false&curve=2')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('curve').be.equal(2);
                    done();
                });
        });

        it('should not return contour if curve value is out of range [0, 2]', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=3&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('curve value out of range [0, 2]');
                    done();
                });
        });

        it('should not return contour if curve value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=afds&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid curve value');
                    done();
                });
        });
    });

    describe('erp parameter', function(done) {

        it('should not return contour if erp input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing erp');
                    done();
                });
        });

        it('should not return contour if erp value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=xxx&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid erp value');
                    done();
                });
        });
    });

    describe('rcamsl parameter', function(done) {

        it('should not return contour if rcamsl input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing rcamsl');
                    done();
                });
        });

        it('should not return contour if rcamsl value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=xxx&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid rcamsl value');
                    done();
                });
        });
    });

    describe('field parameter', function(done) {

        it('should not return contour if field input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&erp=52&curve=0&serviceType=fm&outputcache=false')
                .set('Accept', 'application/json')
                .expect(400)
                .expect(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing field');
                    done();
                });
        });

        it('should not return contour if field value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&field=dsk&nradial=360&unit=m&channel=9&erp=52&curve=0&serviceType=fm')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid dbu value');
                    done();
                });
        });
    });

    describe('serviceType parameter', function(done) {

        it('should not return contour if serviceType input is missing', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('missing serviceType');
                    done();
                });
        });

        it('should not return contour if serviceType value is invalid', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&src=ned_1&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=3kaf&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('invalid serviceType value');
                    done();
                });
        });
    });

    describe('src parameter', function(done) {

        it('should return contour based on ned_1 if src is undefined', function(done) {

            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&rcamsl=309&nradial=360&unit=m&channel=9&field=28&erp=52&curve=0&serviceType=fm&outputcache=false')
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('elevation_data_source').be.equal('ned_1');
                    done();
                });
        });
    });

    describe('unit parameter', function(done) {

        it('should return contour based on meters if unit is undefined', function(done) {
            request(server)
                .get('/coverage.json?lat=38.95039&lon=-77.07942&rcamsl=309&nradial=360&channel=9&field=28&erp=52&curve=0&serviceType=fm')
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
    });

    describe('pattern parameter', function(done) {

        it('should return contour based on pattern value', function(done) {
            request(server)
                .get('/coverage.json?serviceType=tv&lat=38.95039108&lon=-77.07942&nradial=360&rcamsl=309.5&field=36&channel=9&erp=52&curve=2&src=globe30&unit=m&pattern=0,0.63;10,0.57;20,0.58;30,0.595;40,0.62;50,0.64;60,0.72;70,0.82;80,0.925;90,0.99;94,1;100,1;110,1;120,1;130,1;140,1;150,1;160,1;170,1;180,1;190,1;200,1;210,1;220,1;230,1;240,1;250,1;260,1;270,1;280,1;290,1;300,1;310,1;320,0.96;330,0.9;340,0.8;350,0.72&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('ok');
                    done();
                });
        });

        it('should return contour if pattern value is not provided', function(done) {
            request(server)
                .get('/coverage.json?serviceType=tv&lat=38.95039108&lon=-77.07942&nradial=360&rcamsl=309.5&field=36&channel=9&erp=52&curve=2&src=globe30&unit=m&pattern=&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('ok');
                    done();
                });
        });

         it('should return contour if pattern parameter is not provided', function(done) {
            request(server)
                .get('/coverage.json?serviceType=tv&lat=38.95039108&lon=-77.07942&nradial=360&rcamsl=309.5&field=36&channel=9&erp=52&curve=2&src=globe30&unit=m&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.features[0].properties.should.have.property('statusMessage').be.equal('ok');
                    done();
                });
        });
    });
});
