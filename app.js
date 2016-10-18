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
var station = require('./controllers/station.js');
var distance = require('./controllers/distance.js');
var contours = require('./controllers/contours.js');
var tvfm_curves = require('./controllers/tvfm_curves.js');
var entity = require('./controllers/entity.js');


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
var cached_param = 'outputcache';

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
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ Elevation API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('---- Elevation API return complete ------');
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
                memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('---- Elevation API return complete ------');
                res.status(data.features[0].properties.statusCode).send(data);
                return;     
            });
        }        
    });
});

app.get('/:serviceType/:idType/:id.:ext', function(req, res){
    console.log('contour ext: '+req.params.ext);
    var ext = req.params.ext;
    if(ext.toLowerCase().startsWith('json')){
        getContourJson(req, res);
    }
    else {
        //contour.getContour(req, res);    
        console.log('NON-JSON flow');
        getContourData(req, res, function(err, ret_obj, data) {
            if(err){
                console.error('getContourData err: '+err);
                return;            
            }            
            console.log('ret_obj = '+JSON.stringify(ret_obj));
            
            var content_disp = '';
            var content_length = 0;
            var content_type;

            if(data){
                content_disp = ret_obj['Content-Disposition'];
                content_length = ret_obj['Content-Length'];
                content_type = ret_obj['Content-Type'];
            }
            else{
                content_type = 'application/json; charset=utf-8';
                content_length = ret_obj.length;
            }

            res.set({
                    'Content-Disposition': content_disp,
                    'Content-Type': content_type,
                    'Content-Length': content_length
                });

            console.log('--------- Contour API return complete -----------');
            var resp_status = 500;
            if(data){
                resp_status = 200;
                res.status(resp_status).send(data);   
            }            
            else {
                res.status(resp_status).send(ret_obj);
            }     
            return;     
        });
    }    
});

app.get('/:serviceType/:idType/:id', function(req, res){
    getContourJson(req, res);
});

app.get('/haat.json', function(req, res){    
    //haat.getHAAT(req, res);
    var req_url = req.url;
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ HAAT API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('--------- HAAT API return complete -----------');
            res.status(data.features[0].properties.statusCode).send(data);
            return;
        }
        else {
            getHaatData(req, res, function(err, data) {
                if(err){
                    console.error('getElevationData err: '+err);
                    return;            
                }                                
                memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('--------- HAAT API return complete -----------');
                res.status(data.features[0].properties.statusCode).send(data);
                return;     
            });
        }        
    });
});

app.get('/haat.csv', function(req, res){
    haat.getHAAT(req, res);
});

app.get('/profile.json', function(req, res){
    //profile.getProfile(req, res);
    var req_url = req.url;
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ Profile API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('--------- Profile API return complete -----------');
            res.status(data.features[0].properties.statusCode).send(data);
            return;
        }
        else {
            getProfileData(req, res, function(err, data) {
                if(err){
                    console.error('getProfileData err: '+err);
                    return;            
                }                                
                memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('--------- Profile API return complete -----------');
                res.status(data.features[0].properties.statusCode).send(data);
                return;     
            });
        }        
    });    
});

/*app.get('/profile.csv', function(req, res){
    profile.getProfile(req, res);
});


app.get('/station.json', function(req, res){
    station.getStation(req, res);
});
*/
//app.get('/distance_nci.json', function(req, res){
//    distance.getDistance(req, res);
//});

app.get('/coverage.json', function(req, res){    
    
    var req_url = req.url;
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ Coverage API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('--------- Profile API return complete -----------');
            res.status(data.features[0].properties.statusCode).send(data);
            return;
        }
        else {
            getCoverageData(req, res, function(err, data) {
                if(err){
                    console.error('getCoverageData err: '+err);
                    return;            
                }                                
                memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('--------- Coverage API return complete -----------');
                res.status(data.features[0].properties.statusCode).send(data);
                return;     
            });
        }        
    });    

});

app.get('/distance.json', function(req, res){
    //tvfm_curves.getDistance(req, res);
    var req_url = req.url;
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ Distance API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('--------- Distance API return complete -----------');
            res.status(data.statusCode).send(data);
            return;
        }
        else {
            getDistanceData(req, res, function(err, data) {
                if(err){
                    console.error('getCoverageData err: '+err);
                    return;            
                }                                
                memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                    console.log('memcached.set result='+result );
                    memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                });
                console.log('response processed from code');
                console.log('--------- Distance API return complete -----------');
                res.status(data.statusCode).send(data);
                return;     
            });
        }        
    });   
});

