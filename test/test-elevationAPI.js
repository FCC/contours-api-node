var request = require('supertest');
var server = require('../app.js');

describe('Elevation API test', function() {
  it('should return elevation data if src or unit provided', function(done) {
    
    request(server)
      .get('/elevation.json?lat=38.22&long=-78.5&src=ned_1&unit=meters')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('elevation').be.equal(163.24);        
        done();
      });
  });

  it('should return elevation data if src or unit are not provided', function(done) {
    
    request(server)
      .get('/elevation.json?lat=38.22&long=-78.5')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('elevation').be.equal(163.24);        
        done();
      });
  });

  it('should return JSON format', function(done) {    

    request(server)
      .get('/elevation.json?lat=38.22&long=-78.5&src=ned_1&unit=meters')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });

  it('should return elevation data in meters', function(done) {
    
    request(server)
      .get('/elevation.json?lat=38.22&long=-78.5&src=ned_1&unit=meters')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('unit').be.equal('meters');        
        done();
      });
  });

  

  it('should check for invalid lat/lon input values', function(done) {
    
    request(server)
      .get('/elevation.json?lat=9999&long=9999&src=ned_1&unit=meters')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('statusCode').be.equal('400');
        res.body.should.have.property('statusMessage').be.equal('Invalid Input - Latitude/Longitude');        
        done();
      });
  });

  it('should check for invalid src input values', function(done) {
    
    request(server)
      .get('/elevation.json?lat=38.33&long=-78.2&src=9999&unit=9999')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('statusCode').be.equal('400');
        res.body.should.have.property('statusMessage').be.equal('Invalid Input - Source');        
        done();
      });
  });

  it('should check for invalid unit input values', function(done) {
    
    request(server)
      .get('/elevation.json?lat=38.33&long=-78.2&unit=9999')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) {
        if (err) {
          throw err;
        }

        res.body.should.have.property('statusCode').be.equal('400');
        res.body.should.have.property('statusMessage').be.equal('Invalid Input - Unit');        
        done();
      });
  });
  

  
  
});

