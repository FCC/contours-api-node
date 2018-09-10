'use strict'; 

global.chai = require('chai');
global.request = require('supertest');

/*
 * This is the global after hook to ensure the mocha process exits
 * at the end of all test suites. Mocha needs to exit so istanbul
 * can write the coverage report.
 */

after(function() {
    process.exit(0);
});