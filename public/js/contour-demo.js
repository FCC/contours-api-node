(function() {
    'use strict';

    var ContourMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;

            ContourMap.bindEvents();
            ContourMap.createMap();
        },
        bindEvents: function() {
        	var idTypes = {
                facilityid: 'Facility ID',
                callsign: 'Call Sign',
                filenumber: 'File Number',
                applicationid: 'Application ID',
                antennaid: 'Antenna ID'
            };

            var serviceTypes = {
                tv: ['facilityid', 'callsign', 'filenumber', 'applicationid'],
                fm: ['facilityid', 'callsign', 'filenumber', 'applicationid'],
                am: ['facilityid', 'callsign', 'antennaid']
            };

            // display optional fields based on Service Type
            $('#serviceType').on('change', function() {

                $('#idType')
                    .val('facilityid')
                    .find('option').hide();

                $('label[for="idValue"]').text('Facility ID');

                $(serviceTypes[this.value]).each(function(index, value) {
                    $('option[value="' + value + '"]').show();
                });

                if (this.value === 'am') {
                    $('.js-am-only').slideDown();
                } else {
                    $('.js-am-only').slideUp();
                }
            });

            // update selected ID Type label text
            $('#idType').on('change', function() {
                $('label[for="idValue"]').text(idTypes[this.value]);
            });

            $('#btn-createContour').on('click', ContourMap.getContour);

            $(window).keydown(function(event) {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    ContourMap.getContour();
                }
            });
        },
        createMap: function() {

            L.mapbox.accessToken = 'pk.eyJ1IjoiY29tcHV0ZWNoIiwiYSI6InMyblMya3cifQ.P8yppesHki5qMyxTc2CNLg';

            ContourMap.map = L.mapbox.map('map', 'fcc.k74ed5ge', {
                    attributionControl: true,
                    maxZoom: 19
                })
                .setView([45, -93], 3);

            var baseStreet = L.mapbox.tileLayer('fcc.k74ed5ge').addTo(ContourMap.map);
            var baseSatellite = L.mapbox.tileLayer('fcc.k74d7n0g');
            var baseTerrain = L.mapbox.tileLayer('fcc.k74cm3ol');

            L.control.scale({
                position: 'bottomright'
            }).addTo(ContourMap.map);

            var geocoder = L.mapbox.geocoder('mapbox.places-v1');

            var layerControl = new L.Control.Layers({
                'Street': baseStreet.addTo(ContourMap.map),
                'Satellite': baseSatellite,
                'Terrain': baseTerrain
            }, {}, {
                position: 'topleft'
            }).addTo(ContourMap.map);
        },
        getContour: function() {
            var contourAPI = '';
            var apiURL = [];
            var serviceType = $('#serviceType').val();
            var amParams = '';
            
            $('#form-params').find(':input').not('button').each(function(element, value) {
                apiURL.push(this.value);
            });

            contourAPI = apiURL.slice(0, 3).join('/') + '.json';            

            if (serviceType === 'am') {
            	amParams = '?' + $('#form-params').serialize().split('&').slice(3,5).join('&');
                contourAPI += amParams;
            } 

            console.log(apiURL);
            console.log(contourAPI);

            $.ajax({
                url: contourAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {                    
                    if (data.features.length > 0) {
                    	$('.alert').hide('fast');
                        ContourMap.createContour(data);
                    } else {
                        ContourMap.showError();
                    }
                },
                error: ContourMap.showError
            });
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

            ContourMap.removeContour();

            ContourMap.contourJSON = L.geoJson(data, {
                style: contour_style
            }).addTo(ContourMap.map);

            ContourMap.stationMarker = L.marker([station_lat, station_lon]).addTo(ContourMap.map);
            ContourMap.map.fitBounds(ContourMap.contourJSON.getBounds());

        },
        removeContour: function() {
            if (ContourMap.map.hasLayer(ContourMap.contourJSON)) {
                ContourMap.map.removeLayer(ContourMap.contourJSON);
                ContourMap.map.removeLayer(ContourMap.stationMarker);
            }
        },
        showError: function() {
            if ($('.alert').is(':hidden')) {
                $('.alert').slideDown();
            }

            ContourMap.removeContour();
        }
    };

    ContourMap.init();

}());
