(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
    'use strict';

    var APIForm = require('./modules/apiForm.js');
    var Map = require('./modules/map.js');
    var ContourEnterpriseForm = require('./modules/contoursEnterpriseForm.js');
    var ContourOPIFForm = require('./modules/contoursOPIFForm.js');
    var ElevationForm = require('./modules/elevationForm.js');
    var HAATForm = require('./modules/haatForm.js');
    var ProfileForm = require('./modules/profileForm.js');
    
    APIForm.bindEvents();
    Map.init();
    ElevationForm.getParams();    
    ContourEnterpriseForm.getParams();
    ContourOPIFForm.getParams(); 
    HAATForm.getParams();        
    ProfileForm.getParams();
}());

},{"./modules/apiForm.js":2,"./modules/contoursEnterpriseForm.js":6,"./modules/contoursOPIFForm.js":7,"./modules/elevationForm.js":8,"./modules/haatForm.js":10,"./modules/map.js":12,"./modules/profileForm.js":13}],2:[function(require,module,exports){
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
        }
    };

    module.exports = APIForm;

}());

},{"./apiResponse.js":4,"./map.js":12}],3:[function(require,module,exports){
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
            var meta = APIMap.getTooltipMeta(data);
            var lat = data.lat ? data.lat : data.features[0].geometry.coordinates[1];
            var lon = data.lon ? data.lon : data.features[0].geometry.coordinates[0];

            Map.clearLayers();

            Map.stationMarker = L.marker([lat, lon], Map.markerIcon);

            Map.stationMarker.addTo(Map.map)
                .bindPopup(meta)
                .openPopup()
                .on('click', function() {
                    $('.fields:visible')
                        .find('input[name="lat"]')
                        .val(lat)
                        .end()
                        .find('input[name="lon"]')
                        .val(lon);
                });

            Map.map.setView([lat, lon], 7);
        }
    };

    module.exports = APIMap;

}());

},{"./apiForm.js":2,"./apiResponse.js":4,"./map.js":12}],4:[function(require,module,exports){
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

    var APIForm = require('./apiForm.js');
    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var ContourMap = {
        getContour: function() {
            var contourAPI = '';
            var apiURL = [];
            var apiType = $('#apiType').val();
            var serviceType = $('#serviceType').val();
            var amParams = '';

            if (apiType === 'contoursOPIF') {
                $('.fields-' + apiType).find(':input').not('button').each(function(element, value) {
                    apiURL.push(this.value);
                });

                contourAPI = apiURL.slice(0, 3).join('/') + '.json';
            } else {
                contourAPI = './contours.json?';
                contourAPI += $('.fields-contoursEnterprise').find('input, select').serialize();
            }


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
                contourMeta += '<dt>Application ID:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.application_id + '</dd>';
                contourMeta += '<dt>Latitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.station_lat + '</dd>';
                contourMeta += '<dt>Longitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.station_lon + '</dd>';
                contourMeta += '</dl>';

                Map.stationMarker = L.marker([data.features[i].properties.station_lat, data.features[i].properties.station_lon], Map.markerIcon)
                    .addTo(Map.featureLayer)
                    .bindPopup(contourMeta);
            }
        }
    };

    module.exports = ContourMap;

}());

},{"./apiForm.js":2,"./apiResponse.js":4,"./map.js":12}],6:[function(require,module,exports){
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

            $('#form-params').on('click.contoursEnterpriseAPI', '[data-api="contoursEnterprise"]', ContourMap.getContour);
            
        },
        getParams: function() {
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-contoursEnterprise.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/contours.{format}'].get.parameters;

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
            $('#frm-contoursEnterprise').append(fieldsetHTML);
            
            ContourForm.bindEvents();
        }
    };

    module.exports = ContourForm;

}());

},{"./contourMap.js":5}],7:[function(require,module,exports){
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

            $('#form-params').on('click.contoursOPIFAPI', '[data-api="contoursOPIF"]', ContourMap.getContour);
            
        },
        getParams: function() { 
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-contoursOPIF.json',
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
    
            $('#frm-contoursOPIF').append(fieldsetHTML);
            
            ContourForm.bindEvents();
        }
    };

    module.exports = ContourForm;

}());

},{"./contourMap.js":5}],8:[function(require,module,exports){
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

},{"./elevationMap.js":9}],9:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');

    var ElevationMap = {

        getData: function() {
            var elevationAPI = './elevation.json?';

            elevationAPI += $('.fields-elevation').find('input, select').serialize();

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

},{"./apiMap.js":3}],10:[function(require,module,exports){
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

},{"./haatMap.js":11}],11:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');
    
    var HAATMap = {

        getData: function() {
            var haatAPI = './haat.json?';
            
            haatAPI += $('.fields-haat').find('input, select').serialize();

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

},{"./apiMap.js":3}],12:[function(require,module,exports){
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

            Map.markerIcon = {
                icon: new L.Icon({
                    iconUrl: '../images/marker-icon-2x-blue.png',
                    shadowUrl: '../images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            };

            Map.map.on('click', function(event) {
                if ($('#apiType').val() !== 'contour') {
                    Map.createTempMarker(event);
                }
            });
        },
        createTempMarker: function(event) {

            var lat = event.latlng.lat;
            var lon = event.latlng.lng;
            var fields = $('.fields:visible');
            var latField = fields.find('input[name="lat"]');
            var lonField = fields.find('input[name="lon"]');
            var coordMeta = '<dl class="dl-coords dl-horizontal">';

            coordMeta += '<dt>Latitude:</dt>';
            coordMeta += '<dd>' + lat + '</dd>';
            coordMeta += '<dt>Longitude:</dt>';
            coordMeta += '<dd>' + lon + '</dd>';
            coordMeta += '</dl><button id="removeMarker" class="btn btn-default btn-xs">Remove</button>';

            function removeCoords() {
                if (Map.map.hasLayer(Map.tempMarker)) {
                    Map.map.removeLayer(Map.tempMarker);
                }

                latField.val('')
                lonField.val('');
            }

            function showCoords() {
                latField.val(lat);
                lonField.val(lon);
            }

            removeCoords();
            showCoords();

            Map.tempMarker = new L.marker(event.latlng, {
                    icon: new L.Icon({
                        iconUrl: '../images/marker-icon-2x-green.png',
                        shadowUrl: '../images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                })
                .addTo(Map.map)
                .bindPopup(coordMeta)
                .openPopup()
                .on('click', showCoords);

            $('.leaflet-popup-content').on('click', '#removeMarker', removeCoords);

        },
        clearLayers: function() {

            if (Map.map.hasLayer(Map.contourJSON)) {
                Map.map.removeLayer(Map.contourJSON);
            }

            if (Map.map.hasLayer(Map.stationMarker)) {
                Map.map.removeLayer(Map.stationMarker);
            }

            if (Map.map.hasLayer(Map.tempMarker)) {
                Map.map.removeLayer(Map.tempMarker);
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

},{}],13:[function(require,module,exports){
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

},{"./profileMap.js":14}],14:[function(require,module,exports){
(function() {
    'use strict';

    var APIMap = require('./apiMap.js');

    var ProfileMap = {

        getData: function() {
            var profileAPI = './profile.json?';
            
            profileAPI += $('.fields-profile').find('input, select').serialize();

            APIMap.getTooltipMeta = ProfileMap.getTooltipMeta;

            APIMap.getData(profileAPI);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21vZHVsZXMvbWFwLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ckVudGVycHJpc2VGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NvbnRvdXJzRW50ZXJwcmlzZUZvcm0uanMnKTtcclxuICAgIHZhciBDb250b3VyT1BJRkZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcycpO1xyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvZWxldmF0aW9uRm9ybS5qcycpO1xyXG4gICAgdmFyIEhBQVRGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2hhYXRGb3JtLmpzJyk7XHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvcHJvZmlsZUZvcm0uanMnKTtcclxuICAgIFxyXG4gICAgQVBJRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICBNYXAuaW5pdCgpO1xyXG4gICAgRWxldmF0aW9uRm9ybS5nZXRQYXJhbXMoKTsgICAgXHJcbiAgICBDb250b3VyRW50ZXJwcmlzZUZvcm0uZ2V0UGFyYW1zKCk7XHJcbiAgICBDb250b3VyT1BJRkZvcm0uZ2V0UGFyYW1zKCk7IFxyXG4gICAgSEFBVEZvcm0uZ2V0UGFyYW1zKCk7ICAgICAgICBcclxuICAgIFByb2ZpbGVGb3JtLmdldFBhcmFtcygpO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykub24oJ2NoYW5nZScsIEFQSUZvcm0uc3dpdGNoRm9ybSk7XHJcblxyXG4gICAgICAgICAgICAkKHdpbmRvdykua2V5ZG93bihmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAkKCcjYnRuLWdldEFQSScpLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnI21vZGFsLWxvYWRpbmcnKS5tb2RhbCh7XHJcbiAgICAgICAgICAgICAgICBiYWNrZHJvcDogJ3N0YXRpYycsXHJcbiAgICAgICAgICAgICAgICBrZXlib2FyZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93OiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN3aXRjaEZvcm06IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRBUEkgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmZpZWxkcycpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmZpZWxkcy0nICsgc2VsZWN0ZWRBUEkpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScsIHNlbGVjdGVkQVBJKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpWzBdLnJlc2V0KCk7XHJcblxyXG4gICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykudmFsKHNlbGVjdGVkQVBJKTsgICAgICAgICAgIFxyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UuY2xlYXIoKTtcclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIE1hcC5yZXNldFZpZXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNob3dFcnJvcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoJ2hpZGUnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmFsZXJ0Jykuc2xpZGVEb3duKCk7XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS5jbGVhcigpOyAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQVBJTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbihhcGlVUkwsIGFwaVN1Y2Nlc3MpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBhamF4U3VjY2VzcyA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UudXJsID0gYXBpVVJMO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogYXBpVVJMLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBhcGlTdWNjZXNzID8gYXBpU3VjY2VzcyA6IGFqYXhTdWNjZXNzLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IEFQSUZvcm0uc2hvd0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgbWV0YSA9IEFQSU1hcC5nZXRUb29sdGlwTWV0YShkYXRhKTtcclxuICAgICAgICAgICAgdmFyIGxhdCA9IGRhdGEubGF0ID8gZGF0YS5sYXQgOiBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdO1xyXG4gICAgICAgICAgICB2YXIgbG9uID0gZGF0YS5sb24gPyBkYXRhLmxvbiA6IGRhdGEuZmVhdHVyZXNbMF0uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF07XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2xhdCwgbG9uXSwgTWFwLm1hcmtlckljb24pO1xyXG5cclxuICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAobWV0YSlcclxuICAgICAgICAgICAgICAgIC5vcGVuUG9wdXAoKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5maWVsZHM6dmlzaWJsZScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpbnB1dFtuYW1lPVwibGF0XCJdJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnZhbChsYXQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5lbmQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaW5wdXRbbmFtZT1cImxvblwiXScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC52YWwobG9uKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFtsYXQsIGxvbl0sIDcpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0ge1xyXG5cclxuICAgICAgICBkaXNwbGF5OiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgSlNPTiBuZXh0IHRvIG1hcFxyXG5cclxuICAgICAgICAgICAgJCgnI21vZGFsLWxvYWRpbmcnKS5tb2RhbCgnaGlkZScpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19vdXQgY29kZScpLnRleHQoSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikpO1xyXG4gICAgICAgICAgICAkKCdwcmUgY29kZScpLmVhY2goZnVuY3Rpb24oaSwgYmxvY2spIHtcclxuICAgICAgICAgICAgICAgIGhsanMuaGlnaGxpZ2h0QmxvY2soYmxvY2spO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fZHdubGQnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2hyZWYnLCBBUElSZXNwb25zZS51cmwpXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKS50ZXh0KCcnKTtcclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19kd25sZCcpLmFkZENsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSVJlc3BvbnNlO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHtcclxuICAgICAgICBnZXRDb250b3VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJBUEkgPSAnJztcclxuICAgICAgICAgICAgdmFyIGFwaVVSTCA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgYXBpVHlwZSA9ICQoJyNhcGlUeXBlJykudmFsKCk7XHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlVHlwZSA9ICQoJyNzZXJ2aWNlVHlwZScpLnZhbCgpO1xyXG4gICAgICAgICAgICB2YXIgYW1QYXJhbXMgPSAnJztcclxuXHJcbiAgICAgICAgICAgIGlmIChhcGlUeXBlID09PSAnY29udG91cnNPUElGJykge1xyXG4gICAgICAgICAgICAgICAgJCgnLmZpZWxkcy0nICsgYXBpVHlwZSkuZmluZCgnOmlucHV0Jykubm90KCdidXR0b24nKS5lYWNoKGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXBpVVJMLnB1c2godGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJID0gYXBpVVJMLnNsaWNlKDAsIDMpLmpvaW4oJy8nKSArICcuanNvbic7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJID0gJy4vY29udG91cnMuanNvbj8nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSArPSAkKCcuZmllbGRzLWNvbnRvdXJzRW50ZXJwcmlzZScpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChzZXJ2aWNlVHlwZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgYW1QYXJhbXMgPSAnPycgKyAkKCcjZm9ybS1wYXJhbXMnKS5zZXJpYWxpemUoKS5zcGxpdCgnJicpLnNsaWNlKDMsIDUpLmpvaW4oJyYnKTtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gYW1QYXJhbXM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLnVybCA9IGNvbnRvdXJBUEk7XHJcblxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBjb250b3VyQVBJLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZUNvbnRvdXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSVJlc3BvbnNlLmRpc3BsYXkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IEFQSUZvcm0uc2hvd0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlQ29udG91cjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgY29udG91cl9zdHlsZSA9IHtcclxuICAgICAgICAgICAgICAgIGNvbG9yOiBcIiMxMzQyOEJcIixcclxuICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogXCIjMTM0MjhCXCIsXHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLjAsXHJcbiAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eTogMC4zLFxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0OiA0XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgcCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcztcclxuICAgICAgICAgICAgdmFyIHN0YXRpb25fbGF0ID0gcC5zdGF0aW9uX2xhdDtcclxuICAgICAgICAgICAgdmFyIHN0YXRpb25fbG9uID0gcC5zdGF0aW9uX2xvbjtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNvbnRvdXJKU09OID0gTC5nZW9Kc29uKGRhdGEsIHtcclxuICAgICAgICAgICAgICAgIHN0eWxlOiBjb250b3VyX3N0eWxlXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5maXRCb3VuZHMoTWFwLmNvbnRvdXJKU09OLmdldEJvdW5kcygpKTtcclxuICAgICAgICAgICAgQ29udG91ck1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhID0gJyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2FsbCBTaWduOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYWxsc2lnbiArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlNlcnZpY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZhY2lsaXR5IElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5mYWNpbGl0eV9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZpbGUgTnVtYmVyOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5maWxlbnVtYmVyICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+QXBwbGljYXRpb24gSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFwcGxpY2F0aW9uX2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xhdCwgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uXSwgTWFwLm1hcmtlckljb24pXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmJpbmRQb3B1cChjb250b3VyTWV0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQ29udG91ck1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHJlcXVpcmUoJy4vY29udG91ck1hcC5qcycpOyAgIFxyXG5cclxuICAgIHZhciBDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGlkVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICBmYWNpbGl0eWlkOiAnRmFjaWxpdHkgSUQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbHNpZ246ICdDYWxsIFNpZ24nLFxyXG4gICAgICAgICAgICAgICAgZmlsZW51bWJlcjogJ0ZpbGUgTnVtYmVyJyxcclxuICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uaWQ6ICdBcHBsaWNhdGlvbiBJRCcsXHJcbiAgICAgICAgICAgICAgICBhbnRlbm5haWQ6ICdBbnRlbm5hIElEJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlcyA9IHtcclxuICAgICAgICAgICAgICAgIHR2OiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnZmlsZW51bWJlcicsICdhcHBsaWNhdGlvbmlkJ10sXHJcbiAgICAgICAgICAgICAgICBmbTogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgYW06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdhbnRlbm5haWQnXVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgICQoJyNzZXJ2aWNlVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjaWRUeXBlJylcclxuICAgICAgICAgICAgICAgICAgICAudmFsKCdmYWNpbGl0eWlkJylcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnb3B0aW9uJykuaGlkZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2lkVmFsdWUnKS52YWwoJycpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoc2VydmljZVR5cGVzW3RoaXMudmFsdWVdKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ29wdGlvblt2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCBJRCBUeXBlIGxhYmVsIHRleHRcclxuICAgICAgICAgICAgJCgnI2lkVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KGlkVHlwZXNbdGhpcy52YWx1ZV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3Vyc0VudGVycHJpc2VBUEknLCAnW2RhdGEtYXBpPVwiY29udG91cnNFbnRlcnByaXNlXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1jb250b3Vyc0VudGVycHJpc2UuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvY29udG91cnMue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgQ29udG91ckZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXJzRW50ZXJwcmlzZScpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgQ29udG91ckZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb250b3VyRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHJlcXVpcmUoJy4vY29udG91ck1hcC5qcycpOyAgIFxyXG5cclxuICAgIHZhciBDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGlkVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICBmYWNpbGl0eWlkOiAnRmFjaWxpdHkgSUQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbHNpZ246ICdDYWxsIFNpZ24nLFxyXG4gICAgICAgICAgICAgICAgZmlsZW51bWJlcjogJ0ZpbGUgTnVtYmVyJyxcclxuICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uaWQ6ICdBcHBsaWNhdGlvbiBJRCcsXHJcbiAgICAgICAgICAgICAgICBhbnRlbm5haWQ6ICdBbnRlbm5hIElEJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlcyA9IHtcclxuICAgICAgICAgICAgICAgIHR2OiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnZmlsZW51bWJlcicsICdhcHBsaWNhdGlvbmlkJ10sXHJcbiAgICAgICAgICAgICAgICBmbTogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgYW06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdhbnRlbm5haWQnXVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgICQoJyNzZXJ2aWNlVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjaWRUeXBlJylcclxuICAgICAgICAgICAgICAgICAgICAudmFsKCdmYWNpbGl0eWlkJylcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnb3B0aW9uJykuaGlkZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2lkVmFsdWUnKS52YWwoJycpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoc2VydmljZVR5cGVzW3RoaXMudmFsdWVdKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ29wdGlvblt2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YWx1ZSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCBJRCBUeXBlIGxhYmVsIHRleHRcclxuICAgICAgICAgICAgJCgnI2lkVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KGlkVHlwZXNbdGhpcy52YWx1ZV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3Vyc09QSUZBUEknLCAnW2RhdGEtYXBpPVwiY29udG91cnNPUElGXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkgeyBcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY29udG91cnNPUElGLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL3tzZXJ2aWNlVHlwZX0ve2lkVHlwZX0ve2lkVmFsdWV9Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIENvbnRvdXJGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7IFxyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICBcclxuICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc09QSUYnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIENvbnRvdXJGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQ29udG91ckZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbk1hcCA9IHJlcXVpcmUoJy4vZWxldmF0aW9uTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5lbGV2YXRpb25BUEknLCAnW2RhdGEtYXBpPVwiZWxldmF0aW9uXCJdJywgRWxldmF0aW9uTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVsZXZhdGlvbi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9lbGV2YXRpb24ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tZWxldmF0aW9uJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBFbGV2YXRpb25Gb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9ICAgICAgICBcclxuICAgIH07XHJcbiAgICBcclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZWxldmF0aW9uQVBJID0gJy4vZWxldmF0aW9uLmpzb24/JztcclxuXHJcbiAgICAgICAgICAgIGVsZXZhdGlvbkFQSSArPSAkKCcuZmllbGRzLWVsZXZhdGlvbicpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEVsZXZhdGlvbk1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGVsZXZhdGlvbkFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZWxldk1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtZWxldmF0aW9uIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5lbGV2YXRpb24gKyAnICcgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5kYXRhU291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBlbGV2TWV0YTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0gcmVxdWlyZSgnLi9oYWF0TWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEhBQVRGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suaGFhdEFQSScsICdbZGF0YS1hcGk9XCJoYWF0XCJdJywgSEFBVE1hcC5nZXREYXRhKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktaGFhdC5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9oYWF0Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEhBQVRGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1oYWF0JykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBIQUFURm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRGb3JtO1xyXG4gICAgXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuICAgIFxyXG4gICAgdmFyIEhBQVRNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdEFQSSA9ICcuL2hhYXQuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdEFQSSArPSAkKCcuZmllbGRzLWhhYXQnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBIQUFUTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEoaGFhdEFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtaGFhdCBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGRhdGFIQUFUID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzOyBcclxuXHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXZlcmFnZSBIQUFUOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQuaGFhdF9hdmVyYWdlICsgJyAnICsgZGF0YUhBQVQudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+IyBvZiByYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubnJhZGlhbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+UkNBTVNMOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQucmNhbXNsICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmVsZXZhdGlvbl9kYXRhX3NvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaGFhdE1ldGE7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIQUFUTWFwO1xyXG4gICAgXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgTWFwID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5jb250b3VySlNPTiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5zdGF0aW9uTWFya2VyID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNyZWF0ZSgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIEwubWFwYm94LmFjY2Vzc1Rva2VuID0gJ3BrLmV5SjFJam9pWTI5dGNIVjBaV05vSWl3aVlTSTZJbk15YmxNeWEzY2lmUS5QOHlwcGVzSGtpNXFNeXhUYzJDTkxnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAgPSBMLm1hcGJveC5tYXAoJ21hcCcsICdmY2Muazc0ZWQ1Z2UnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRpb25Db250cm9sOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1heFpvb206IDE5XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnNldFZpZXcoWzQxLjA1LCAtOTVdLCA0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlU3RyZWV0ID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0ZWQ1Z2UnKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgdmFyIGJhc2VTYXRlbGxpdGUgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRkN24wZycpO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVRlcnJhaW4gPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRjbTNvbCcpO1xyXG5cclxuICAgICAgICAgICAgTC5jb250cm9sLnNjYWxlKHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tcmlnaHQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgdmFyIGdlb2NvZGVyID0gTC5tYXBib3guZ2VvY29kZXIoJ21hcGJveC5wbGFjZXMtdjEnKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBsYXllckNvbnRyb2wgPSBuZXcgTC5Db250cm9sLkxheWVycyh7XHJcbiAgICAgICAgICAgICAgICAnU3RyZWV0JzogYmFzZVN0cmVldC5hZGRUbyhNYXAubWFwKSxcclxuICAgICAgICAgICAgICAgICdTYXRlbGxpdGUnOiBiYXNlU2F0ZWxsaXRlLFxyXG4gICAgICAgICAgICAgICAgJ1RlcnJhaW4nOiBiYXNlVGVycmFpblxyXG4gICAgICAgICAgICB9LCB7fSwge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3BsZWZ0J1xyXG4gICAgICAgICAgICB9KS5hZGRUbyhNYXAubWFwKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXJrZXJJY29uID0ge1xyXG4gICAgICAgICAgICAgICAgaWNvbjogbmV3IEwuSWNvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgaWNvblVybDogJy4uL2ltYWdlcy9tYXJrZXItaWNvbi0yeC1ibHVlLnBuZycsXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZG93VXJsOiAnLi4vaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgaWNvbkFuY2hvcjogWzEyLCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXBBbmNob3I6IFsxLCAtMzRdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCQoJyNhcGlUeXBlJykudmFsKCkgIT09ICdjb250b3VyJykge1xyXG4gICAgICAgICAgICAgICAgICAgIE1hcC5jcmVhdGVUZW1wTWFya2VyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wTWFya2VyOiBmdW5jdGlvbihldmVudCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIGxhdCA9IGV2ZW50LmxhdGxuZy5sYXQ7XHJcbiAgICAgICAgICAgIHZhciBsb24gPSBldmVudC5sYXRsbmcubG5nO1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0gJCgnLmZpZWxkczp2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgIHZhciBsYXRGaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibGF0XCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBsb25GaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibG9uXCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBjb29yZE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtY29vcmRzIGRsLWhvcml6b250YWxcIj4nO1xyXG5cclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkZD4nICsgbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8ZGQ+JyArIGxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPC9kbD48YnV0dG9uIGlkPVwicmVtb3ZlTWFya2VyXCIgY2xhc3M9XCJidG4gYnRuLWRlZmF1bHQgYnRuLXhzXCI+UmVtb3ZlPC9idXR0b24+JztcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlbW92ZUNvb3JkcygpIHtcclxuICAgICAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC50ZW1wTWFya2VyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIE1hcC5tYXAucmVtb3ZlTGF5ZXIoTWFwLnRlbXBNYXJrZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxhdEZpZWxkLnZhbCgnJylcclxuICAgICAgICAgICAgICAgIGxvbkZpZWxkLnZhbCgnJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNob3dDb29yZHMoKSB7XHJcbiAgICAgICAgICAgICAgICBsYXRGaWVsZC52YWwobGF0KTtcclxuICAgICAgICAgICAgICAgIGxvbkZpZWxkLnZhbChsb24pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZW1vdmVDb29yZHMoKTtcclxuICAgICAgICAgICAgc2hvd0Nvb3JkcygpO1xyXG5cclxuICAgICAgICAgICAgTWFwLnRlbXBNYXJrZXIgPSBuZXcgTC5tYXJrZXIoZXZlbnQubGF0bG5nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogbmV3IEwuSWNvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25Vcmw6ICcuLi9pbWFnZXMvbWFya2VyLWljb24tMngtZ3JlZW4ucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhZG93VXJsOiAnLi4vaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvblNpemU6IFsyNSwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uQW5jaG9yOiBbMTIsIDQxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXBBbmNob3I6IFsxLCAtMzRdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dTaXplOiBbNDEsIDQxXVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGNvb3JkTWV0YSlcclxuICAgICAgICAgICAgICAgIC5vcGVuUG9wdXAoKVxyXG4gICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIHNob3dDb29yZHMpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmxlYWZsZXQtcG9wdXAtY29udGVudCcpLm9uKCdjbGljaycsICcjcmVtb3ZlTWFya2VyJywgcmVtb3ZlQ29vcmRzKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjbGVhckxheWVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoTWFwLm1hcC5oYXNMYXllcihNYXAuY29udG91ckpTT04pKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5jb250b3VySlNPTik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5zdGF0aW9uTWFya2VyKSkge1xyXG4gICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAuc3RhdGlvbk1hcmtlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC50ZW1wTWFya2VyKSkge1xyXG4gICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAudGVtcE1hcmtlcik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5mZWF0dXJlTGF5ZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc2V0VmlldzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIE1hcC5tYXAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSByZXF1aXJlKCcuL3Byb2ZpbGVNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5wcm9maWxlQVBJJywgJ1tkYXRhLWFwaT1cInByb2ZpbGVcIl0nLCBQcm9maWxlTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLXByb2ZpbGUuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvcHJvZmlsZS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBQcm9maWxlRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tcHJvZmlsZScpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgUHJvZmlsZUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm9maWxlRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHByb2ZpbGVBUEkgPSAnLi9wcm9maWxlLmpzb24/JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHByb2ZpbGVBUEkgKz0gJCgnLmZpZWxkcy1wcm9maWxlJykuZmluZCgnaW5wdXQsIHNlbGVjdCcpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldFRvb2x0aXBNZXRhID0gUHJvZmlsZU1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKHByb2ZpbGVBUEkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VG9vbHRpcE1ldGE6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRNZXRhID0gJzxkbCBjbGFzcz1cImRsLXByb2ZpbGUgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIHZhciBkYXRhUHJvZmlsZSA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXZlcmFnZSBFbGV2YXRpb246PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5hdmVyYWdlX2VsZXZhdGlvblswXSArICcgJyArIGRhdGFQcm9maWxlLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUubGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5sb24gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkF6aW11dGg6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5hemltdXRoICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmVsZXZhdGlvbl9kYXRhX3NvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaGFhdE1ldGE7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQcm9maWxlTWFwO1xyXG4gICAgXHJcbn0oKSk7XHJcbiJdfQ==
