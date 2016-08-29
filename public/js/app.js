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

},{"./modules/apiForm.js":2,"./modules/contourForm.js":3,"./modules/elevationForm.js":5,"./modules/haatForm.js":7,"./modules/map.js":9,"./modules/profileForm.js":10}],2:[function(require,module,exports){
(function() {
    'use strict';

    var Map = require('./map.js');

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

            Map.clearLayers();
            Map.resetView();
        },
        showError: function() {
            $('.alert').hide('fast');
            $('.alert').slideDown();

            Map.clearLayers();
            Map.resetView();
        }
    };

    module.exports = APIForm;

}());

},{"./map.js":9}],3:[function(require,module,exports){
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

},{"./contourMap.js":4}],4:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');

    var ContourMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;
        },
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

},{"./apiForm.js":2,"./map.js":9}],5:[function(require,module,exports){
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

},{"./elevationMap.js":6}],6:[function(require,module,exports){
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
            var elevationAPI = './elevation.json?';
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

            Map.contourJSON = L.geoJson(data)
                .addTo(Map.map)
                .bindPopup(elevMeta)
                .openPopup();

            Map.map.setView([lat, lon], 7);
        }
    };

    module.exports = ElevationMap;
}());

},{"./apiForm.js":2,"./map.js":9}],7:[function(require,module,exports){
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

},{"./haatMap.js":8}],8:[function(require,module,exports){
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
            var haatAPI = './haat.json?';
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

},{"./apiForm.js":2,"./map.js":9}],9:[function(require,module,exports){
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

     module.exports =  Map;

}());

},{}],10:[function(require,module,exports){
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

},{"./profileMap.js":11}],11:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');

    var ProfileMap = {
        init: function() {
            this.map = undefined;
            this.contourJSON = undefined;
            this.stationMarker = undefined;
        },

        getData: function(event) {
            var profileAPI = './profile.json?';
            var apiURL = [];

            profileAPI += $('.fields-profile').serialize();

            $.ajax({
                url: profileAPI,
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    if (data.status === 'error') {                        
                        APIForm.showError();
                    } else {
                        $('.alert').hide('fast');
                        ProfileMap.createMarker(data);
                    }
                },
                error: APIForm.showError
            });
        },

        createMarker: function(data) {
            var elevMeta = '';

            Map.clearLayers();

            elevMeta += '<dl class="dl-profile dl-horizontal">';
            elevMeta += '<dt>Average Elevation:</dt>';
            elevMeta += '<dd>' + data.average_elevation + ' ' + data.unit + '</dd>';
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

    module.exports = ProfileMap;
}());

},{"./apiForm.js":2,"./map.js":9}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3VyRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25Gb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvZWxldmF0aW9uTWFwLmpzIiwicHVibGljL2pzL21vZHVsZXMvaGFhdEZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0TWFwLmpzIiwicHVibGljL2pzL21vZHVsZXMvbWFwLmpzIiwicHVibGljL2pzL21vZHVsZXMvcHJvZmlsZUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlTWFwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21vZHVsZXMvbWFwLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ckZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvY29udG91ckZvcm0uanMnKTtcclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMnKTtcclxuICAgIHZhciBIQUFURm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oYWF0Rm9ybS5qcycpO1xyXG4gICAgdmFyIFByb2ZpbGVGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL3Byb2ZpbGVGb3JtLmpzJyk7XHJcbiAgICBcclxuICAgIEFQSUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgTWFwLmluaXQoKTtcclxuICAgIEVsZXZhdGlvbkZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgQ29udG91ckZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgSEFBVEZvcm0uZ2V0UGFyYW1zKCk7ICAgICAgICBcclxuICAgIFByb2ZpbGVGb3JtLmdldFBhcmFtcygpO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBhcGlUeXBlID0gJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS5vbignY2hhbmdlJywgdGhpcy5zd2l0Y2hGb3JtKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN3aXRjaEZvcm06IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRBUEkgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmZpZWxkcycpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmZpZWxkcy0nICsgc2VsZWN0ZWRBUEkpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScsIHNlbGVjdGVkQVBJKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpWzBdLnJlc2V0KCk7XHJcblxyXG4gICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykudmFsKHNlbGVjdGVkQVBJKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICBNYXAucmVzZXRWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaG93RXJyb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIE1hcC5yZXNldFZpZXcoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHJlcXVpcmUoJy4vY29udG91ck1hcC5qcycpOyAgIFxyXG5cclxuICAgIHZhciBDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGlkVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICBmYWNpbGl0eWlkOiAnRmFjaWxpdHkgSUQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbHNpZ246ICdDYWxsIFNpZ24nLFxyXG4gICAgICAgICAgICAgICAgZmlsZW51bWJlcjogJ0ZpbGUgTnVtYmVyJyxcclxuICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uaWQ6ICdBcHBsaWNhdGlvbiBJRCcsXHJcbiAgICAgICAgICAgICAgICBhbnRlbm5haWQ6ICdBbnRlbm5hIElEJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlcyA9IHtcclxuICAgICAgICAgICAgICAgIHR2OiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnZmlsZW51bWJlcicsICdhcHBsaWNhdGlvbmlkJ10sXHJcbiAgICAgICAgICAgICAgICBmbTogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgYW06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdhbnRlbm5haWQnXVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgICQoJyNzZXJ2aWNlVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjaWRUeXBlJylcclxuICAgICAgICAgICAgICAgICAgICAudmFsKCdmYWNpbGl0eWlkJylcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnb3B0aW9uJykuaGlkZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2lkVmFsdWUnKS52YWwoJycpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoc2VydmljZVR5cGVzW3RoaXMudmFsdWVdKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ29wdGlvblt2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCBJRCBUeXBlIGxhYmVsIHRleHRcclxuICAgICAgICAgICAgJCgnI2lkVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KGlkVHlwZXNbdGhpcy52YWx1ZV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3VyQVBJJywgJ1tkYXRhLWFwaT1cImNvbnRvdXJcIl0nLCBDb250b3VyTWFwLmdldENvbnRvdXIpO1xyXG5cclxuICAgICAgICAgICAgJCh3aW5kb3cpLmtleWRvd24oZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWNvbnRvdXIuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycve3NlcnZpY2VUeXBlfS97aWRUeXBlfS97aWRWYWx1ZX0ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgQ29udG91ckZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2NvbnRvdXItdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgQ29udG91ckZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb250b3VyRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSB7XHJcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRvdXJKU09OID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRpb25NYXJrZXIgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRDb250b3VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJBUEkgPSAnJztcclxuICAgICAgICAgICAgdmFyIGFwaVVSTCA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgc2VydmljZVR5cGUgPSAkKCcjc2VydmljZVR5cGUnKS52YWwoKTtcclxuICAgICAgICAgICAgdmFyIGFtUGFyYW1zID0gJyc7XHJcblxyXG4gICAgICAgICAgICAkKCcuZmllbGRzLWNvbnRvdXInKS5maW5kKCc6aW5wdXQnKS5ub3QoJ2J1dHRvbicpLmVhY2goZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIGFwaVVSTC5wdXNoKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJBUEkgPSBhcGlVUkwuc2xpY2UoMCwgMykuam9pbignLycpICsgJy5qc29uJztcclxuXHJcbiAgICAgICAgICAgIGlmIChzZXJ2aWNlVHlwZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgYW1QYXJhbXMgPSAnPycgKyAkKCcjZm9ybS1wYXJhbXMnKS5zZXJpYWxpemUoKS5zcGxpdCgnJicpLnNsaWNlKDMsIDUpLmpvaW4oJyYnKTtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gYW1QYXJhbXM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGNvbnRvdXJBUEksXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnRvdXJNYXAuY3JlYXRlQ29udG91cihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogQVBJRm9ybS5zaG93RXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVDb250b3VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyX3N0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgY29sb3I6IFwiIzEzNDI4QlwiLFxyXG4gICAgICAgICAgICAgICAgZmlsbENvbG9yOiBcIiMxMzQyOEJcIixcclxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IDEuMCxcclxuICAgICAgICAgICAgICAgIGZpbGxPcGFjaXR5OiAwLjMsXHJcbiAgICAgICAgICAgICAgICB3ZWlnaHQ6IDRcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB2YXIgc3RhdGlvbl9sYXQgPSBwLnN0YXRpb25fbGF0O1xyXG4gICAgICAgICAgICB2YXIgc3RhdGlvbl9sb24gPSBwLnN0YXRpb25fbG9uO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBNYXAuY29udG91ckpTT04gPSBMLmdlb0pzb24oZGF0YSwge1xyXG4gICAgICAgICAgICAgICAgc3R5bGU6IGNvbnRvdXJfc3R5bGVcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBNYXAubWFwLmZpdEJvdW5kcyhNYXAuY29udG91ckpTT04uZ2V0Qm91bmRzKCkpO1xyXG4gICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJNZXRhID0gJyc7ICAgICAgICAgIFxyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHsgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkbCBjbGFzcz1cImRsLWNvbnRvdXIgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkNhbGwgU2lnbjo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuY2FsbHNpZ24gKyAnPC9kZD4nOyAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+RmFjaWxpdHkgSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmZhY2lsaXR5X2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+RmlsZSBOdW1iZXI6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmZpbGVudW1iZXIgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uICsgJzwvZGQ+JzsgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sYXQsIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbl0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLmZlYXR1cmVMYXllcilcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29udG91ck1ldGEpO1xyXG4gICAgICAgICAgICB9ICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbk1hcCA9IHJlcXVpcmUoJy4vZWxldmF0aW9uTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5lbGV2YXRpb25BUEknLCAnW2RhdGEtYXBpPVwiZWxldmF0aW9uXCJdJywgRWxldmF0aW9uTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVsZXZhdGlvbi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9lbGV2YXRpb24ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjZWxldmF0aW9uLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1lbGV2YXRpb24nKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIEVsZXZhdGlvbkZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbGV2YXRpb25Gb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSB7XHJcbiAgICAgICAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWFwID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRvdXJKU09OID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRpb25NYXJrZXIgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZhdGlvbkFQSSA9ICcuL2VsZXZhdGlvbi5qc29uPyc7XHJcbiAgICAgICAgICAgIHZhciBhcGlVUkwgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGVsZXZhdGlvbkFQSSArPSAkKCcuZmllbGRzLWVsZXZhdGlvbicpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogZWxldmF0aW9uQVBJLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBFbGV2YXRpb25NYXAuY3JlYXRlTWFya2VyKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSUZvcm0uc2hvd0Vycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBBUElGb3JtLnNob3dFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZNZXRhID0gJyc7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGF0ID0gZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1sxXTtcclxuICAgICAgICAgICAgdmFyIGxvbiA9IGRhdGEuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF07XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGwgY2xhc3M9XCJkbC1lbGV2YXRpb24gZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+RWxldmF0aW9uOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLmVsZXZhdGlvbiArICcgJyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgbG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5kYXRhU291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIE1hcC5jb250b3VySlNPTiA9IEwuZ2VvSnNvbihkYXRhKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGVsZXZNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFtsYXQsIGxvbl0sIDcpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbGV2YXRpb25NYXA7XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgSEFBVE1hcCA9IHJlcXVpcmUoJy4vaGFhdE1hcC5qcycpO1xyXG5cclxuICAgIHZhciBIQUFURm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmhhYXRBUEknLCAnW2RhdGEtYXBpPVwiaGFhdFwiXScsIEhBQVRNYXAuZ2V0RGF0YSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktaGFhdC5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9oYWF0Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEhBQVRGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNoYWF0LXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1oYWF0JykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBIQUFURm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRGb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5jb250b3VySlNPTiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5zdGF0aW9uTWFya2VyID0gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0QVBJID0gJy4vaGFhdC5qc29uPyc7XHJcbiAgICAgICAgICAgIHZhciBhcGlVUkwgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGhhYXRBUEkgKz0gJCgnLmZpZWxkcy1oYWF0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBoYWF0QVBJLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLnN0YXR1cyA9PT0gJ2Vycm9yJykgeyAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgSEFBVE1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBBUElGb3JtLnNob3dFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZNZXRhID0gJyc7XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGwgY2xhc3M9XCJkbC1oYWF0IGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkF2ZXJhZ2UgSEFBVDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuaGFhdF9hdmVyYWdlICsgJyAnICsgZGF0YS51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEubGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmVsZXZhdGlvbl9kYXRhX3NvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtkYXRhLmxhdCwgZGF0YS5sb25dKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGVsZXZNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFtkYXRhLmxhdCwgZGF0YS5sb25dLCA3KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVE1hcDtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgdmFyIE1hcCA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY29udG91ckpTT04gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGlvbk1hcmtlciA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jcmVhdGUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICBMLm1hcGJveC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaVkyOXRjSFYwWldOb0lpd2lZU0k2SW5NeWJsTXlhM2NpZlEuUDh5cHBlc0hraTVxTXl4VGMyQ05MZyc7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwID0gTC5tYXBib3gubWFwKCdtYXAnLCAnZmNjLms3NGVkNWdlJywge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0aW9uQ29udHJvbDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBtYXhab29tOiAxOVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVN0cmVldCA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGVkNWdlJykuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlU2F0ZWxsaXRlID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0ZDduMGcnKTtcclxuICAgICAgICAgICAgdmFyIGJhc2VUZXJyYWluID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0Y20zb2wnKTtcclxuXHJcbiAgICAgICAgICAgIEwuY29udHJvbC5zY2FsZSh7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbXJpZ2h0J1xyXG4gICAgICAgICAgICB9KS5hZGRUbyhNYXAubWFwKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBnZW9jb2RlciA9IEwubWFwYm94Lmdlb2NvZGVyKCdtYXBib3gucGxhY2VzLXYxJyk7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGF5ZXJDb250cm9sID0gbmV3IEwuQ29udHJvbC5MYXllcnMoe1xyXG4gICAgICAgICAgICAgICAgJ1N0cmVldCc6IGJhc2VTdHJlZXQuYWRkVG8oTWFwLm1hcCksXHJcbiAgICAgICAgICAgICAgICAnU2F0ZWxsaXRlJzogYmFzZVNhdGVsbGl0ZSxcclxuICAgICAgICAgICAgICAgICdUZXJyYWluJzogYmFzZVRlcnJhaW5cclxuICAgICAgICAgICAgfSwge30sIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wbGVmdCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGxhdCwgbG9uKSB7XHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2xhdCwgbG9uXSkuYWRkVG8oTWFwLm1hcCk7ICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY2xlYXJMYXllcnM6IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICBpZiAoTWFwLm1hcC5oYXNMYXllcihNYXAuY29udG91ckpTT04pKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5jb250b3VySlNPTik7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTsgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5mZWF0dXJlTGF5ZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc2V0VmlldzogZnVuY3Rpb24oKSB7IFxyXG4gICAgICAgICAgICBNYXAubWFwLnNldFZpZXcoWzQxLjA1LCAtOTVdLCA0KTsgICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgICBtb2R1bGUuZXhwb3J0cyA9ICBNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSByZXF1aXJlKCcuL3Byb2ZpbGVNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5wcm9maWxlQVBJJywgJ1tkYXRhLWFwaT1cInByb2ZpbGVcIl0nLCBQcm9maWxlTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLXByb2ZpbGUuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvcHJvZmlsZS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBQcm9maWxlRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjcHJvZmlsZS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tcHJvZmlsZScpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgUHJvZmlsZUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm9maWxlRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY29udG91ckpTT04gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGlvbk1hcmtlciA9IHVuZGVmaW5lZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgcHJvZmlsZUFQSSA9ICcuL3Byb2ZpbGUuanNvbj8nO1xyXG4gICAgICAgICAgICB2YXIgYXBpVVJMID0gW107XHJcblxyXG4gICAgICAgICAgICBwcm9maWxlQVBJICs9ICQoJy5maWVsZHMtcHJvZmlsZScpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogcHJvZmlsZUFQSSxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5zdGF0dXMgPT09ICdlcnJvcicpIHsgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFByb2ZpbGVNYXAuY3JlYXRlTWFya2VyKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogQVBJRm9ybS5zaG93RXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY3JlYXRlTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBlbGV2TWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtcHJvZmlsZSBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5BdmVyYWdlIEVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuYXZlcmFnZV9lbGV2YXRpb24gKyAnICcgKyBkYXRhLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEubGF0LCBkYXRhLmxvbl0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoZWxldk1ldGEpXHJcbiAgICAgICAgICAgICAgICAub3BlblBvcHVwKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLnNldFZpZXcoW2RhdGEubGF0LCBkYXRhLmxvbl0sIDcpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm9maWxlTWFwO1xyXG59KCkpO1xyXG4iXX0=