/*app.get('/entity.json', function(req, res){
    entity.getEntity(req, res);
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
    // res.sendFile('/public/404.html');
    res.sendFile('404.html', { root: __dirname + '/public' });
    // res.send(err_res);    
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
    res.sendFile('500.html', { root: __dirname + '/public' });
    // res.send(err_res);
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

function getCachedData(req, req_key, success){
    var outputcache = req.query.outputcache;
    console.log('Cache req_key = '+req_key);
    console.log('outputcache param = '+outputcache);
    if(outputcache && outputcache == 'false'){
        return success(null, null);
    }
    else {
        memcached.get( req_key, function( err, result ){
            if( err ) console.error('memcached.get err='+err );        
            console.log('getCachedData memcached.get='+result);
            memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
            return success(null, result);
        });   
    }
}

function getElevationData(req, res, success) {
    console.log('app getElevationData');
    try {
        elevation.getElevation(req, res, function(data){
			console.log('app getElevationData data='+data);
			if(data){
				return success(null, data);    
			}
			return success(null, null);			
		});
    }
    catch(err){
        console.error('\n\n getElevationData err '+err);  
        return success(err, null);
    }  
};

function getHaatData(req, res, success) {
    console.log('app getHaatData');
    try {
        haat.getHAAT(req, res, function(data){
            console.log('app getHaatData data='+data);
            if(data){
                return success(null, data);    
            }
            return success(null, null);           
        });
    }
    catch(err){
        console.error('\n\n getHaatData err '+err);  
        return success(err, null);
    }  
};

function getProfileData(req, res, success) {
    console.log('app getProfileData');
    try {
        profile.getProfile(req, res, function(data){
            console.log('app getProfileData data='+data);
            if(data){
                return success(null, data);    
            }
            return success(null, null);           
        });
    }
    catch(err){
        console.error('\n\n getProfileData err '+err);  
        return success(err, null);
    }  
};

function getCoverageData(req, res, success) {
    console.log('app getCoverageData');
    try {
        contours.getContours(req, res, function(data){
            console.log('app getCoverageData data='+data);
            if(data){
                return success(null, data);    
            }
            return success(null, null);           
        });
    }
    catch(err){
        console.error('\n\n getCoverageData err '+err);  
        return success(err, null);
    }  
};

function getDistanceData(req, res, success) {
    console.log('app getDistanceData');
    try {
        tvfm_curves.getDistance(req, res, function(data){
            console.log('app getDistanceData data='+data);
            if(data){
                return success(null, data);    
            }
            return success(null, null);           
        });
    }
    catch(err){
        console.error('\n\n getCoverageData err '+err);  
        return success(err, null);
    }  
};

function getContourData(req, res, success) {
    console.log('app getContourData');
    try {
        contour.getContour(req, res, function(ret_obj, data){            
            console.log('ret_obj= '+JSON.stringify(ret_obj));
            console.log('app getContourData data received');
            if(data){
                return success(null, ret_obj, data);    
            }
            return success(null, ret_obj, null);           
        });
    }
    catch(err){
        console.error('\n\n getContourData err '+err);  
        return success(err, null, null);
    }  
}

function getContourJson(req, res){    
    var req_url = req.url;
    var req_key = removeVariableFromURL(req_url, cached_param);
    console.log('------------ Contour API ------------------')
    console.log('request url:'+req_url);    
   
    getCachedData(req, req_key, function(err, data) {
        if(err){
            console.error('callback getCachedData err: '+err);
            return;            
        }
        if(data){
            console.log('response from ElastiCache');
            console.log('--------- Contour API return complete -----------');
            var resp_status = 500;
            var dataJson = JSON.parse(data);
            if(dataJson.totalFeatures && dataJson.totalFeatures > 0){
                resp_status = 200;    
            }             
            res.status(resp_status).send(dataJson);    
            return;
        }
        else {
            getContourData(req, res, function(err, ret_obj, data) {
                if(err){
                    console.error('getElevationData err: '+err);
                    return;            
                } 
                if(data){
                    memcached.set(req_key, data, memcached_lifetime, function( err, result ){
                    if( err ) console.error( 'memcached set err='+err );
                    
                        console.log('memcached.set result='+result );
                        memcached.end(); // as we are 100% certain we are not going to use the connection again, we are going to end it
                    });
                    
                    var resp_status = 500;
                    var dataJson = JSON.parse(data);
                    if(dataJson.totalFeatures && dataJson.totalFeatures > 0){
                        resp_status = 200;    
                    }  
                    console.log('response processed from code');
                    console.log('--------- Contour API return complete -----------');          
                    res.status(resp_status).send(dataJson);        
                }                               
                else {
                    console.log('response processed from code');
                    console.log('--------- Contour API return complete -----------');
                    res.status(500).send(ret_obj);  
                }            
                return;     
            });
        }        
    });
}

function removeVariableFromURL(url_string, variable_name) {
    var URL = String(url_string);
    var regex = new RegExp( "\\?" + variable_name + "=[^&]*&?", "gi");
    URL = URL.replace(regex,'?');
    regex = new RegExp( "\\&" + variable_name + "=[^&]*&?", "gi");
    URL = URL.replace(regex,'&');
    URL = URL.replace(/(\?|&)$/,'');
    regex = null;
    return URL;
}

module.exports = app;

