(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./modules/apiForm.js');
    var Map = require('./modules/map.js');
    var ContourForm = require('./modules/contourForm.js');
    var ElevationForm = require('./modules/elevationForm.js');
    var HAATForm = require('./modules/haatForm.js');
    var ProfileForm = require('./modules/profileForm.js');
    
    APIForm.bindEvents();
    Map.init();
    ElevationForm.getParams();    
    ContourForm.getParams();    
    HAATForm.getParams();        
    ProfileForm.getParams();
}());

},{"./modules/apiForm.js":2,"./modules/contourForm.js":5,"./modules/elevationForm.js":7,"./modules/haatForm.js":9,"./modules/map.js":11,"./modules/profileForm.js":12}],2:[function(require,module,exports){
(function() {
    'use strict';

    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var APIForm = {
        bindEvents: function() {            
            $('#apiType').on('change', APIForm.switchForm);

            $(window).keydown(function(event) {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    $('#btn-getAPI').click();
                }
            });

            $('#modal-loading').modal({
                backdrop: 'static',
                keyboard: false,
                show: false
            });
        },
        switchForm: function() {
            var selectedAPI = this.value;

            $('.alert').hide('fast');

            $('.fields').hide('fast');
            $('.fields-' + selectedAPI).slideDown();

            $('#btn-getAPI').attr('data-api', selectedAPI);

            $('#form-params')[0].reset();

            $('label[for="idValue"]').text('Facility ID');

            $('#apiType').val(selectedAPI);           

            APIResponse.clear();
            Map.clearLayers();
            Map.resetView();
        },
        showError: function() {
            $('#modal-loading').modal('hide');

            $('.alert').hide('fast');
            $('.alert').slideDown();

            APIResponse.clear();

            Map.clearLayers();
            Map.resetView();
        }
    };

    module.exports = APIForm;

}());

},{"./apiResponse.js":4,"./map.js":11}],3:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var APIMap = {

        getData: function(apiURL, apiSuccess) {

            var ajaxSuccess = function(data) { 
                if (data.features[0].properties.status === 'success') {
                    $('.alert').hide('fast');
                    APIMap.createMarker(data);
                    APIResponse.display(data);                    
                } else {
                    APIForm.showError();
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

},{"./apiForm.js":2,"./apiResponse.js":4,"./map.js":11}],4:[function(require,module,exports){
(function() {
    'use strict';

    var APIResponse = {

        display: function(data) {
            // display JSON next to map

            $('#modal-loading').modal('hide');

            $('.apiResponse__out code').text(JSON.stringify(data, null, 2));
            $('pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });

            $('.apiResponse__dwnld')
                .attr('href', APIResponse.url)
                .removeClass('hide');
        },

        clear: function() {
            $('.apiResponse__out code').text('');
            $('.apiResponse__dwnld').addClass('hide');
        }
    };

    module.exports = APIResponse;

}());

},{}],5:[function(require,module,exports){
(function() {
    'use strict';

    var ContourMap = require('./contourMap.js');   

    var ContourForm = {
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
                $('#idValue').val('');

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
                $('#idValue').val('');
                $('label[for="idValue"]').text(idTypes[this.value]);
            });

            $('#form-params').on('click.contourAPI', '[data-api="contour"]', ContourMap.getContour);
            
        },
        getParams: function() {
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-contour.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/{serviceType}/{idType}/{idValue}.{format}'].get.parameters;

                    ContourForm.createTemplate(paramsData);
                }
            });
        },
        createTemplate: function(data) {
            var fields = {};
            var source = $('#apiForm-template').html();
            var template, fieldsetHTML;

            template = Handlebars.compile(source);

            fields.params = data;
            fieldsetHTML = template(fields);
            $('#frm-contour').append(fieldsetHTML);
            
            ContourForm.bindEvents();
        }
    };

    module.exports = ContourForm;

}());

},{"./contourMap.js":6}],6:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var ContourMap = {        
        getContour: function() {
            var contourAPI = '';
            var apiURL = [];
            var serviceType = $('#serviceType').val();
            var amParams = '';

            $('.fields-contour').find(':input').not('button').each(function(element, value) {
                apiURL.push(this.value);
            });

            contourAPI = apiURL.slice(0, 3).join('/') + '.json';

            if (serviceType === 'am') {
                amParams = '?' + $('#form-params').serialize().split('&').slice(3, 5).join('&');
                contourAPI += amParams;
            }

            APIResponse.url = contourAPI;

            $.ajax({
                url: contourAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    if (data.features.length > 0) {
                        $('.alert').hide('fast');
                        ContourMap.createContour(data);
                        APIResponse.display(data);
                    } else {
                        APIForm.showError();
                    }
                },
                error: APIForm.showError
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

            Map.clearLayers();

            Map.contourJSON = L.geoJson(data, {
                style: contour_style
            }).addTo(Map.map);

            Map.map.fitBounds(Map.contourJSON.getBounds());
            ContourMap.createMarker(data);

        },
        createMarker: function(data) {
            var contourMeta = '';

            Map.featureLayer = L.mapbox.featureLayer().addTo(Map.map);
            Map.featureLayer.clearLayers();

            for (var i = 0; i < data.features.length; i++) {
                contourMeta = '';
                contourMeta += '<dl class="dl-contour dl-horizontal">';
                contourMeta += '<dt>Call Sign:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.callsign + '</dd>';

                if (data.features[i].properties.service !== undefined) {
                    contourMeta += '<dt>Service:</dt>';
                    contourMeta += '<dd>' + data.features[i].properties.service + '</dd>';
                }

                contourMeta += '<dt>Facility ID:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.facility_id + '</dd>';
                contourMeta += '<dt>File Number:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.filenumber + '</dd>';
                contourMeta += '<dt>Latitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.station_lat + '</dd>';
                contourMeta += '<dt>Longitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.station_lon + '</dd>';
                contourMeta += '</dl>';

                Map.stationMarker = L.marker([data.features[i].properties.station_lat, data.features[i].properties.station_lon])
                    .addTo(Map.featureLayer)
                    .bindPopup(contourMeta);
            }
        }
    };

    module.exports = ContourMap;

}());

},{"./apiForm.js":2,"./apiResponse.js":4,"./map.js":11}],7:[function(require,module,exports){
(function() {
    'use strict';

    var ElevationMap = require('./elevationMap.js');

    var ElevationForm = {
        bindEvents: function() {
            $('#form-params').on('click.elevationAPI', '[data-api="elevation"]', ElevationMap.getData);
        },
        getParams: function() {
        	// get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-elevation.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/elevation.{format}'].get.parameters;

                    ElevationForm.createTemplate(paramsData);
                }
            });
        },
        createTemplate: function(data) {
            var fields = {};
            var source = $('#apiForm-template').html();
            var template, fieldsetHTML;

            template = Handlebars.compile(source);

            fields.params = data;
            fieldsetHTML = template(fields);
            $('#frm-elevation').append(fieldsetHTML);
            
            ElevationForm.bindEvents();
        }        
    };
    
    module.exports = ElevationForm;
}());

},{"./elevationMap.js":8}],8:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');

    var ElevationMap = {

        getData: function() {
            var elevationAPI = './elevation.json?';

            elevationAPI += $('.fields-elevation').serialize();

            APIMap.getTooltipMeta = ElevationMap.getTooltipMeta;

            APIMap.getData(elevationAPI);
        },
        getTooltipMeta: function(data) {
            var elevMeta = '<dl class="dl-elevation dl-horizontal">';
            elevMeta += '<dt>Elevation:</dt>';
            elevMeta += '<dd>' + data.features[0].properties.elevation + ' ' + data.features[0].properties.unit + '</dd>';
            elevMeta += '<dt>Latitude:</dt>';
            elevMeta += '<dd>' + data.features[0].geometry.coordinates[1] + '</dd>';
            elevMeta += '<dt>Longitude:</dt>';
            elevMeta += '<dd>' + data.features[0].geometry.coordinates[0] + '</dd>';
            elevMeta += '<dt>Data Source:</dt>';
            elevMeta += '<dd>' + data.features[0].properties.dataSource + '</dd>';
            elevMeta += '</dl>';

            return elevMeta;
        }
    };

    module.exports = ElevationMap;

}());

},{"./apiMap.js":3}],9:[function(require,module,exports){
(function() {
    'use strict';

    var HAATMap = require('./haatMap.js');

    var HAATForm = {
        bindEvents: function() {
            $('#form-params').on('click.haatAPI', '[data-api="haat"]', HAATMap.getData);
        },
        getParams: function() {

        	// get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-haat.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/haat.{format}'].get.parameters;

                    HAATForm.createTemplate(paramsData);
                }
            });
        },
        createTemplate: function(data) {
            var fields = {};
            var source = $('#apiForm-template').html();
            var template, fieldsetHTML;

            template = Handlebars.compile(source);

            fields.params = data;
            fieldsetHTML = template(fields);
            $('#frm-haat').append(fieldsetHTML);
            
            HAATForm.bindEvents();
        }        
    };
    
    module.exports = HAATForm;
    
}());

},{"./haatMap.js":10}],10:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');
    
    var HAATMap = {

        getData: function() {
            var haatAPI = './haat.json?';
            
            haatAPI += $('.fields-haat').serialize();

            APIMap.getTooltipMeta = HAATMap.getTooltipMeta;

            APIMap.getData(haatAPI);
        },
        getTooltipMeta: function(data) {
            var haatMeta = '<dl class="dl-haat dl-horizontal">';
            var dataHAAT = data.features[0].properties; 

            haatMeta += '<dt>Average HAAT:</dt>';
            haatMeta += '<dd>' + dataHAAT.haat_average + ' ' + dataHAAT.unit + '</dd>';
            haatMeta += '<dt>Latitude:</dt>';
            haatMeta += '<dd>' + dataHAAT.lat + '</dd>';
            haatMeta += '<dt>Longitude:</dt>';
            haatMeta += '<dd>' + dataHAAT.lon + '</dd>';
            haatMeta += '<dt># of radials:</dt>';
            haatMeta += '<dd>' + dataHAAT.nradial + '</dd>';
            haatMeta += '<dt>RCAMSL:</dt>';
            haatMeta += '<dd>' + dataHAAT.rcamsl + '</dd>';
            haatMeta += '<dt>Data Source:</dt>';
            haatMeta += '<dd>' + dataHAAT.elevation_data_source + '</dd>';
            haatMeta += '</dl>';

            return haatMeta;

        }
    };

    module.exports = HAATMap;
    
}());

},{"./apiMap.js":3}],11:[function(require,module,exports){
(function() {
    'use strict';

    var Map = {
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

            Map.map.on('click', function(e) {

                $('.fields:visible')
                    .find('input[name="lat"]')
                    .val(e.latlng.lat)
                    .end()
                    .find('input[name="lon"]')
                    .val(e.latlng.lng);
            });
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

            if (Map.map.hasLayer(Map.featureLayer)) {
                Map.featureLayer.clearLayers();
            }
        },
        resetView: function() {
            Map.map.setView([41.05, -95], 4);
        }
    };

    module.exports = Map;

}());

},{}],12:[function(require,module,exports){
(function() {
    'use strict';

    var ProfileMap = require('./profileMap.js');

    var ProfileForm = {
        bindEvents: function() {
            $('#form-params').on('click.profileAPI', '[data-api="profile"]', ProfileMap.getData);
        },
        getParams: function() {
        	// get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-profile.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/profile.{format}'].get.parameters;

                    ProfileForm.createTemplate(paramsData);
                }
            });
        },
        createTemplate: function(data) {
            var fields = {};
            var source = $('#apiForm-template').html();
            var template, fieldsetHTML;

            template = Handlebars.compile(source);

            fields.params = data;
            fieldsetHTML = template(fields);
            $('#frm-profile').append(fieldsetHTML);
            
            ProfileForm.bindEvents();
        }        
    };
    
    module.exports = ProfileForm;
}());

},{"./profileMap.js":13}],13:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');

    var ProfileMap = {

        getData: function() {
            var haatAPI = './profile.json?';
            
            haatAPI += $('.fields-profile').serialize();

            APIMap.getTooltipMeta = ProfileMap.getTooltipMeta;

            APIMap.getData(haatAPI);
        },
        getTooltipMeta: function(data) {
            var haatMeta = '<dl class="dl-profile dl-horizontal">';
            var dataProfile = data.features[0].properties;
            
            haatMeta += '<dt>Average Elevation:</dt>';
            haatMeta += '<dd>' + dataProfile.average_elevation[0] + ' ' + dataProfile.unit + '</dd>';
            haatMeta += '<dt>Latitude:</dt>';
            haatMeta += '<dd>' + dataProfile.lat + '</dd>';
            haatMeta += '<dt>Longitude:</dt>';
            haatMeta += '<dd>' + dataProfile.lon + '</dd>';
            haatMeta += '<dt>Azimuth:</dt>';
            haatMeta += '<dd>' + dataProfile.azimuth + '</dd>';
            haatMeta += '<dt>Data Source:</dt>';
            haatMeta += '<dd>' + dataProfile.elevation_data_source + '</dd>';
            haatMeta += '</dl>';

            return haatMeta;

        }
    };

    module.exports = ProfileMap;
    
}());

},{"./apiMap.js":3}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91ck1hcC5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tYXAuanMnKTtcclxuICAgIHZhciBDb250b3VyRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb250b3VyRm9ybS5qcycpO1xyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvZWxldmF0aW9uRm9ybS5qcycpO1xyXG4gICAgdmFyIEhBQVRGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2hhYXRGb3JtLmpzJyk7XHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvcHJvZmlsZUZvcm0uanMnKTtcclxuICAgIFxyXG4gICAgQVBJRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICBNYXAuaW5pdCgpO1xyXG4gICAgRWxldmF0aW9uRm9ybS5nZXRQYXJhbXMoKTsgICAgXHJcbiAgICBDb250b3VyRm9ybS5nZXRQYXJhbXMoKTsgICAgXHJcbiAgICBIQUFURm9ybS5nZXRQYXJhbXMoKTsgICAgICAgIFxyXG4gICAgUHJvZmlsZUZvcm0uZ2V0UGFyYW1zKCk7XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHsgICAgICAgICAgICBcclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS5vbignY2hhbmdlJywgQVBJRm9ybS5zd2l0Y2hGb3JtKTtcclxuXHJcbiAgICAgICAgICAgICQod2luZG93KS5rZXlkb3duKGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyNidG4tZ2V0QVBJJykuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKHtcclxuICAgICAgICAgICAgICAgIGJhY2tkcm9wOiAnc3RhdGljJyxcclxuICAgICAgICAgICAgICAgIGtleWJvYXJkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3c6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3dpdGNoRm9ybTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEFQSSA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuZmllbGRzJykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAkKCcuZmllbGRzLScgKyBzZWxlY3RlZEFQSSkuc2xpZGVEb3duKCk7XHJcblxyXG4gICAgICAgICAgICAkKCcjYnRuLWdldEFQSScpLmF0dHIoJ2RhdGEtYXBpJywgc2VsZWN0ZWRBUEkpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJylbMF0ucmVzZXQoKTtcclxuXHJcbiAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS52YWwoc2VsZWN0ZWRBUEkpOyAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS5jbGVhcigpO1xyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgTWFwLnJlc2V0VmlldygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2hvd0Vycm9yOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI21vZGFsLWxvYWRpbmcnKS5tb2RhbCgnaGlkZScpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5zbGlkZURvd24oKTtcclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLmNsZWFyKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgTWFwLnJlc2V0VmlldygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQVBJTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbihhcGlVUkwsIGFwaVN1Y2Nlc3MpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBhamF4U3VjY2VzcyA9IGZ1bmN0aW9uKGRhdGEpIHsgXHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSU1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UudXJsID0gYXBpVVJMO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogYXBpVVJMLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBhcGlTdWNjZXNzID8gYXBpU3VjY2VzcyA6IGFqYXhTdWNjZXNzLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IEFQSUZvcm0uc2hvd0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24oZGF0YSkge1xyXG5cclxuICAgICAgICAgICAgdmFyIGxhdCA9IGRhdGEubGF0ID8gZGF0YS5sYXQgOiBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdO1xyXG4gICAgICAgICAgICB2YXIgbG9uID0gZGF0YS5sb24gPyBkYXRhLmxvbiA6IGRhdGEuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF07XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBtZXRhID0gQVBJTWFwLmdldFRvb2x0aXBNZXRhKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5nZW9Kc29uKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsb25dKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKG1ldGEpXHJcbiAgICAgICAgICAgICAgICAub3BlblBvcHVwKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLnNldFZpZXcoW2xhdCwgbG9uXSwgNyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSU1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0ge1xyXG5cclxuICAgICAgICBkaXNwbGF5OiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgSlNPTiBuZXh0IHRvIG1hcFxyXG5cclxuICAgICAgICAgICAgJCgnI21vZGFsLWxvYWRpbmcnKS5tb2RhbCgnaGlkZScpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19vdXQgY29kZScpLnRleHQoSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgICAkKCdwcmUgY29kZScpLmVhY2goZnVuY3Rpb24oaSwgYmxvY2spIHtcclxuICAgICAgICAgICAgICAgIGhsanMuaGlnaGxpZ2h0QmxvY2soYmxvY2spO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fZHdubGQnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2hyZWYnLCBBUElSZXNwb25zZS51cmwpXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKS50ZXh0KCcnKTtcclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19kd25sZCcpLmFkZENsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSVJlc3BvbnNlO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBDb250b3VyTWFwID0gcmVxdWlyZSgnLi9jb250b3VyTWFwLmpzJyk7ICAgXHJcblxyXG4gICAgdmFyIENvbnRvdXJGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaWRUeXBlcyA9IHtcclxuICAgICAgICAgICAgICAgIGZhY2lsaXR5aWQ6ICdGYWNpbGl0eSBJRCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsc2lnbjogJ0NhbGwgU2lnbicsXHJcbiAgICAgICAgICAgICAgICBmaWxlbnVtYmVyOiAnRmlsZSBOdW1iZXInLFxyXG4gICAgICAgICAgICAgICAgYXBwbGljYXRpb25pZDogJ0FwcGxpY2F0aW9uIElEJyxcclxuICAgICAgICAgICAgICAgIGFudGVubmFpZDogJ0FudGVubmEgSUQnXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VydmljZVR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgdHY6IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGZtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnZmlsZW51bWJlcicsICdhcHBsaWNhdGlvbmlkJ10sXHJcbiAgICAgICAgICAgICAgICBhbTogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2FudGVubmFpZCddXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IG9wdGlvbmFsIGZpZWxkcyBiYXNlZCBvbiBTZXJ2aWNlIFR5cGVcclxuICAgICAgICAgICAgJCgnI3NlcnZpY2VUeXBlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgICAgICQoJyNpZFR5cGUnKVxyXG4gICAgICAgICAgICAgICAgICAgIC52YWwoJ2ZhY2lsaXR5aWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKCdvcHRpb24nKS5oaWRlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiaWRWYWx1ZVwiXScpLnRleHQoJ0ZhY2lsaXR5IElEJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjaWRWYWx1ZScpLnZhbCgnJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgJChzZXJ2aWNlVHlwZXNbdGhpcy52YWx1ZV0pLmVhY2goZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnb3B0aW9uW3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiXScpLnNob3coKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnZhbHVlID09PSAnYW0nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmpzLWFtLW9ubHknKS5zbGlkZURvd24oKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmpzLWFtLW9ubHknKS5zbGlkZVVwKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gdXBkYXRlIHNlbGVjdGVkIElEIFR5cGUgbGFiZWwgdGV4dFxyXG4gICAgICAgICAgICAkKCcjaWRUeXBlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgJCgnI2lkVmFsdWUnKS52YWwoJycpO1xyXG4gICAgICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiaWRWYWx1ZVwiXScpLnRleHQoaWRUeXBlc1t0aGlzLnZhbHVlXSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmNvbnRvdXJBUEknLCAnW2RhdGEtYXBpPVwiY29udG91clwiXScsIENvbnRvdXJNYXAuZ2V0Q29udG91cik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY29udG91ci5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy97c2VydmljZVR5cGV9L3tpZFR5cGV9L3tpZFZhbHVlfS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBDb250b3VyRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgQ29udG91ckZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb250b3VyRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSB7ICAgICAgICBcclxuICAgICAgICBnZXRDb250b3VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJBUEkgPSAnJztcclxuICAgICAgICAgICAgdmFyIGFwaVVSTCA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgc2VydmljZVR5cGUgPSAkKCcjc2VydmljZVR5cGUnKS52YWwoKTtcclxuICAgICAgICAgICAgdmFyIGFtUGFyYW1zID0gJyc7XHJcblxyXG4gICAgICAgICAgICAkKCcuZmllbGRzLWNvbnRvdXInKS5maW5kKCc6aW5wdXQnKS5ub3QoJ2J1dHRvbicpLmVhY2goZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGFwaVVSTC5wdXNoKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJBUEkgPSBhcGlVUkwuc2xpY2UoMCwgMykuam9pbignLycpICsgJy5qc29uJztcclxuXHJcbiAgICAgICAgICAgIGlmIChzZXJ2aWNlVHlwZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgYW1QYXJhbXMgPSAnPycgKyAkKCcjZm9ybS1wYXJhbXMnKS5zZXJpYWxpemUoKS5zcGxpdCgnJicpLnNsaWNlKDMsIDUpLmpvaW4oJyYnKTtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gYW1QYXJhbXM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLnVybCA9IGNvbnRvdXJBUEk7XHJcblxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjb250b3VyQVBJLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZUNvbnRvdXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSVJlc3BvbnNlLmRpc3BsYXkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IEFQSUZvcm0uc2hvd0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlQ29udG91cjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgY29udG91cl9zdHlsZSA9IHtcclxuICAgICAgICAgICAgICAgIGNvbG9yOiBcIiMxMzQyOEJcIixcclxuICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogXCIjMTM0MjhCXCIsXHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLjAsXHJcbiAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eTogMC4zLFxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0OiA0XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgcCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcztcclxuICAgICAgICAgICAgdmFyIHN0YXRpb25fbGF0ID0gcC5zdGF0aW9uX2xhdDtcclxuICAgICAgICAgICAgdmFyIHN0YXRpb25fbG9uID0gcC5zdGF0aW9uX2xvbjtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNvbnRvdXJKU09OID0gTC5nZW9Kc29uKGRhdGEsIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlOiBjb250b3VyX3N0eWxlXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5maXRCb3VuZHMoTWFwLmNvbnRvdXJKU09OLmdldEJvdW5kcygpKTtcclxuICAgICAgICAgICAgQ29udG91ck1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhID0gJyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2FsbCBTaWduOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYWxsc2lnbiArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlNlcnZpY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZhY2lsaXR5IElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5mYWNpbGl0eV9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZpbGUgTnVtYmVyOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5maWxlbnVtYmVyICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xhdCwgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uXSlcclxuICAgICAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLmZlYXR1cmVMYXllcilcclxuICAgICAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGNvbnRvdXJNZXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb250b3VyTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSByZXF1aXJlKCcuL2VsZXZhdGlvbk1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suZWxldmF0aW9uQVBJJywgJ1tkYXRhLWFwaT1cImVsZXZhdGlvblwiXScsIEVsZXZhdGlvbk1hcC5nZXREYXRhKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHQvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1lbGV2YXRpb24uanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvZWxldmF0aW9uLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEVsZXZhdGlvbkZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWVsZXZhdGlvbicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZXZhdGlvbkZvcm07XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgRWxldmF0aW9uTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZhdGlvbkFQSSA9ICcuL2VsZXZhdGlvbi5qc29uPyc7XHJcblxyXG4gICAgICAgICAgICBlbGV2YXRpb25BUEkgKz0gJCgnLmZpZWxkcy1lbGV2YXRpb24nKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEVsZXZhdGlvbk1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGVsZXZhdGlvbkFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZWxldk1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtZWxldmF0aW9uIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5lbGV2YXRpb24gKyAnICcgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5kYXRhU291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBlbGV2TWV0YTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0gcmVxdWlyZSgnLi9oYWF0TWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEhBQVRGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suaGFhdEFQSScsICdbZGF0YS1hcGk9XCJoYWF0XCJdJywgSEFBVE1hcC5nZXREYXRhKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktaGFhdC5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9oYWF0Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEhBQVRGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1oYWF0JykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBIQUFURm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRGb3JtO1xyXG4gICAgXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuICAgIFxyXG4gICAgdmFyIEhBQVRNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdEFQSSA9ICcuL2hhYXQuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdEFQSSArPSAkKCcuZmllbGRzLWhhYXQnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEhBQVRNYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShoYWF0QVBJKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1oYWF0IGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICB2YXIgZGF0YUhBQVQgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXM7IFxyXG5cclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEhBQVQ6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5oYWF0X2F2ZXJhZ2UgKyAnICcgKyBkYXRhSEFBVC51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD4jIG9mIHJhZGlhbHM6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5ucmFkaWFsICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5SQ0FNU0w6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5yY2Ftc2wgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkRhdGEgU291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBNYXAgPSB7XHJcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRvdXJKU09OID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRpb25NYXJrZXIgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgICAgICBNYXAuY3JlYXRlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgTC5tYXBib3guYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2lZMjl0Y0hWMFpXTm9JaXdpWVNJNkluTXlibE15YTNjaWZRLlA4eXBwZXNIa2k1cU15eFRjMkNOTGcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcCA9IEwubWFwYm94Lm1hcCgnbWFwJywgJ2ZjYy5rNzRlZDVnZScsIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4Wm9vbTogMTlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VTdHJlZXQgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRlZDVnZScpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVNhdGVsbGl0ZSA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGQ3bjBnJyk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVGVycmFpbiA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGNtM29sJyk7XHJcblxyXG4gICAgICAgICAgICBMLmNvbnRyb2wuc2NhbGUoe1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b21yaWdodCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZ2VvY29kZXIgPSBMLm1hcGJveC5nZW9jb2RlcignbWFwYm94LnBsYWNlcy12MScpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxheWVyQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuTGF5ZXJzKHtcclxuICAgICAgICAgICAgICAgICdTdHJlZXQnOiBiYXNlU3RyZWV0LmFkZFRvKE1hcC5tYXApLFxyXG4gICAgICAgICAgICAgICAgJ1NhdGVsbGl0ZSc6IGJhc2VTYXRlbGxpdGUsXHJcbiAgICAgICAgICAgICAgICAnVGVycmFpbic6IGJhc2VUZXJyYWluXHJcbiAgICAgICAgICAgIH0sIHt9LCB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcGxlZnQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnLmZpZWxkczp2aXNpYmxlJylcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnaW5wdXRbbmFtZT1cImxhdFwiXScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnZhbChlLmxhdGxuZy5sYXQpXHJcbiAgICAgICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWU9XCJsb25cIl0nKVxyXG4gICAgICAgICAgICAgICAgICAgIC52YWwoZS5sYXRsbmcubG5nKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGxhdCwgbG9uKSB7XHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2xhdCwgbG9uXSkuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbGVhckxheWVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoTWFwLm1hcC5oYXNMYXllcihNYXAuY29udG91ckpTT04pKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5jb250b3VySlNPTik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5zdGF0aW9uTWFya2VyKSkge1xyXG4gICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAuc3RhdGlvbk1hcmtlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5mZWF0dXJlTGF5ZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc2V0VmlldzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIE1hcC5tYXAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSByZXF1aXJlKCcuL3Byb2ZpbGVNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5wcm9maWxlQVBJJywgJ1tkYXRhLWFwaT1cInByb2ZpbGVcIl0nLCBQcm9maWxlTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLXByb2ZpbGUuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvcHJvZmlsZS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBQcm9maWxlRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tcHJvZmlsZScpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgUHJvZmlsZUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm9maWxlRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRBUEkgPSAnLi9wcm9maWxlLmpzb24/JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGhhYXRBUEkgKz0gJCgnLmZpZWxkcy1wcm9maWxlJykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBQcm9maWxlTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEoaGFhdEFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtcHJvZmlsZSBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGRhdGFQcm9maWxlID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF2ZXJhZ2VfZWxldmF0aW9uWzBdICsgJyAnICsgZGF0YVByb2ZpbGUudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXppbXV0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF6aW11dGggKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkRhdGEgU291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIl19
