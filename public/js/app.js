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
            var lat = data.features[0].properties.lat;
            var lon = data.features[0].properties.lon;

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
                color: '#13428B',
                fillColor: '#13428B',
                opacity: 1.0,
                fillOpacity: 0.3,
                weight: 4
            };

            Map.clearLayers();

            Map.contourJSON = L.geoJson(data, {
                style: contour_style
            }).addTo(Map.map);

            Map.map.fitBounds(Map.contourJSON.getBounds());

            if ($('#apiType') === 'contoursOPIF') {
                ContourMap.createOPIFMarker(data);
            } else {
                ContourMap.createMarker(data);
            }


        },
        createMarker: function(data) {
            var dataFeat = data.features[0].properties;
            var contourMeta = '';

            Map.featureLayer = L.mapbox.featureLayer().addTo(Map.map);
            Map.featureLayer.clearLayers();

            contourMeta = '';
            contourMeta += '<dl class="dl-contour dl-horizontal">';
            contourMeta += '<dt>Latitude:</dt>';
            contourMeta += '<dd>' + dataFeat.antenna_lat + '</dd>';

            contourMeta += '<dt>Longitude:</dt>';
            contourMeta += '<dd>' + dataFeat.antenna_lon + '</dd>';

            contourMeta += '<dt>Num. of Radials:</dt>';
            contourMeta += '<dd>' + dataFeat.nradial + '</dd>';

            contourMeta += '<dt>RCAMSL:</dt>';
            contourMeta += '<dd>' + dataFeat.rcamsl + ' meters</dd>';

            contourMeta += '<dt>Field Strength:</dt>';
            contourMeta += '<dd>' + dataFeat.field + '</dd>';

            contourMeta += '<dt>FM Channel:</dt>';
            contourMeta += '<dd>' + dataFeat.channel + '</dd>';

            contourMeta += '<dt>ERP:</dt>';
            contourMeta += '<dd>' + dataFeat.erp + '</dd>';

            contourMeta += '<dt>Curve:</dt>';
            contourMeta += '<dd>' + dataFeat.curve + '</dd>';

            contourMeta += '<dt>Source:</dt>';
            contourMeta += '<dd>' + dataFeat.elevation_data_source + '</dd>';
            contourMeta += '</dl>';

            Map.stationMarker = L.marker([dataFeat.antenna_lat, dataFeat.antenna_lon], Map.markerIcon)
                .addTo(Map.featureLayer)
                .bindPopup(contourMeta);

        },
        createOPIFMarker: function(data) {
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
                var apiType = $('#apiType').val();

                if (apiType !== 'contoursOPIF' ) {
                    Map.createTempMarker(event);
                }
            });
        },
        createTempMarker: function(event) {

            var lat = event.latlng.lat.toFixed(10);
            var lon = event.latlng.lng.toFixed(10);
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
            haatMeta += '<dd>' + dataProfile.average_elevation + ' ' + dataProfile.unit + '</dd>';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tb2R1bGVzL21hcC5qcycpO1xyXG4gICAgdmFyIENvbnRvdXJFbnRlcnByaXNlRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ck9QSUZGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NvbnRvdXJzT1BJRkZvcm0uanMnKTtcclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMnKTtcclxuICAgIHZhciBIQUFURm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oYWF0Rm9ybS5qcycpO1xyXG4gICAgdmFyIFByb2ZpbGVGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL3Byb2ZpbGVGb3JtLmpzJyk7XHJcbiAgICBcclxuICAgIEFQSUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgTWFwLmluaXQoKTtcclxuICAgIEVsZXZhdGlvbkZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgQ29udG91ckVudGVycHJpc2VGb3JtLmdldFBhcmFtcygpO1xyXG4gICAgQ29udG91ck9QSUZGb3JtLmdldFBhcmFtcygpOyBcclxuICAgIEhBQVRGb3JtLmdldFBhcmFtcygpOyAgICAgICAgXHJcbiAgICBQcm9maWxlRm9ybS5nZXRQYXJhbXMoKTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0gcmVxdWlyZSgnLi9hcGlSZXNwb25zZS5qcycpO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAkKCcjYXBpVHlwZScpLm9uKCdjaGFuZ2UnLCBBUElGb3JtLnN3aXRjaEZvcm0pO1xyXG5cclxuICAgICAgICAgICAgJCh3aW5kb3cpLmtleWRvd24oZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoe1xyXG4gICAgICAgICAgICAgICAgYmFja2Ryb3A6ICdzdGF0aWMnLFxyXG4gICAgICAgICAgICAgICAga2V5Ym9hcmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvdzogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzd2l0Y2hGb3JtOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkQVBJID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5maWVsZHMnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICQoJy5maWVsZHMtJyArIHNlbGVjdGVkQVBJKS5zbGlkZURvd24oKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNidG4tZ2V0QVBJJykuYXR0cignZGF0YS1hcGknLCBzZWxlY3RlZEFQSSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKVswXS5yZXNldCgpO1xyXG5cclxuICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiaWRWYWx1ZVwiXScpLnRleHQoJ0ZhY2lsaXR5IElEJyk7XHJcblxyXG4gICAgICAgICAgICAkKCcjYXBpVHlwZScpLnZhbChzZWxlY3RlZEFQSSk7ICAgICAgICAgICBcclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICBNYXAucmVzZXRWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaG93RXJyb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKCdoaWRlJyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UuY2xlYXIoKTsgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oYXBpVVJMLCBhcGlTdWNjZXNzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWpheFN1Y2Nlc3MgPSBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSU1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLnVybCA9IGFwaVVSTDtcclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVSTCxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogYXBpU3VjY2VzcyA/IGFwaVN1Y2Nlc3MgOiBhamF4U3VjY2VzcyxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBBUElGb3JtLnNob3dFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIG1ldGEgPSBBUElNYXAuZ2V0VG9vbHRpcE1ldGEoZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBsYXQgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMubGF0O1xyXG4gICAgICAgICAgICB2YXIgbG9uID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLmxvbjtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsb25dLCBNYXAubWFya2VySWNvbik7XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlci5hZGRUbyhNYXAubWFwKVxyXG4gICAgICAgICAgICAgICAgLmJpbmRQb3B1cChtZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmZpZWxkczp2aXNpYmxlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWU9XCJsYXRcIl0nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudmFsKGxhdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpbnB1dFtuYW1lPVwibG9uXCJdJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnZhbChsb24pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLnNldFZpZXcoW2xhdCwgbG9uXSwgNyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSU1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSB7XHJcblxyXG4gICAgICAgIGRpc3BsYXk6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgLy8gZGlzcGxheSBKU09OIG5leHQgdG8gbWFwXHJcblxyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKCdoaWRlJyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX291dCBjb2RlJykudGV4dChKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSk7XHJcbiAgICAgICAgICAgICQoJ3ByZSBjb2RlJykuZWFjaChmdW5jdGlvbihpLCBibG9jaykge1xyXG4gICAgICAgICAgICAgICAgaGxqcy5oaWdobGlnaHRCbG9jayhibG9jayk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19kd25sZCcpXHJcbiAgICAgICAgICAgICAgICAuYXR0cignaHJlZicsIEFQSVJlc3BvbnNlLnVybClcclxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZScpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19vdXQgY29kZScpLnRleHQoJycpO1xyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX2R3bmxkJykuYWRkQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJUmVzcG9uc2U7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0gcmVxdWlyZSgnLi9hcGlSZXNwb25zZS5qcycpO1xyXG5cclxuICAgIHZhciBDb250b3VyTWFwID0ge1xyXG4gICAgICAgIGdldENvbnRvdXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgY29udG91ckFQSSA9ICcnO1xyXG4gICAgICAgICAgICB2YXIgYXBpVVJMID0gW107XHJcbiAgICAgICAgICAgIHZhciBhcGlUeXBlID0gJCgnI2FwaVR5cGUnKS52YWwoKTtcclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlID0gJCgnI3NlcnZpY2VUeXBlJykudmFsKCk7XHJcbiAgICAgICAgICAgIHZhciBhbVBhcmFtcyA9ICcnO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFwaVR5cGUgPT09ICdjb250b3Vyc09QSUYnKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcuZmllbGRzLScgKyBhcGlUeXBlKS5maW5kKCc6aW5wdXQnKS5ub3QoJ2J1dHRvbicpLmVhY2goZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcGlVUkwucHVzaCh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgPSBhcGlVUkwuc2xpY2UoMCwgMykuam9pbignLycpICsgJy5qc29uJztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgPSAnLi9jb250b3Vycy5qc29uPyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJICs9ICQoJy5maWVsZHMtY29udG91cnNFbnRlcnByaXNlJykuZmluZCgnaW5wdXQsIHNlbGVjdCcpLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHNlcnZpY2VUeXBlID09PSAnYW0nKSB7XHJcbiAgICAgICAgICAgICAgICBhbVBhcmFtcyA9ICc/JyArICQoJyNmb3JtLXBhcmFtcycpLnNlcmlhbGl6ZSgpLnNwbGl0KCcmJykuc2xpY2UoMywgNSkuam9pbignJicpO1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSArPSBhbVBhcmFtcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UudXJsID0gY29udG91ckFQSTtcclxuXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGNvbnRvdXJBUEksXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbnRvdXJNYXAuY3JlYXRlQ29udG91cihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogQVBJRm9ybS5zaG93RXJyb3JcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVDb250b3VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyX3N0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgY29sb3I6ICcjMTM0MjhCJyxcclxuICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogJyMxMzQyOEInLFxyXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMS4wLFxyXG4gICAgICAgICAgICAgICAgZmlsbE9wYWNpdHk6IDAuMyxcclxuICAgICAgICAgICAgICAgIHdlaWdodDogNFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuY29udG91ckpTT04gPSBMLmdlb0pzb24oZGF0YSwge1xyXG4gICAgICAgICAgICAgICAgc3R5bGU6IGNvbnRvdXJfc3R5bGVcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLmZpdEJvdW5kcyhNYXAuY29udG91ckpTT04uZ2V0Qm91bmRzKCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCQoJyNhcGlUeXBlJykgPT09ICdjb250b3Vyc09QSUYnKSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU9QSUZNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGFGZWF0ID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB2YXIgY29udG91ck1ldGEgPSAnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIgPSBMLm1hcGJveC5mZWF0dXJlTGF5ZXIoKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllci5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgPSAnJztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkbCBjbGFzcz1cImRsLWNvbnRvdXIgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5hbnRlbm5hX2xhdCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmFudGVubmFfbG9uICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TnVtLiBvZiBSYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQubnJhZGlhbCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LnJjYW1zbCArICcgbWV0ZXJzPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GaWVsZCBTdHJlbmd0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmZpZWxkICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Rk0gQ2hhbm5lbDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmNoYW5uZWwgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5FUlA6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5lcnAgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5DdXJ2ZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmN1cnZlICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+U291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGFGZWF0LmFudGVubmFfbGF0LCBkYXRhRmVhdC5hbnRlbm5hX2xvbl0sIE1hcC5tYXJrZXJJY29uKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGNvbnRvdXJNZXRhKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVPUElGTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhID0gJyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2FsbCBTaWduOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYWxsc2lnbiArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlNlcnZpY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZhY2lsaXR5IElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5mYWNpbGl0eV9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZpbGUgTnVtYmVyOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5maWxlbnVtYmVyICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+QXBwbGljYXRpb24gSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFwcGxpY2F0aW9uX2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xhdCwgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uXSwgTWFwLm1hcmtlckljb24pXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmJpbmRQb3B1cChjb250b3VyTWV0YSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgQ29udG91ckZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBpZFR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgZmFjaWxpdHlpZDogJ0ZhY2lsaXR5IElEJyxcclxuICAgICAgICAgICAgICAgIGNhbGxzaWduOiAnQ2FsbCBTaWduJyxcclxuICAgICAgICAgICAgICAgIGZpbGVudW1iZXI6ICdGaWxlIE51bWJlcicsXHJcbiAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbmlkOiAnQXBwbGljYXRpb24gSUQnLFxyXG4gICAgICAgICAgICAgICAgYW50ZW5uYWlkOiAnQW50ZW5uYSBJRCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICB0djogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgZm06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGFtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnYW50ZW5uYWlkJ11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgb3B0aW9uYWwgZmllbGRzIGJhc2VkIG9uIFNlcnZpY2UgVHlwZVxyXG4gICAgICAgICAgICAkKCcjc2VydmljZVR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnI2lkVHlwZScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnZhbCgnZmFjaWxpdHlpZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ29wdGlvbicpLmhpZGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKHNlcnZpY2VUeXBlc1t0aGlzLnZhbHVlXSkuZWFjaChmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdvcHRpb25bdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJykuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsdWUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlVXAoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgc2VsZWN0ZWQgSUQgVHlwZSBsYWJlbCB0ZXh0XHJcbiAgICAgICAgICAgICQoJyNpZFR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjaWRWYWx1ZScpLnZhbCgnJyk7XHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dChpZFR5cGVzW3RoaXMudmFsdWVdKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suY29udG91cnNFbnRlcnByaXNlQVBJJywgJ1tkYXRhLWFwaT1cImNvbnRvdXJzRW50ZXJwcmlzZVwiXScsIENvbnRvdXJNYXAuZ2V0Q29udG91cik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY29udG91cnNFbnRlcnByaXNlLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL2NvbnRvdXJzLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIENvbnRvdXJGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc0VudGVycHJpc2UnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIENvbnRvdXJGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQ29udG91ckZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgQ29udG91ckZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBpZFR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgZmFjaWxpdHlpZDogJ0ZhY2lsaXR5IElEJyxcclxuICAgICAgICAgICAgICAgIGNhbGxzaWduOiAnQ2FsbCBTaWduJyxcclxuICAgICAgICAgICAgICAgIGZpbGVudW1iZXI6ICdGaWxlIE51bWJlcicsXHJcbiAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbmlkOiAnQXBwbGljYXRpb24gSUQnLFxyXG4gICAgICAgICAgICAgICAgYW50ZW5uYWlkOiAnQW50ZW5uYSBJRCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICB0djogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgZm06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGFtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnYW50ZW5uYWlkJ11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgb3B0aW9uYWwgZmllbGRzIGJhc2VkIG9uIFNlcnZpY2UgVHlwZVxyXG4gICAgICAgICAgICAkKCcjc2VydmljZVR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnI2lkVHlwZScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnZhbCgnZmFjaWxpdHlpZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ29wdGlvbicpLmhpZGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKHNlcnZpY2VUeXBlc1t0aGlzLnZhbHVlXSkuZWFjaChmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdvcHRpb25bdmFsdWU9XCInICsgdmFsdWUgKyAnXCJdJykuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsdWUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlVXAoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgc2VsZWN0ZWQgSUQgVHlwZSBsYWJlbCB0ZXh0XHJcbiAgICAgICAgICAgICQoJyNpZFR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjaWRWYWx1ZScpLnZhbCgnJyk7XHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dChpZFR5cGVzW3RoaXMudmFsdWVdKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suY29udG91cnNPUElGQVBJJywgJ1tkYXRhLWFwaT1cImNvbnRvdXJzT1BJRlwiXScsIENvbnRvdXJNYXAuZ2V0Q29udG91cik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHsgXHJcbiAgICAgICAgICAgIC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWNvbnRvdXJzT1BJRi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy97c2VydmljZVR5cGV9L3tpZFR5cGV9L3tpZFZhbHVlfS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBDb250b3VyRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkgeyBcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cnNPUElGJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBDb250b3VyRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSByZXF1aXJlKCcuL2VsZXZhdGlvbk1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suZWxldmF0aW9uQVBJJywgJ1tkYXRhLWFwaT1cImVsZXZhdGlvblwiXScsIEVsZXZhdGlvbk1hcC5nZXREYXRhKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHQvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1lbGV2YXRpb24uanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvZWxldmF0aW9uLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEVsZXZhdGlvbkZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWVsZXZhdGlvbicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZXZhdGlvbkZvcm07XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgRWxldmF0aW9uTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZhdGlvbkFQSSA9ICcuL2VsZXZhdGlvbi5qc29uPyc7XHJcblxyXG4gICAgICAgICAgICBlbGV2YXRpb25BUEkgKz0gJCgnLmZpZWxkcy1lbGV2YXRpb24nKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBFbGV2YXRpb25NYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShlbGV2YXRpb25BUEkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VG9vbHRpcE1ldGE6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZNZXRhID0gJzxkbCBjbGFzcz1cImRsLWVsZXZhdGlvbiBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5FbGV2YXRpb246PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuZWxldmF0aW9uICsgJyAnICsgZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1sxXSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1swXSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuZGF0YVNvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZWxldk1ldGE7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZXZhdGlvbk1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgSEFBVE1hcCA9IHJlcXVpcmUoJy4vaGFhdE1hcC5qcycpO1xyXG5cclxuICAgIHZhciBIQUFURm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmhhYXRBUEknLCAnW2RhdGEtYXBpPVwiaGFhdFwiXScsIEhBQVRNYXAuZ2V0RGF0YSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWhhYXQuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvaGFhdC57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBIQUFURm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0taGFhdCcpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgSEFBVEZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH0gICAgICAgIFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIQUFURm9ybTtcclxuICAgIFxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHJlcXVpcmUoJy4vYXBpTWFwLmpzJyk7XHJcbiAgICBcclxuICAgIHZhciBIQUFUTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRBUEkgPSAnLi9oYWF0Lmpzb24/JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGhhYXRBUEkgKz0gJCgnLmZpZWxkcy1oYWF0JykuZmluZCgnaW5wdXQsIHNlbGVjdCcpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldFRvb2x0aXBNZXRhID0gSEFBVE1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGhhYXRBUEkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VG9vbHRpcE1ldGE6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRNZXRhID0gJzxkbCBjbGFzcz1cImRsLWhhYXQgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIHZhciBkYXRhSEFBVCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllczsgXHJcblxyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkF2ZXJhZ2UgSEFBVDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmhhYXRfYXZlcmFnZSArICcgJyArIGRhdGFIQUFULnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5sb24gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PiMgb2YgcmFkaWFsczo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULm5yYWRpYWwgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULnJjYW1zbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGhhYXRNZXRhO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVE1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY29udG91ckpTT04gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGlvbk1hcmtlciA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jcmVhdGUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICBMLm1hcGJveC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaVkyOXRjSFYwWldOb0lpd2lZU0k2SW5NeWJsTXlhM2NpZlEuUDh5cHBlc0hraTVxTXl4VGMyQ05MZyc7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwID0gTC5tYXBib3gubWFwKCdtYXAnLCAnZmNjLms3NGVkNWdlJywge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0aW9uQ29udHJvbDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBtYXhab29tOiAxOVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVN0cmVldCA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGVkNWdlJykuYWRkVG8oTWFwLm1hcCk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlU2F0ZWxsaXRlID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0ZDduMGcnKTtcclxuICAgICAgICAgICAgdmFyIGJhc2VUZXJyYWluID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0Y20zb2wnKTtcclxuXHJcbiAgICAgICAgICAgIEwuY29udHJvbC5zY2FsZSh7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbXJpZ2h0J1xyXG4gICAgICAgICAgICB9KS5hZGRUbyhNYXAubWFwKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBnZW9jb2RlciA9IEwubWFwYm94Lmdlb2NvZGVyKCdtYXBib3gucGxhY2VzLXYxJyk7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGF5ZXJDb250cm9sID0gbmV3IEwuQ29udHJvbC5MYXllcnMoe1xyXG4gICAgICAgICAgICAgICAgJ1N0cmVldCc6IGJhc2VTdHJlZXQuYWRkVG8oTWFwLm1hcCksXHJcbiAgICAgICAgICAgICAgICAnU2F0ZWxsaXRlJzogYmFzZVNhdGVsbGl0ZSxcclxuICAgICAgICAgICAgICAgICdUZXJyYWluJzogYmFzZVRlcnJhaW5cclxuICAgICAgICAgICAgfSwge30sIHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wbGVmdCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFya2VySWNvbiA9IHtcclxuICAgICAgICAgICAgICAgIGljb246IG5ldyBMLkljb24oe1xyXG4gICAgICAgICAgICAgICAgICAgIGljb25Vcmw6ICcuLi9pbWFnZXMvbWFya2VyLWljb24tMngtYmx1ZS5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd1VybDogJy4uL2ltYWdlcy9tYXJrZXItc2hhZG93LnBuZycsXHJcbiAgICAgICAgICAgICAgICAgICAgaWNvblNpemU6IFsyNSwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvcHVwQW5jaG9yOiBbMSwgLTM0XSxcclxuICAgICAgICAgICAgICAgICAgICBzaGFkb3dTaXplOiBbNDEsIDQxXVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcGlUeXBlID0gJCgnI2FwaVR5cGUnKS52YWwoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXBpVHlwZSAhPT0gJ2NvbnRvdXJzT1BJRicgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTWFwLmNyZWF0ZVRlbXBNYXJrZXIoZXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBNYXJrZXI6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGF0ID0gZXZlbnQubGF0bG5nLmxhdC50b0ZpeGVkKDEwKTtcclxuICAgICAgICAgICAgdmFyIGxvbiA9IGV2ZW50LmxhdGxuZy5sbmcudG9GaXhlZCgxMCk7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSAkKCcuZmllbGRzOnZpc2libGUnKTtcclxuICAgICAgICAgICAgdmFyIGxhdEZpZWxkID0gZmllbGRzLmZpbmQoJ2lucHV0W25hbWU9XCJsYXRcIl0nKTtcclxuICAgICAgICAgICAgdmFyIGxvbkZpZWxkID0gZmllbGRzLmZpbmQoJ2lucHV0W25hbWU9XCJsb25cIl0nKTtcclxuICAgICAgICAgICAgdmFyIGNvb3JkTWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1jb29yZHMgZGwtaG9yaXpvbnRhbFwiPic7XHJcblxyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGRkPicgKyBsYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkZD4nICsgbG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8L2RsPjxidXR0b24gaWQ9XCJyZW1vdmVNYXJrZXJcIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdCBidG4teHNcIj5SZW1vdmU8L2J1dHRvbj4nO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlQ29vcmRzKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAudGVtcE1hcmtlcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGF0RmllbGQudmFsKCcnKVxyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKCcnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc2hvd0Nvb3JkcygpIHtcclxuICAgICAgICAgICAgICAgIGxhdEZpZWxkLnZhbChsYXQpO1xyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKGxvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlbW92ZUNvb3JkcygpO1xyXG4gICAgICAgICAgICBzaG93Q29vcmRzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAudGVtcE1hcmtlciA9IG5ldyBMLm1hcmtlcihldmVudC5sYXRsbmcsIHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uOiBuZXcgTC5JY29uKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvblVybDogJy4uL2ltYWdlcy9tYXJrZXItaWNvbi0yeC1ncmVlbi5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dVcmw6ICcuLi9pbWFnZXMvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29vcmRNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgc2hvd0Nvb3Jkcyk7XHJcblxyXG4gICAgICAgICAgICAkKCcubGVhZmxldC1wb3B1cC1jb250ZW50Jykub24oJ2NsaWNrJywgJyNyZW1vdmVNYXJrZXInLCByZW1vdmVDb29yZHMpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyTGF5ZXJzOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5jb250b3VySlNPTikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5tYXAucmVtb3ZlTGF5ZXIoTWFwLmNvbnRvdXJKU09OKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC50ZW1wTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmZlYXR1cmVMYXllcikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzZXRWaWV3OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHJlcXVpcmUoJy4vcHJvZmlsZU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLnByb2ZpbGVBUEknLCAnW2RhdGEtYXBpPVwicHJvZmlsZVwiXScsIFByb2ZpbGVNYXAuZ2V0RGF0YSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktcHJvZmlsZS5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9wcm9maWxlLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIFByb2ZpbGVGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1wcm9maWxlJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBQcm9maWxlRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVGb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHJlcXVpcmUoJy4vYXBpTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcHJvZmlsZUFQSSA9ICcuL3Byb2ZpbGUuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcHJvZmlsZUFQSSArPSAkKCcuZmllbGRzLXByb2ZpbGUnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBQcm9maWxlTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEocHJvZmlsZUFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtcHJvZmlsZSBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGRhdGFQcm9maWxlID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF2ZXJhZ2VfZWxldmF0aW9uICsgJyAnICsgZGF0YVByb2ZpbGUudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXppbXV0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF6aW11dGggKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkRhdGEgU291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIl19
