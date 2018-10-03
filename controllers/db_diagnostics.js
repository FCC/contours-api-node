'use strict';

const os = require('os');
const fs = require('fs');
const monitor = require('pg-monitor');
const dotenv = require('dotenv');
dotenv.config();

monitor.setTheme('matrix');

const LOCAL = process.env.NODE_ENV === 'LOCAL';
const DEV = process.env.NODE_ENV === 'DEV';
const logFile = 'db_diagnostics.log';

let fd;

monitor.setLog((msg, info) => {
    try {
        fd = fs.openSync(logFile, 'a');
        if (info.event === 'error') {
            let logText = '[ '+info.time+' ][ '+info.event+' ]'+info.text+os.EOL;
            fs.appendFileSync(fd, logText);
        }
        if (LOCAL) {
            info.display = true;
        } else {
            info.display = false;
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (fd !== undefined) {
            fs.closeSync(fd);
        }
    }
});

module.exports = {
    init(options) {
        if (DEV || LOCAL) {
            monitor.attach(options);
        } else {
            monitor.attach(options, ['error']);
        }
    }
};