'use strict';

var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Disance API test', function() {

    describe('haat/field/erp/channel/curv/serviceType', function(done) {
        it('should return distance based on haat, field, erp, channel, curv, serviceType', function(done) {
            
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&channel=5&curve=0&serviceType=tv&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

                    res.body.should.have.property('distance');
                    done();
                });
        });
	
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
		
		it('should not return distance if serviceType=fm and channel input is missing', function(done) {
            
            request(server)
                .get('/distance.json?haat=150&field=28&erp=1&curve=0&serviceType=fm&outputcache=false')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

					res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('distance error occurred');
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
		
		it('should not return distance if serviceType input is missing', function(done) {
            
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