(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./modules/apiForm.js');
    var Map = require('./modules/map.js');
    var ContourForm = require('./modules/contourForm.js');
    var ContourMap = require('./modules/contourMap.js');
    var ElevationForm = require('./modules/elevationForm.js');
    var ElevationMap = require('./modules/elevationMap.js');
    var HAATForm = require('./modules/haatForm.js');
    var HAATMap = require('./modules/haatMap.js');
    var ProfileForm = require('./modules/profileForm.js');
    var ProfileMap = require('./modules/profileMap.js');

    APIForm.bindEvents();
    Map.init();
    ElevationForm.getParams();    
    ContourForm.getParams();    
    HAATForm.getParams();        
    ProfileForm.getParams();
}());

},{"./modules/apiForm.js":2,"./modules/contourForm.js":3,"./modules/contourMap.js":4,"./modules/elevationForm.js":5,"./modules/elevationMap.js":6,"./modules/haatForm.js":7,"./modules/haatMap.js":8,"./modules/map.js":9,"./modules/profileForm.js":10,"./modules/profileMap.js":11}],2:[function(require,module,exports){
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

},{"./apiForm.js":2,"./map.js":9}]},{},[1]);
