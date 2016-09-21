var request = require('supertest');
var server = require('../app.js');

describe('Disance API test', function() {

    describe('dbu/haat/curve_type', function(done) {
        it('should return distance based on dbu, haat, curve_type', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=28&haat=150&curve_type=f55lv')
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
	
	    it('should not return distance if dbu input is missing', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?haat=150&curve_type=f55lv')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

					res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing dbu');
                    done();
                });
        });
		
		it('should not return distance if haat input is missing', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=28&curve_type=f55lv')
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
	
		it('should not return distance if curve_type input is missing', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=28&haat=150')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

					res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('missing curve_type');
                    done();
                });
        });
	
		it('should not return distance if dbu value is invalid', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=xxx&haat=150&curve_type=f55lv')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

					res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('invalid dbu value');
                    done();
                });
        });
		
		it('should not return distance if haat value is invalid', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=28&haat=xxx&curve_type=f55lv')
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
		
		it('should not return distance if curve_type value is invalid', function(done) {
            this.timeout(10000);

            request(server)
                .get('/distance.json?dbu=28&haat=150&curve_type=xxx')
                .expect('Content-Type', /json/)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }

					res.body.should.have.property('statusCode').be.equal('400');
                    res.body.should.have.property('statusMessage').be.equal('wrong curve_type - must be F55LV, F51LV, F55HV, F51HV, F55U, or F51U');
                    done();
                });
        });

	});

});	


        