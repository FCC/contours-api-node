(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');

    var ElevationMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;
        },

        getData: function(event) {
            var elevationAPI = '/elevation.json?';
            var apiURL = [];

            elevationAPI += $('.fields-elevation').serialize();

            $.ajax({
                url: elevationAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    if (data.features[0].properties.status === 'success') {
                        $('.alert').hide('fast');
                        ElevationMap.createMarker(data);
                    } else {
                        APIForm.showError();
                    }
                },
                error: APIForm.showError
            });
        },

        createMarker: function(data) {
            var elevMeta = '';

            var contour_style = {
                color: "#13428B",
                fillColor: "#13428B",
                opacity: 1.0,
                fillOpacity: 0.3,
                weight: 4
            };

            var lat = data.features[0].geometry.coordinates[1];
            var lon = data.features[0].geometry.coordinates[0];

            Map.clearLayers();

            elevMeta += '<dl class="dl-elevation dl-horizontal">';
            elevMeta += '<dt>Elevation:</dt>';
            elevMeta += '<dd>' + data.features[0].properties.elevation + ' ' + data.features[0].properties.unit + '</dd>';
            elevMeta += '<dt>Latitude:</dt>';
            elevMeta += '<dd>' + lat + '</dd>';
            elevMeta += '<dt>Longitude:</dt>';
            elevMeta += '<dd>' + lon + '</dd>';
            elevMeta += '<dt>Data Source:</dt>';
            elevMeta += '<dd>' + data.features[0].properties.dataSource + '</dd>';
            elevMeta += '</dl>';

            Map.contourJSON = L.geoJson(data, {
                    style: contour_style
                })
                .addTo(Map.map)
                .bindPopup(elevMeta)
                .openPopup();

            Map.map.setView([lat, lon], 7);
        }
    };

    module.exports = ElevationMap;
}());
