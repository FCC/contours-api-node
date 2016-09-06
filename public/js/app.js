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
            var apiType = $('#btn-getAPI').attr('data-api');

            $('#apiType').on('change', this.switchForm);
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
                if (data.status === 'error') {
                    APIForm.showError();
                } else {
                    $('.alert').hide('fast');
                    APIMap.createMarker(data);
                    APIResponse.display(data);
                }
            };

            Map.url = apiURL;

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

    var Map = require('./map.js');

    var APIResponse = {

        display: function(data) {
            // display JSON next to map

            $('.apiResponse__out code').text(JSON.stringify(data, null, 2));
            $('pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });

            $('.apiResponse__dwnld')
                .attr('href', Map.url)
                .removeClass('hide');
        },

        clear: function() {
            $('.apiResponse__out code').text('');
            $('.apiResponse__dwnld').addClass('hide');
        }
    };

    module.exports = APIResponse;

}());

},{"./map.js":11}],5:[function(require,module,exports){
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

            $(window).keydown(function(event) {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    $('#btn-getAPI').click();
                }
            });
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
            var source = $('#contour-template').html();
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

            Map.url = contourAPI;

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
            var source = $('#elevation-template').html();
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

    var APIForm = require('./apiForm.js');
    var APIMap = require('./apiMap.js');
    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var ElevationMap = {

        getData: function() {
            var elevationAPI = './elevation.json?';

            var apiSuccess = function(data) {
                if (data.features[0].properties.status === 'success') {
                    $('.alert').hide('fast');
                    APIMap.createMarker(data);
                    APIResponse.display(data);
                } else {
                    APIForm.showError();
                }
            };

            elevationAPI += $('.fields-elevation').serialize();

            APIMap.getTooltipMeta = ElevationMap.getTooltipMeta;

            APIMap.getData(elevationAPI, apiSuccess);
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

},{"./apiForm.js":2,"./apiMap.js":3,"./apiResponse.js":4,"./map.js":11}],9:[function(require,module,exports){
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
            var source = $('#haat-template').html();
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

    var APIForm = require('./apiForm.js');
    var APIMap = require('./apiMap.js');
    var Map = require('./map.js');

    var HAATMap = {

        getData: function() {
            var haatAPI = './haat.json?';
            
            haatAPI += $('.fields-haat').serialize();

            APIMap.getTooltipMeta = HAATMap.getTooltipMeta;

            APIMap.getData(haatAPI);
        },
        getTooltipMeta: function(data) {
            var haatMeta = '<dl class="dl-haat dl-horizontal">';

            haatMeta += '<dt>Average HAAT:</dt>';
            haatMeta += '<dd>' + data.haat_average + ' ' + data.unit + '</dd>';
            haatMeta += '<dt>Latitude:</dt>';
            haatMeta += '<dd>' + data.lat + '</dd>';
            haatMeta += '<dt>Longitude:</dt>';
            haatMeta += '<dd>' + data.lon + '</dd>';
            haatMeta += '<dt># of radials:</dt>';
            haatMeta += '<dd>' + data.nradial + '</dd>';
            haatMeta += '<dt>RCAMSL:</dt>';
            haatMeta += '<dd>' + data.rcamsl + '</dd>';
            haatMeta += '<dt>Data Source:</dt>';
            haatMeta += '<dd>' + data.elevation_data_source + '</dd>';
            haatMeta += '</dl>';

            return haatMeta;

        }
    };

    module.exports = HAATMap;
    
}());

},{"./apiForm.js":2,"./apiMap.js":3,"./map.js":11}],11:[function(require,module,exports){
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
            var source = $('#profile-template').html();
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

},{"./apiForm.js":2,"./apiMap.js":3,"./map.js":11}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91ck1hcC5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21vZHVsZXMvbWFwLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ckZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvY29udG91ckZvcm0uanMnKTtcclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMnKTtcclxuICAgIHZhciBIQUFURm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oYWF0Rm9ybS5qcycpO1xyXG4gICAgdmFyIFByb2ZpbGVGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL3Byb2ZpbGVGb3JtLmpzJyk7XHJcbiAgICBcclxuICAgIEFQSUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgTWFwLmluaXQoKTtcclxuICAgIEVsZXZhdGlvbkZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgQ29udG91ckZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgSEFBVEZvcm0uZ2V0UGFyYW1zKCk7ICAgICAgICBcclxuICAgIFByb2ZpbGVGb3JtLmdldFBhcmFtcygpO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBhcGlUeXBlID0gJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS5vbignY2hhbmdlJywgdGhpcy5zd2l0Y2hGb3JtKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN3aXRjaEZvcm06IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRBUEkgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmZpZWxkcycpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmZpZWxkcy0nICsgc2VsZWN0ZWRBUEkpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScsIHNlbGVjdGVkQVBJKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpWzBdLnJlc2V0KCk7XHJcblxyXG4gICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykudmFsKHNlbGVjdGVkQVBJKTsgICAgICAgICAgIFxyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UuY2xlYXIoKTtcclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIE1hcC5yZXNldFZpZXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNob3dFcnJvcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmFsZXJ0Jykuc2xpZGVEb3duKCk7XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS5jbGVhcigpO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIE1hcC5yZXNldFZpZXcoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oYXBpVVJMLCBhcGlTdWNjZXNzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWpheFN1Y2Nlc3MgPSBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT09ICdlcnJvcicpIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLnVybCA9IGFwaVVSTDtcclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVSTCxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogYXBpU3VjY2VzcyA/IGFwaVN1Y2Nlc3MgOiBhamF4U3VjY2VzcyxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBBUElGb3JtLnNob3dFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBsYXQgPSBkYXRhLmxhdCA/IGRhdGEubGF0IDogZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1sxXTtcclxuICAgICAgICAgICAgdmFyIGxvbiA9IGRhdGEubG9uID8gZGF0YS5sb24gOiBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgbWV0YSA9IEFQSU1hcC5nZXRUb29sdGlwTWV0YShkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwuZ2VvSnNvbihkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2xhdCwgbG9uXSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlci5hZGRUbyhNYXAubWFwKVxyXG4gICAgICAgICAgICAgICAgLmJpbmRQb3B1cChtZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFtsYXQsIGxvbl0sIDcpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG5cclxuICAgIHZhciBBUElSZXNwb25zZSA9IHtcclxuXHJcbiAgICAgICAgZGlzcGxheTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IEpTT04gbmV4dCB0byBtYXBcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKS50ZXh0KEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcclxuICAgICAgICAgICAgJCgncHJlIGNvZGUnKS5lYWNoKGZ1bmN0aW9uKGksIGJsb2NrKSB7XHJcbiAgICAgICAgICAgICAgICBobGpzLmhpZ2hsaWdodEJsb2NrKGJsb2NrKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX2R3bmxkJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdocmVmJywgTWFwLnVybClcclxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZScpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19vdXQgY29kZScpLnRleHQoJycpO1xyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX2R3bmxkJykuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJUmVzcG9uc2U7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgQ29udG91ckZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBpZFR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgZmFjaWxpdHlpZDogJ0ZhY2lsaXR5IElEJyxcclxuICAgICAgICAgICAgICAgIGNhbGxzaWduOiAnQ2FsbCBTaWduJyxcclxuICAgICAgICAgICAgICAgIGZpbGVudW1iZXI6ICdGaWxlIE51bWJlcicsXHJcbiAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbmlkOiAnQXBwbGljYXRpb24gSUQnLFxyXG4gICAgICAgICAgICAgICAgYW50ZW5uYWlkOiAnQW50ZW5uYSBJRCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICB0djogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgZm06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGFtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnYW50ZW5uYWlkJ11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgb3B0aW9uYWwgZmllbGRzIGJhc2VkIG9uIFNlcnZpY2UgVHlwZVxyXG4gICAgICAgICAgICAkKCcjc2VydmljZVR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnI2lkVHlwZScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnZhbCgnZmFjaWxpdHlpZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ29wdGlvbicpLmhpZGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKHNlcnZpY2VUeXBlc1t0aGlzLnZhbHVlXSkuZWFjaChmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdvcHRpb25bdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJykuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsdWUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlVXAoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgc2VsZWN0ZWQgSUQgVHlwZSBsYWJlbCB0ZXh0XHJcbiAgICAgICAgICAgICQoJyNpZFR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjaWRWYWx1ZScpLnZhbCgnJyk7XHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dChpZFR5cGVzW3RoaXMudmFsdWVdKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suY29udG91ckFQSScsICdbZGF0YS1hcGk9XCJjb250b3VyXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuXHJcbiAgICAgICAgICAgICQod2luZG93KS5rZXlkb3duKGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyNidG4tZ2V0QVBJJykuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1jb250b3VyLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL3tzZXJ2aWNlVHlwZX0ve2lkVHlwZX0ve2lkVmFsdWV9Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIENvbnRvdXJGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNjb250b3VyLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcblxyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXInKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIENvbnRvdXJGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQ29udG91ckZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0gcmVxdWlyZSgnLi9hcGlSZXNwb25zZS5qcycpO1xyXG5cclxuICAgIHZhciBDb250b3VyTWFwID0geyAgICAgICAgXHJcbiAgICAgICAgZ2V0Q29udG91cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyQVBJID0gJyc7XHJcbiAgICAgICAgICAgIHZhciBhcGlVUkwgPSBbXTtcclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlID0gJCgnI3NlcnZpY2VUeXBlJykudmFsKCk7XHJcbiAgICAgICAgICAgIHZhciBhbVBhcmFtcyA9ICcnO1xyXG5cclxuICAgICAgICAgICAgJCgnLmZpZWxkcy1jb250b3VyJykuZmluZCgnOmlucHV0Jykubm90KCdidXR0b24nKS5lYWNoKGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBhcGlVUkwucHVzaCh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyQVBJID0gYXBpVVJMLnNsaWNlKDAsIDMpLmpvaW4oJy8nKSArICcuanNvbic7XHJcblxyXG4gICAgICAgICAgICBpZiAoc2VydmljZVR5cGUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgIGFtUGFyYW1zID0gJz8nICsgJCgnI2Zvcm0tcGFyYW1zJykuc2VyaWFsaXplKCkuc3BsaXQoJyYnKS5zbGljZSgzLCA1KS5qb2luKCcmJyk7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJICs9IGFtUGFyYW1zO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBNYXAudXJsID0gY29udG91ckFQSTtcclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGNvbnRvdXJBUEksXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnRvdXJNYXAuY3JlYXRlQ29udG91cihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogQVBJRm9ybS5zaG93RXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVDb250b3VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyX3N0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiIzEzNDI4QlwiLFxyXG4gICAgICAgICAgICAgICAgZmlsbENvbG9yOiBcIiMxMzQyOEJcIixcclxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEuMCxcclxuICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiAwLjMsXHJcbiAgICAgICAgICAgICAgICB3ZWlnaHQ6IDRcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB2YXIgc3RhdGlvbl9sYXQgPSBwLnN0YXRpb25fbGF0O1xyXG4gICAgICAgICAgICB2YXIgc3RhdGlvbl9sb24gPSBwLnN0YXRpb25fbG9uO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuY29udG91ckpTT04gPSBMLmdlb0pzb24oZGF0YSwge1xyXG4gICAgICAgICAgICAgICAgc3R5bGU6IGNvbnRvdXJfc3R5bGVcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLmZpdEJvdW5kcyhNYXAuY29udG91ckpTT04uZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJNZXRhID0gJyc7XHJcblxyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyID0gTC5tYXBib3guZmVhdHVyZUxheWVyKCkuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgPSAnJztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGwgY2xhc3M9XCJkbC1jb250b3VyIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5DYWxsIFNpZ246PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmNhbGxzaWduICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnNlcnZpY2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+U2VydmljZTo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnNlcnZpY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+RmFjaWxpdHkgSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmZhY2lsaXR5X2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+RmlsZSBOdW1iZXI6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmZpbGVudW1iZXIgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIgPSBMLm1hcmtlcihbZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbGF0LCBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sb25dKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRUbyhNYXAuZmVhdHVyZUxheWVyKVxyXG4gICAgICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29udG91ck1ldGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbk1hcCA9IHJlcXVpcmUoJy4vZWxldmF0aW9uTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5lbGV2YXRpb25BUEknLCAnW2RhdGEtYXBpPVwiZWxldmF0aW9uXCJdJywgRWxldmF0aW9uTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVsZXZhdGlvbi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9lbGV2YXRpb24ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjZWxldmF0aW9uLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1lbGV2YXRpb24nKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIEVsZXZhdGlvbkZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbGV2YXRpb25Gb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbk1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBlbGV2YXRpb25BUEkgPSAnLi9lbGV2YXRpb24uanNvbj8nO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFwaVN1Y2Nlc3MgPSBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSU1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGVsZXZhdGlvbkFQSSArPSAkKCcuZmllbGRzLWVsZXZhdGlvbicpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldFRvb2x0aXBNZXRhID0gRWxldmF0aW9uTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEoZWxldmF0aW9uQVBJLCBhcGlTdWNjZXNzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBlbGV2TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1lbGV2YXRpb24gZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+RWxldmF0aW9uOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLmVsZXZhdGlvbiArICcgJyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMV0gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF0gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkRhdGEgU291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLmRhdGFTb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGVsZXZNZXRhO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbGV2YXRpb25NYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEhBQVRNYXAgPSByZXF1aXJlKCcuL2hhYXRNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgSEFBVEZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5oYWF0QVBJJywgJ1tkYXRhLWFwaT1cImhhYXRcIl0nLCBIQUFUTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgXHQvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1oYWF0Lmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL2hhYXQue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgSEFBVEZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2hhYXQtdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWhhYXQnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIEhBQVRGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9ICAgICAgICBcclxuICAgIH07XHJcbiAgICBcclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVEZvcm07XHJcbiAgICBcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRBUEkgPSAnLi9oYWF0Lmpzb24/JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGhhYXRBUEkgKz0gJCgnLmZpZWxkcy1oYWF0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBIQUFUTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEoaGFhdEFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtaGFhdCBkbC1ob3Jpem9udGFsXCI+JztcclxuXHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXZlcmFnZSBIQUFUOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YS5oYWF0X2F2ZXJhZ2UgKyAnICcgKyBkYXRhLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD4jIG9mIHJhZGlhbHM6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhLm5yYWRpYWwgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEucmNhbXNsICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBNYXAgPSB7XHJcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRvdXJKU09OID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRpb25NYXJrZXIgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgICAgICBNYXAuY3JlYXRlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgTC5tYXBib3guYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2lZMjl0Y0hWMFpXTm9JaXdpWVNJNkluTXlibE15YTNjaWZRLlA4eXBwZXNIa2k1cU15eFRjMkNOTGcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcCA9IEwubWFwYm94Lm1hcCgnbWFwJywgJ2ZjYy5rNzRlZDVnZScsIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4Wm9vbTogMTlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VTdHJlZXQgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRlZDVnZScpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVNhdGVsbGl0ZSA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGQ3bjBnJyk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVGVycmFpbiA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGNtM29sJyk7XHJcblxyXG4gICAgICAgICAgICBMLmNvbnRyb2wuc2NhbGUoe1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b21yaWdodCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZ2VvY29kZXIgPSBMLm1hcGJveC5nZW9jb2RlcignbWFwYm94LnBsYWNlcy12MScpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxheWVyQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuTGF5ZXJzKHtcclxuICAgICAgICAgICAgICAgICdTdHJlZXQnOiBiYXNlU3RyZWV0LmFkZFRvKE1hcC5tYXApLFxyXG4gICAgICAgICAgICAgICAgJ1NhdGVsbGl0ZSc6IGJhc2VTYXRlbGxpdGUsXHJcbiAgICAgICAgICAgICAgICAnVGVycmFpbic6IGJhc2VUZXJyYWluXHJcbiAgICAgICAgICAgIH0sIHt9LCB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcGxlZnQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlTWFya2VyOiBmdW5jdGlvbihsYXQsIGxvbikge1xyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtsYXQsIGxvbl0pLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xlYXJMYXllcnM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmNvbnRvdXJKU09OKSkge1xyXG4gICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAuY29udG91ckpTT04pO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmZlYXR1cmVMYXllcikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzZXRWaWV3OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHJlcXVpcmUoJy4vcHJvZmlsZU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLnByb2ZpbGVBUEknLCAnW2RhdGEtYXBpPVwicHJvZmlsZVwiXScsIFByb2ZpbGVNYXAuZ2V0RGF0YSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktcHJvZmlsZS5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9wcm9maWxlLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIFByb2ZpbGVGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNwcm9maWxlLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1wcm9maWxlJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBQcm9maWxlRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVGb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdEFQSSA9ICcuL3Byb2ZpbGUuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdEFQSSArPSAkKCcuZmllbGRzLXByb2ZpbGUnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IFByb2ZpbGVNYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShoYWF0QVBJKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1wcm9maWxlIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEuYXZlcmFnZV9lbGV2YXRpb24gKyAnICcgKyBkYXRhLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIl19
