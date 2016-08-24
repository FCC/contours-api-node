(function() {
    'use strict';

    var APIForm = require('./modules/apiForm.js');
    var ContourForm = require('./modules/contourForm.js');
    var ContourMap = require('./modules/contourMap.js');
    var ElevationForm = require('./modules/elevationForm.js');
    var ElevationMap = require('./modules/elevationMap.js');
    var Map = require('./modules/map.js');

    APIForm.bindEvents();
    Map.init();
    ElevationForm.bindEvents();
    ElevationMap.init();
    ContourForm.bindEvents();
    ContourMap.init();

}());
