(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var APIMap = require('./apiMap.js');
    var Map = require('./map.js');

    var ProfileMap = {

        getData: function() {
            var haatAPI = './profile.json?';
            
            haatAPI += $('.fields-profile').serialize();

            APIMap.getTooltipMeta = ProfileMap.getTooltipMeta;

            APIMap.getData(haatAPI);
        },
        getTooltipMeta: function(data) {
            var haatMeta = '<dl class="dl-profile dl-horizontal">';
            
            haatMeta += '<dt>Average Elevation:</dt>';
            haatMeta += '<dd>' + data.average_elevation + ' ' + data.unit + '</dd>';
            haatMeta += '<dt>Latitude:</dt>';
            haatMeta += '<dd>' + data.lat + '</dd>';
            haatMeta += '<dt>Longitude:</dt>';
            haatMeta += '<dd>' + data.lon + '</dd>';
            haatMeta += '<dt>Data Source:</dt>';
            haatMeta += '<dd>' + data.elevation_data_source + '</dd>';
            haatMeta += '</dl>';

            return haatMeta;

        }
    };

    module.exports = ProfileMap;
    
}());
