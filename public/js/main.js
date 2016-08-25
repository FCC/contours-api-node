(function() {
    'use strict';

    var APIForm = require('./modules/apiForm.js');
    var Map = require('./modules/map.js');
    var ContourForm = require('./modules/contourForm.js');
    var ContourMap = require('./modules/contourMap.js');
    var ElevationForm = require('./modules/elevationForm.js');
    var ElevationMap = require('./modules/elevationMap.js');
    var HAATForm = require('./modules/haatForm.js');
    var HAATMap = require('./modules/haatMap.js');

    APIForm.bindEvents();
    Map.init();
    ElevationForm.getParams();    
    ContourForm.getParams();    
    HAATForm.getParams();        
}());
