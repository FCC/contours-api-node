var request = require('supertest');
var server = require('../app.js');

describe('GET API docs', function() {
  it('should render API docs', function(done) {
    request(server)
      .get('/')
      .expect(200, done);
  });
});


/*describe('GET contour version', function() {
  it('should return module versions', function(done) {
    request(server)
      .get('/getVersions')
      .expect(200, done);
  });
});*/

describe('Test 404', function() {
  it('should return a 404 error', function(done) {
    request(server)
      .get('/asdfsad')
      .expect(404, done);
  });
});