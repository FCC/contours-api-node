'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Disance API test', function() {

    describe('all parameters', function(done) {
        it('should return distance based on haat, field, erp, channel, curv, serviceType', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('distance').be.equal(86.29);
                    done();
                });
        });

        it('should not return distance if it can not be calculated based on parameter values', function(done) {
            request(server)
                .get('/distance.json?haat=1600&field=3&erp=0&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusMessage').be.equal('distance error occurred');
                    done();
                });
        });
    });

    describe('erp parameter', function(done) {
        it('should not return distance if erp input is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&channel=5&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing erp');
                    done();
                });
        });

        it('should not return distance if erp value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=x&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid erp value');
                    done();
                });
        });
        
        it('should not return distance if ERP for VHF, TV Channels 2-6 > 400', function(done) {
            request(server)
                .get('/distance.json?haat=30&field=3&erp=900&curve=0&serviceType=tv&channel=2&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusMessage').be.equal('Maximum ERP for VHF, TV Channels 2-6, is 400 kW');
                    done();
                });
        });

        it('should not return distance if ERP for VHF, TV Channels 7-13 > 400 kW', function(done) {
            request(server)
                .get('/distance.json?haat=30&field=3&erp=900&curve=0&serviceType=tv&channel=7&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusMessage').be.equal('Maximum ERP for VHF, TV Channels 7-13, is 400 kW');
                    done();
                });
        });

        it('should not return distance if ERP for UHF, TV Channels 14-69 > 5500 kW', function(done) {
            request(server)
                .get('/distance.json?haat=30&field=3&erp=9900&curve=0&serviceType=tv&channel=14&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusMessage').be.equal('Maximum ERP for UHF, TV Channels 14-69, is 5500 kW');
                    done();
                });
        });
    });

    describe('channel parameter', function(done) {
        it('should not return distance if channel value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=x&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid channel value');
                    done();
                });
        });
    });

    describe('curve parameter', function(done) {
       it('should return distance if curve value = 2', function(done) {
            request(server)
                .get('/distance.json?haat=30&field=3&erp=400&curve=2&serviceType=tv&channel=2&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('distance').be.equal(284.664);
                    done();
                });
        });

        it('should not return distance if curve input is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing curve');
                    done();
                });
        });

        it('should not return distance if curve value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=x&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid curve value');
                    done();
                });
        });
        
    });

    describe('serviceType parameter', function(done) {
        it('should return distance if serviceType=fm and channel input is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('haat').be.equal(150);
                    done();
                });
        });

        it('should not return distance if serviceType=tv and channel parameter is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusMessage').be.equal('missing channel');
                    done();
                });
        });

        it('should not return distance if serviceType parameter is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=0&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing serviceType');
                    done();
                });
        });

        it('should not return distance if serviceType value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=0&serviceType=xx&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid serviceType value');
                    done();
                });
        });
    });

    describe('field parameter', function(done) {
        it('should not return distance if field value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=xx&erp=1&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid field value');
                    done();
                });
        });
    });



    describe('input parameter', function(done) {
        it('should not return distance if field input is missing', function(done) {
            request(server)
                .get('/distance.json?haat=150&erp=1&channel=5&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing field');
                    done();
                });
        });

        it('should not return distance if haat input is missing', function(done) {
            request(server)
                .get('/distance.json?field=28&erp=1&channel=5&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing haat');
                    done();
                });
        });

    });

    describe('haat parameter', function(done) {
        it('should not return distance if haat value is invalid', function(done) {
            request(server)
                .get('/distance.json?haat=xx&field=28&erp=1&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid haat value');
                    done();
                });
        });

        it('should not return distance if haat > 1600', function(done) {
            request(server)
                .get('/distance.json?haat=1700&field=28&erp=1&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('haat value out of range [30, 1600]');
                    done();
                });
        });

        it('should not return distance if haat < 30', function(done) {
            request(server)
                .get('/distance.json?haat=20&field=28&erp=1&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('haat value out of range [30, 1600]');
                    done();
                });
        });


    });

    describe('curve parameter', function(done) {
        it('should return distance if curve value is 0', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('distance').be.equal(86.29);
                    done();
                });
        });

        it('should not return distance if curve value is out of range [0, 2]', function(done) {
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=3&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('curve value out of range [0, 2]');
                    done();
                });
        });
    });
});
