(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var APIMap = {

        getData: function(apiURL, apiSuccess) {

            var ajaxSuccess = function(data) {
                if (data.status === 'error') {
                    APIForm.showError();
                } else {
                    $('.alert').hide('fast');
                    APIMap.createMarker(data);
                    APIResponse.display(data);
                }
            };

            APIResponse.url = apiURL;

            $.ajax({
                url: apiURL,
                async: true,
                type: 'GET',
                dataType: 'json',
                success: apiSuccess ? apiSuccess : ajaxSuccess,
                error: APIForm.showError
            });
        },

        createMarker: function(data) {

            var lat = data.lat ? data.lat : data.features[0].geometry.coordinates[1];
            var lon = data.lon ? data.lon : data.features[0].geometry.coordinates[0];

            Map.clearLayers();

            var meta = APIMap.getTooltipMeta(data);

            try {
                Map.stationMarker = L.geoJson(data);

            } catch (e) {
                Map.stationMarker = L.marker([lat, lon]);

            }

            Map.stationMarker.addTo(Map.map)
                .bindPopup(meta)
                .openPopup();

            Map.map.setView([lat, lon], 7);
        }
    };

    module.exports = APIMap;
    
}());
