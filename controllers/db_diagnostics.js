'use strict';

const os = require('os');
const fs = require('fs');
const monitor = require('pg-monitor');
const dotenv = require('dotenv');
dotenv.config();

monitor.setTheme('matrix');

const LOCAL = process.env.NODE_ENV === 'LOCAL';
const DEV = process.env.NODE_ENV === 'DEV';
const logFile = '../log/db_diagnostics.log';

monitor.setLog((msg, info) => {
    if (info.event === 'error') {
        let logText = '[ '+info.time+' ][ '+info.event+' ]'+info.text+os.EOL;
//        let logText = os.EOL + msg;
//        if (info.time) {
//            logText = os.EOL + logText;
//        }
        fs.appendFileSync(logFile, logText);
    }

    if (LOCAL) {
        info.display = true;
    } else {
        info.display = false;
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