(function() {
    'use strict';

    var ElevationForm = {
        bindEvents: function() {
            $('#form-params').on('click.elevationAPI', '[data-api="elevation"]', ElevationMap.getData);
        }        
    };

    var ElevationMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;

            ElevationForm.bindEvents();            
        },

        getData: function(event) {
            var elevationAPI = '/elevation.json?';
            var apiURL = [];

            $('.fields-elevation').serialize();

            elevationAPI += $('.fields-elevation').serialize();

            console.log(elevationAPI);

            $.ajax({
                url: elevationAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    if (data.status === 'success') {
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
            console.log(data);
            var elevMeta = '';

            Map.clearLayers();

            elevMeta += '<dl class="dl-elevation dl-horizontal">';
            elevMeta += '<dt>Elevation:</dt>';
            elevMeta += '<dd>' + data.elevation + ' ' + data.unit + '</dd>';            
            elevMeta += '<dt>Latitude:</dt>';
            elevMeta += '<dd>' + data.latitude + '</dd>';
            elevMeta += '<dt>Longitude:</dt>';
            elevMeta += '<dd>' + data.longitude + '</dd>';
            elevMeta += '<dt>Data Source:</dt>';
            elevMeta += '<dd>' + data.dataSource + '</dd>';
            elevMeta += '</dl>';

            Map.stationMarker = L.marker([data.latitude, data.longitude])
                .addTo(Map.map)
                .bindPopup(elevMeta)
                .openPopup();

            Map.map.setView([data.latitude, data.longitude], 7);
        }
    };

    ElevationMap.init();

}());
