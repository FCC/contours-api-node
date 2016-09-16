// **********************************************************

'use strict';

// **********************************************************
// require 

var http = require("http");
var https = require("https");
var url = require('url');
var express = require('express');
var path = require('path');
var fsr = require('file-stream-rotator');
var fs = require('fs');
var morgan = require('morgan');
var cors = require('cors');
var Memcached = require('memcached');
var async = require('async');

var bodyparser = require('body-parser');
var package_json = require('./package.json');

var contour = require('./controllers/contour.js');
var elevation = require('./controllers/elevation.js');
var haat = require('./controllers/haat.js');
var profile = require('./controllers/profile.js');

//var station = require('./controllers/station.js');
//var contours = require('./controllers/contours.js');

// **********************************************************
// config

var configEnv = require('./config/env.json');

var NODE_ENV = process.env.NODE_ENV;
//console.log('NODE_ENV : '+ NODE_ENV );

var NODE_PORT =  process.env.PORT || configEnv[NODE_ENV].NODE_PORT;

// **********************************************************
// console start

console.log('package_json.name : '+ package_json.name );
console.log('package_json.version : '+ package_json.version );
console.log('package_json.description : '+ package_json.description );
console.log('ElastiCache EndPoint: '+configEnv[NODE_ENV].ELASTICACHE_ENDPOINT);

//console.log('NODE_PORT : '+ NODE_PORT );
//console.log('PG_DB : '+ PG_DB );

// **********************************************************
// app

var app = express();

app.use(cors());

var memcached = new Memcached(configEnv[NODE_ENV].ELASTICACHE_ENDPOINT);
var memcached_lifetime = Number(configEnv[NODE_ENV].ELASTICACHE_LIFETIME);


// **********************************************************
// log

var logDirectory = __dirname + '/log';

fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

var accessLogStream = fsr.getStream({
    filename: logDirectory + '/fcc-pdf-%DATE%.log',
    frequency: 'daily',
    verbose: false
});

app.use(morgan('combined', {stream: accessLogStream}))

// **********************************************************
// parser

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

// **********************************************************
// route

app.use('/', express.static(__dirname + '/public'));
app.use('/contour-demo', express.static(__dirname + '/public/contour-demo.html'));

app.use('/api/contours', function(req, res, next) {
    if (NODE_ENV === 'LOCAL' || NODE_ENV === 'DEV') {
        var redURL = req.originalUrl.split('api/contours')[1];
        res.redirect(301, redURL);
    }

    next();
});

app.param('uuid', function(req, res, next, uuid){
    // check format of uuid
    if(!serverCheck.checkUUID(uuid)){
        return serverSend.sendErr(res, 'json', 'not_found');
    } else {
        next();
    }
})

app.param('ext', function(req, res, next, ext) {
    // check format of id
    var route = req.route.path;
    //console.log('\n  route : ' + route );
    
    if (!route === '/download/:uuid.:ext') {    // skip for downloads
        if(!serverCheck.checkExt(ext)){
            return serverSend.sendErr(res, 'json', 'invalid_ext');
        } else {
            next();
        }
    }
    else {
        next();
    }
});

app.get('/elevation.json', function(req, res){
    var req_url = req.url;
    console.log('------------ elevation API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req_url, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('---- API return complete ------');
            res.status(data.features[0].properties.statusCode).send(data);
            return;
        }
        else {
            getElevationData(req, res, function(err, data) {
                if(err){
                    console.error('getElevationData err: '+err);
                    return;            
                }                
                console.log('elevation: '+data);

                memcached.set(req_url, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('---- API return complete ------');
                res.status(data.features[0].properties.statusCode).send(data);
                return;     
            });
        }        
    });
});

app.get('/:serviceType/:idType/:id.:ext', function(req, res){
    contour.getContour(req, res);
});

app.get('/:serviceType/:idType/:id', function(req, res){
    contour.getContour(req, res);
});

app.get('/haat.json', function(req, res){
    haat.getHAAT(req, res);
});

app.get('/haat.csv', function(req, res){
    haat.getHAAT(req, res);
});

app.get('/profile.json', function(req, res){
    profile.getProfile(req, res);
});

app.get('/profile.csv', function(req, res){
    profile.getProfile(req, res);
});

/*
app.get('/station.json', function(req, res){
    station.getStation(req, res);
});

app.get('/contours.json', function(req, res){
    contours.getContours(req, res);
});
*/

// **********************************************************
// error

app.use(function(req, res) {

    var err_res = {};
    
    err_res.responseStatus = {
        'status': 404,
        'type': 'Not Found',
        'err': req.url +' Not Found'        
    };

    res.status(404);
    res.send(err_res);    
});

app.use(function(err, req, res, next) {
    
    //console.log('\n app.use error: ' + err );
    console.error(err.stack);
    
    var err_res = {};       
    err_res.responseStatus = {
        'status': 500,
        'type': 'Internal Server Error',
        'err': err.name +': '+ err.message      
    };  
    
    res.status(500);
    res.send(err_res);
});

process.on('uncaughtException', function (err) {
    //console.log('\n uncaughtException: '+ err);
    console.error(err.stack);
});

// **********************************************************
// server

var server = app.listen(NODE_PORT, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('\n  listening at http://%s:%s', host, port);

});

function getCachedData(key, success){
    memcached.get( key, function( err, result ){
        if( err ) console.error('memcached.get err='+err );        
        console.log('getCachedData memcached.get='+result);
        memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
        return success(null, result);
    });    
}

function getElevationData(req, res, success) {
    console.log('app getElevationData');
    try {
        var data = elevation.getElevation(req, res);
        console.log('app getElevationData data='+data);
        if(data){
            return success(null, data);    
        }
        return success(null, null);
        //req.write(dataString);
        //req.end();
    }
    catch(err){
        console.error('\n\n getElevationData err '+err);  
        return success(err, null);
    }  
};

module.exports = app;

