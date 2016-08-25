(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');

    var HAATMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;
        },

        getData: function(event) {
            var haatAPI = '/haat.json?';
            var apiURL = [];

            haatAPI += $('.fields-haat').serialize();

            $.ajax({
                url: haatAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    if (data.status === 'error') {                        
                        APIForm.showError();
                    } else {
                        $('.alert').hide('fast');
                        HAATMap.createMarker(data);
                    }
                },
                error: APIForm.showError
            });
        },

        createMarker: function(data) {
            var elevMeta = '';

            Map.clearLayers();

            elevMeta += '<dl class="dl-haat dl-horizontal">';
            elevMeta += '<dt>Average HAAT:</dt>';
            elevMeta += '<dd>' + data.haat_average + ' ' + data.unit + '</dd>';
            elevMeta += '<dt>Latitude:</dt>';
            elevMeta += '<dd>' + data.lat + '</dd>';
            elevMeta += '<dt>Longitude:</dt>';
            elevMeta += '<dd>' + data.lon + '</dd>';
            elevMeta += '<dt>Data Source:</dt>';
            elevMeta += '<dd>' + data.elevation_data_source + '</dd>';
            elevMeta += '</dl>';

            Map.stationMarker = L.marker([data.lat, data.lon])
                .addTo(Map.map)
                .bindPopup(elevMeta)
                .openPopup();

            Map.map.setView([data.lat, data.lon], 7);
        }
    };

    module.exports = HAATMap;
}());
