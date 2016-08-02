var request = require('supertest');
var server = require('../app.js');

describe('GET /', function() {
  it('should render ok', function(done) {
    request(server)
      .get('/')
      .expect(200, done);
  });
});
