var request = require('supertest');
var server = require('../app.js');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();

describe('Contour Demo Docs test', function() {

    describe('GET Contour Demo page', function() {
        it('should render Contour Demo page', function(done) {
            request(server)
                .get('/contour-demo')
                .expect(200, done);
        });
    });
});
