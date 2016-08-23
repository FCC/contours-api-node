(function() {
    'use strict';

    window.Map = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;

            Map.create();
        },
        create: function() {

            L.mapbox.accessToken = 'pk.eyJ1IjoiY29tcHV0ZWNoIiwiYSI6InMyblMya3cifQ.P8yppesHki5qMyxTc2CNLg';

            Map.map = L.mapbox.map('map', 'fcc.k74ed5ge', {
                    attributionControl: true,
                    maxZoom: 19
                })
                .setView([41.05, -95], 4);

            var baseStreet = L.mapbox.tileLayer('fcc.k74ed5ge').addTo(Map.map);
            var baseSatellite = L.mapbox.tileLayer('fcc.k74d7n0g');
            var baseTerrain = L.mapbox.tileLayer('fcc.k74cm3ol');

            L.control.scale({
                position: 'bottomright'
            }).addTo(Map.map);

            var geocoder = L.mapbox.geocoder('mapbox.places-v1');

            var layerControl = new L.Control.Layers({
                'Street': baseStreet.addTo(Map.map),
                'Satellite': baseSatellite,
                'Terrain': baseTerrain
            }, {}, {
                position: 'topleft'
            }).addTo(Map.map);
        },
        createContour: function(data) {
            var contour_style = {
                color: "#13428B",
                fillColor: "#13428B",
                opacity: 1.0,
                fillOpacity: 0.3,
                weight: 4
            };

            var p = data.features[0].properties;
            var station_lat = p.station_lat;
            var station_lon = p.station_lon;

            Map.clearLayers();

            Map.contourJSON = L.geoJson(data, {
                style: contour_style
            }).addTo(Map.map);

            Map.createMarker(station_lat, station_lon);

            Map.map.fitBounds(Map.contourJSON.getBounds());

        },
        createMarker: function(lat, lon) {
            Map.stationMarker = L.marker([lat, lon]).addTo(Map.map);            
        },

        clearLayers: function() {           

            if (Map.map.hasLayer(Map.contourJSON)) {
                Map.map.removeLayer(Map.contourJSON);
                
            }
            if (Map.map.hasLayer(Map.stationMarker)) {
                Map.map.removeLayer(Map.stationMarker);                
            }
            
        },
        resetView: function() { console.log('resetView');
            Map.map.setView([41.05, -95], 4);
            
        }
    };

    Map.init();

}());
