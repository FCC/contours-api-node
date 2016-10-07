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

            $('.js-am-only').slideUp();
            $('#form-params')[0].reset();

            $('label[for="idValue"]').text('Facility ID');
            $('label[for="channel"]').attr('required', true);

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

            if ($('#apiType').val() === 'contoursOPIF') {
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

    var EntrpContourForm = {
        bindEvents: function() {
            var entrpForm = $('#frm-contoursEnterprise');
            var serviceSel = entrpForm.find('select').eq(0);
            
            serviceSel.addClass('js-entrp');
            $('label[for="channel"]').attr('required', true);

            // display optional fields based on Service Type
            $('#frm-contoursEnterprise').on('change', '.js-entrp', function() {
                var serviceVal = this.value;

                $('#frm-contoursEnterprise').find('input').val('');
                $('#curve').val(0);
                $('#src').val('ned');
                $('#unit').val('m');
                
                if (serviceVal === 'fm') {
                    $('label[for="channel"]').attr('required', false);
                
                } else {
                    $('label[for="channel"]').attr('required', true);
                }
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

                    EntrpContourForm.createTemplate(paramsData);
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
            
            EntrpContourForm.bindEvents();
        }
    };

    module.exports = EntrpContourForm;

}());

},{"./contourMap.js":5}],7:[function(require,module,exports){
(function() {
    'use strict';

    var ContourMap = require('./contourMap.js');   

    var OPIFContourForm = {
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

            var opifForm = $('#frm-contoursOPIF');
            var serviceSel = opifForm.find('select').eq(0);
            
            serviceSel.addClass('js-opif');
            
            // display optional fields based on Service Type
            $(opifForm).on('change', '.js-opif', function() {
                var serviceVal = this.value;

                $('#idType')
                    .val('facilityid')
                    .find('option').hide();

                $('label[for="idValue"]').text('Facility ID');
                $('#idValue').val('');

                $(serviceTypes[serviceVal]).each(function(index, value) {
                    $('option[value="' + value + '"]').show();
                });

                if (serviceVal === 'am') {
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

                    OPIFContourForm.createTemplate(paramsData);
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
            
            OPIFContourForm.bindEvents();
        }
    };

    module.exports = OPIFContourForm;

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
            var imageURL = window.location.pathname.search('api/contours') === 1 ? 'images' : '/images';

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
                        iconUrl: imageURL + '/marker-icon-2x-green.png',
                        shadowUrl: imageURL + '/marker-shadow.png',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tb2R1bGVzL21hcC5qcycpO1xyXG4gICAgdmFyIENvbnRvdXJFbnRlcnByaXNlRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ck9QSUZGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NvbnRvdXJzT1BJRkZvcm0uanMnKTtcclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMnKTtcclxuICAgIHZhciBIQUFURm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9oYWF0Rm9ybS5qcycpO1xyXG4gICAgdmFyIFByb2ZpbGVGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL3Byb2ZpbGVGb3JtLmpzJyk7XHJcbiAgICBcclxuICAgIEFQSUZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgTWFwLmluaXQoKTtcclxuICAgIEVsZXZhdGlvbkZvcm0uZ2V0UGFyYW1zKCk7ICAgIFxyXG4gICAgQ29udG91ckVudGVycHJpc2VGb3JtLmdldFBhcmFtcygpO1xyXG4gICAgQ29udG91ck9QSUZGb3JtLmdldFBhcmFtcygpOyBcclxuICAgIEhBQVRGb3JtLmdldFBhcmFtcygpOyAgICAgICAgXHJcbiAgICBQcm9maWxlRm9ybS5nZXRQYXJhbXMoKTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0gcmVxdWlyZSgnLi9hcGlSZXNwb25zZS5qcycpO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkgeyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAkKCcjYXBpVHlwZScpLm9uKCdjaGFuZ2UnLCBBUElGb3JtLnN3aXRjaEZvcm0pO1xyXG5cclxuICAgICAgICAgICAgJCh3aW5kb3cpLmtleWRvd24oZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5jbGljaygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoe1xyXG4gICAgICAgICAgICAgICAgYmFja2Ryb3A6ICdzdGF0aWMnLFxyXG4gICAgICAgICAgICAgICAga2V5Ym9hcmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgc2hvdzogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzd2l0Y2hGb3JtOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkQVBJID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5maWVsZHMnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICQoJy5maWVsZHMtJyArIHNlbGVjdGVkQVBJKS5zbGlkZURvd24oKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNidG4tZ2V0QVBJJykuYXR0cignZGF0YS1hcGknLCBzZWxlY3RlZEFQSSk7XHJcblxyXG4gICAgICAgICAgICAkKCcuanMtYW0tb25seScpLnNsaWRlVXAoKTtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJylbMF0ucmVzZXQoKTtcclxuXHJcbiAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG4gICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJjaGFubmVsXCJdJykuYXR0cigncmVxdWlyZWQnLCB0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykudmFsKHNlbGVjdGVkQVBJKTsgICAgICAgICAgIFxyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UuY2xlYXIoKTtcclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgICAgIE1hcC5yZXNldFZpZXcoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNob3dFcnJvcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoJ2hpZGUnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmFsZXJ0Jykuc2xpZGVEb3duKCk7XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS5jbGVhcigpOyAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQVBJTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbihhcGlVUkwsIGFwaVN1Y2Nlc3MpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBhamF4U3VjY2VzcyA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UudXJsID0gYXBpVVJMO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogYXBpVVJMLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBhcGlTdWNjZXNzID8gYXBpU3VjY2VzcyA6IGFqYXhTdWNjZXNzLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IEFQSUZvcm0uc2hvd0Vycm9yXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgbWV0YSA9IEFQSU1hcC5nZXRUb29sdGlwTWV0YShkYXRhKTtcclxuICAgICAgICAgICAgdmFyIGxhdCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5sYXQ7XHJcbiAgICAgICAgICAgIHZhciBsb24gPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMubG9uO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtsYXQsIGxvbl0sIE1hcC5tYXJrZXJJY29uKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKG1ldGEpXHJcbiAgICAgICAgICAgICAgICAub3BlblBvcHVwKClcclxuICAgICAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuZmllbGRzOnZpc2libGUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaW5wdXRbbmFtZT1cImxhdFwiXScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC52YWwobGF0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWU9XCJsb25cIl0nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudmFsKGxvbik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAuc2V0VmlldyhbbGF0LCBsb25dLCA3KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElSZXNwb25zZSA9IHtcclxuXHJcbiAgICAgICAgZGlzcGxheTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IEpTT04gbmV4dCB0byBtYXBcclxuXHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoJ2hpZGUnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKS50ZXh0KEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpKTtcclxuICAgICAgICAgICAgJCgncHJlIGNvZGUnKS5lYWNoKGZ1bmN0aW9uKGksIGJsb2NrKSB7XHJcbiAgICAgICAgICAgICAgICBobGpzLmhpZ2hsaWdodEJsb2NrKGJsb2NrKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX2R3bmxkJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdocmVmJywgQVBJUmVzcG9uc2UudXJsKVxyXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX291dCBjb2RlJykudGV4dCgnJyk7XHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fZHdubGQnKS5hZGRDbGFzcygnaGlkZScpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElSZXNwb25zZTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSB7XHJcbiAgICAgICAgZ2V0Q29udG91cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyQVBJID0gJyc7XHJcbiAgICAgICAgICAgIHZhciBhcGlVUkwgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGFwaVR5cGUgPSAkKCcjYXBpVHlwZScpLnZhbCgpO1xyXG4gICAgICAgICAgICB2YXIgc2VydmljZVR5cGUgPSAkKCcjc2VydmljZVR5cGUnKS52YWwoKTtcclxuICAgICAgICAgICAgdmFyIGFtUGFyYW1zID0gJyc7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXBpVHlwZSA9PT0gJ2NvbnRvdXJzT1BJRicpIHtcclxuICAgICAgICAgICAgICAgICQoJy5maWVsZHMtJyArIGFwaVR5cGUpLmZpbmQoJzppbnB1dCcpLm5vdCgnYnV0dG9uJykuZWFjaChmdW5jdGlvbihlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFwaVVSTC5wdXNoKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSA9IGFwaVVSTC5zbGljZSgwLCAzKS5qb2luKCcvJykgKyAnLmpzb24nO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSA9ICcuL2NvbnRvdXJzLmpzb24/JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gJCgnLmZpZWxkcy1jb250b3Vyc0VudGVycHJpc2UnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoc2VydmljZVR5cGUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgIGFtUGFyYW1zID0gJz8nICsgJCgnI2Zvcm0tcGFyYW1zJykuc2VyaWFsaXplKCkuc3BsaXQoJyYnKS5zbGljZSgzLCA1KS5qb2luKCcmJyk7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJICs9IGFtUGFyYW1zO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS51cmwgPSBjb250b3VyQVBJO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogY29udG91ckFQSSxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQ29udG91ck1hcC5jcmVhdGVDb250b3VyKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSUZvcm0uc2hvd0Vycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBBUElGb3JtLnNob3dFcnJvclxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZUNvbnRvdXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJfc3R5bGUgPSB7XHJcbiAgICAgICAgICAgICAgICBjb2xvcjogJyMxMzQyOEInLFxyXG4gICAgICAgICAgICAgICAgZmlsbENvbG9yOiAnIzEzNDI4QicsXHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLjAsXHJcbiAgICAgICAgICAgICAgICBmaWxsT3BhY2l0eTogMC4zLFxyXG4gICAgICAgICAgICAgICAgd2VpZ2h0OiA0XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jb250b3VySlNPTiA9IEwuZ2VvSnNvbihkYXRhLCB7XHJcbiAgICAgICAgICAgICAgICBzdHlsZTogY29udG91cl9zdHlsZVxyXG4gICAgICAgICAgICB9KS5hZGRUbyhNYXAubWFwKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAuZml0Qm91bmRzKE1hcC5jb250b3VySlNPTi5nZXRCb3VuZHMoKSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoJCgnI2FwaVR5cGUnKS52YWwoKSA9PT0gJ2NvbnRvdXJzT1BJRicpIHtcclxuICAgICAgICAgICAgICAgIENvbnRvdXJNYXAuY3JlYXRlT1BJRk1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIENvbnRvdXJNYXAuY3JlYXRlTWFya2VyKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YUZlYXQgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSA9ICcnO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmFudGVubmFfbGF0ICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuYW50ZW5uYV9sb24gKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5OdW0uIG9mIFJhZGlhbHM6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5ucmFkaWFsICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+UkNBTVNMOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQucmNhbXNsICsgJyBtZXRlcnM8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZpZWxkIFN0cmVuZ3RoOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuZmllbGQgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GTSBDaGFubmVsOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuY2hhbm5lbCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkVSUDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmVycCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkN1cnZlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuY3VydmUgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5Tb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIgPSBMLm1hcmtlcihbZGF0YUZlYXQuYW50ZW5uYV9sYXQsIGRhdGFGZWF0LmFudGVubmFfbG9uXSwgTWFwLm1hcmtlckljb24pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLmZlYXR1cmVMYXllcilcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29udG91ck1ldGEpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZU9QSUZNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHsgXHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhID0gJyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2FsbCBTaWduOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYWxsc2lnbiArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlNlcnZpY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZhY2lsaXR5IElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5mYWNpbGl0eV9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZpbGUgTnVtYmVyOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5maWxlbnVtYmVyICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+QXBwbGljYXRpb24gSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFwcGxpY2F0aW9uX2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xhdCwgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLnN0YXRpb25fbG9uXSwgTWFwLm1hcmtlckljb24pXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmJpbmRQb3B1cChjb250b3VyTWV0YSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgRW50cnBDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVudHJwRm9ybSA9ICQoJyNmcm0tY29udG91cnNFbnRlcnByaXNlJyk7XHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlU2VsID0gZW50cnBGb3JtLmZpbmQoJ3NlbGVjdCcpLmVxKDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgc2VydmljZVNlbC5hZGRDbGFzcygnanMtZW50cnAnKTtcclxuICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiY2hhbm5lbFwiXScpLmF0dHIoJ3JlcXVpcmVkJywgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IG9wdGlvbmFsIGZpZWxkcyBiYXNlZCBvbiBTZXJ2aWNlIFR5cGVcclxuICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc0VudGVycHJpc2UnKS5vbignY2hhbmdlJywgJy5qcy1lbnRycCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNlcnZpY2VWYWwgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgICQoJyNmcm0tY29udG91cnNFbnRlcnByaXNlJykuZmluZCgnaW5wdXQnKS52YWwoJycpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2N1cnZlJykudmFsKDApO1xyXG4gICAgICAgICAgICAgICAgJCgnI3NyYycpLnZhbCgnbmVkJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjdW5pdCcpLnZhbCgnbScpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoc2VydmljZVZhbCA9PT0gJ2ZtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImNoYW5uZWxcIl0nKS5hdHRyKCdyZXF1aXJlZCcsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJjaGFubmVsXCJdJykuYXR0cigncmVxdWlyZWQnLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suY29udG91cnNFbnRlcnByaXNlQVBJJywgJ1tkYXRhLWFwaT1cImNvbnRvdXJzRW50ZXJwcmlzZVwiXScsIENvbnRvdXJNYXAuZ2V0Q29udG91cik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY29udG91cnNFbnRlcnByaXNlLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL2NvbnRvdXJzLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEVudHJwQ29udG91ckZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXJzRW50ZXJwcmlzZScpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgRW50cnBDb250b3VyRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVudHJwQ29udG91ckZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgT1BJRkNvbnRvdXJGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaWRUeXBlcyA9IHtcclxuICAgICAgICAgICAgICAgIGZhY2lsaXR5aWQ6ICdGYWNpbGl0eSBJRCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsc2lnbjogJ0NhbGwgU2lnbicsXHJcbiAgICAgICAgICAgICAgICBmaWxlbnVtYmVyOiAnRmlsZSBOdW1iZXInLFxyXG4gICAgICAgICAgICAgICAgYXBwbGljYXRpb25pZDogJ0FwcGxpY2F0aW9uIElEJyxcclxuICAgICAgICAgICAgICAgIGFudGVubmFpZDogJ0FudGVubmEgSUQnXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgc2VydmljZVR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgdHY6IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGZtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnZmlsZW51bWJlcicsICdhcHBsaWNhdGlvbmlkJ10sXHJcbiAgICAgICAgICAgICAgICBhbTogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2FudGVubmFpZCddXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgb3BpZkZvcm0gPSAkKCcjZnJtLWNvbnRvdXJzT1BJRicpO1xyXG4gICAgICAgICAgICB2YXIgc2VydmljZVNlbCA9IG9waWZGb3JtLmZpbmQoJ3NlbGVjdCcpLmVxKDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgc2VydmljZVNlbC5hZGRDbGFzcygnanMtb3BpZicpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgICQob3BpZkZvcm0pLm9uKCdjaGFuZ2UnLCAnLmpzLW9waWYnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlVmFsID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjaWRUeXBlJylcclxuICAgICAgICAgICAgICAgICAgICAudmFsKCdmYWNpbGl0eWlkJylcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnb3B0aW9uJykuaGlkZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KCdGYWNpbGl0eSBJRCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI2lkVmFsdWUnKS52YWwoJycpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoc2VydmljZVR5cGVzW3NlcnZpY2VWYWxdKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ29wdGlvblt2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2VydmljZVZhbCA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCBJRCBUeXBlIGxhYmVsIHRleHRcclxuICAgICAgICAgICAgJCgnI2lkVHlwZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJyNpZFZhbHVlJykudmFsKCcnKTtcclxuICAgICAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImlkVmFsdWVcIl0nKS50ZXh0KGlkVHlwZXNbdGhpcy52YWx1ZV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3Vyc09QSUZBUEknLCAnW2RhdGEtYXBpPVwiY29udG91cnNPUElGXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkgeyBcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY29udG91cnNPUElGLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL3tzZXJ2aWNlVHlwZX0ve2lkVHlwZX0ve2lkVmFsdWV9Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE9QSUZDb250b3VyRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkgeyBcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgXHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cnNPUElGJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBPUElGQ29udG91ckZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBPUElGQ29udG91ckZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbk1hcCA9IHJlcXVpcmUoJy4vZWxldmF0aW9uTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5lbGV2YXRpb25BUEknLCAnW2RhdGEtYXBpPVwiZWxldmF0aW9uXCJdJywgRWxldmF0aW9uTWFwLmdldERhdGEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVsZXZhdGlvbi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9lbGV2YXRpb24ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tZWxldmF0aW9uJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBFbGV2YXRpb25Gb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9ICAgICAgICBcclxuICAgIH07XHJcbiAgICBcclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZWxldmF0aW9uQVBJID0gJy4vZWxldmF0aW9uLmpzb24/JztcclxuXHJcbiAgICAgICAgICAgIGVsZXZhdGlvbkFQSSArPSAkKCcuZmllbGRzLWVsZXZhdGlvbicpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEVsZXZhdGlvbk1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGVsZXZhdGlvbkFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZWxldk1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtZWxldmF0aW9uIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5lbGV2YXRpb24gKyAnICcgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5kYXRhU291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBlbGV2TWV0YTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0gcmVxdWlyZSgnLi9oYWF0TWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEhBQVRGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suaGFhdEFQSScsICdbZGF0YS1hcGk9XCJoYWF0XCJdJywgSEFBVE1hcC5nZXREYXRhKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktaGFhdC5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9oYWF0Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEhBQVRGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1oYWF0JykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBIQUFURm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRGb3JtO1xyXG4gICAgXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuICAgIFxyXG4gICAgdmFyIEhBQVRNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdEFQSSA9ICcuL2hhYXQuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdEFQSSArPSAkKCcuZmllbGRzLWhhYXQnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBIQUFUTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEoaGFhdEFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtaGFhdCBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGRhdGFIQUFUID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzOyBcclxuXHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXZlcmFnZSBIQUFUOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQuaGFhdF9hdmVyYWdlICsgJyAnICsgZGF0YUhBQVQudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+IyBvZiByYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubnJhZGlhbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+UkNBTVNMOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQucmNhbXNsICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmVsZXZhdGlvbl9kYXRhX3NvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaGFhdE1ldGE7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIQUFUTWFwO1xyXG4gICAgXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgTWFwID0ge1xyXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1hcCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5jb250b3VySlNPTiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5zdGF0aW9uTWFya2VyID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNyZWF0ZSgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIEwubWFwYm94LmFjY2Vzc1Rva2VuID0gJ3BrLmV5SjFJam9pWTI5dGNIVjBaV05vSWl3aVlTSTZJbk15YmxNeWEzY2lmUS5QOHlwcGVzSGtpNXFNeXhUYzJDTkxnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAgPSBMLm1hcGJveC5tYXAoJ21hcCcsICdmY2Muazc0ZWQ1Z2UnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRpb25Db250cm9sOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1heFpvb206IDE5XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLnNldFZpZXcoWzQxLjA1LCAtOTVdLCA0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlU3RyZWV0ID0gTC5tYXBib3gudGlsZUxheWVyKCdmY2Muazc0ZWQ1Z2UnKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgdmFyIGJhc2VTYXRlbGxpdGUgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRkN24wZycpO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVRlcnJhaW4gPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRjbTNvbCcpO1xyXG5cclxuICAgICAgICAgICAgTC5jb250cm9sLnNjYWxlKHtcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tcmlnaHQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgdmFyIGdlb2NvZGVyID0gTC5tYXBib3guZ2VvY29kZXIoJ21hcGJveC5wbGFjZXMtdjEnKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBsYXllckNvbnRyb2wgPSBuZXcgTC5Db250cm9sLkxheWVycyh7XHJcbiAgICAgICAgICAgICAgICAnU3RyZWV0JzogYmFzZVN0cmVldC5hZGRUbyhNYXAubWFwKSxcclxuICAgICAgICAgICAgICAgICdTYXRlbGxpdGUnOiBiYXNlU2F0ZWxsaXRlLFxyXG4gICAgICAgICAgICAgICAgJ1RlcnJhaW4nOiBiYXNlVGVycmFpblxyXG4gICAgICAgICAgICB9LCB7fSwge1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3BsZWZ0J1xyXG4gICAgICAgICAgICB9KS5hZGRUbyhNYXAubWFwKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXJrZXJJY29uID0ge1xyXG4gICAgICAgICAgICAgICAgaWNvbjogbmV3IEwuSWNvbih7XHJcbiAgICAgICAgICAgICAgICAgICAgaWNvblVybDogJy4uL2ltYWdlcy9tYXJrZXItaWNvbi0yeC1ibHVlLnBuZycsXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZG93VXJsOiAnLi4vaW1hZ2VzL21hcmtlci1zaGFkb3cucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgaWNvbkFuY2hvcjogWzEyLCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXBBbmNob3I6IFsxLCAtMzRdLFxyXG4gICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcC5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFwaVR5cGUgPSAkKCcjYXBpVHlwZScpLnZhbCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcGlUeXBlICE9PSAnY29udG91cnNPUElGJyApIHtcclxuICAgICAgICAgICAgICAgICAgICBNYXAuY3JlYXRlVGVtcE1hcmtlcihldmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcE1hcmtlcjogZnVuY3Rpb24oZXZlbnQpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBsYXQgPSBldmVudC5sYXRsbmcubGF0LnRvRml4ZWQoMTApO1xyXG4gICAgICAgICAgICB2YXIgbG9uID0gZXZlbnQubGF0bG5nLmxuZy50b0ZpeGVkKDEwKTtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9ICQoJy5maWVsZHM6dmlzaWJsZScpO1xyXG4gICAgICAgICAgICB2YXIgbGF0RmllbGQgPSBmaWVsZHMuZmluZCgnaW5wdXRbbmFtZT1cImxhdFwiXScpO1xyXG4gICAgICAgICAgICB2YXIgbG9uRmllbGQgPSBmaWVsZHMuZmluZCgnaW5wdXRbbmFtZT1cImxvblwiXScpO1xyXG4gICAgICAgICAgICB2YXIgY29vcmRNZXRhID0gJzxkbCBjbGFzcz1cImRsLWNvb3JkcyBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGltYWdlVVJMID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNlYXJjaCgnYXBpL2NvbnRvdXJzJykgPT09IDEgPyAnaW1hZ2VzJyA6ICcvaW1hZ2VzJztcclxuXHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8ZGQ+JyArIGxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGRkPicgKyBsb24gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzwvZGw+PGJ1dHRvbiBpZD1cInJlbW92ZU1hcmtlclwiIGNsYXNzPVwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi14c1wiPlJlbW92ZTwvYnV0dG9uPic7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVDb29yZHMoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTWFwLm1hcC5oYXNMYXllcihNYXAudGVtcE1hcmtlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC50ZW1wTWFya2VyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsYXRGaWVsZC52YWwoJycpXHJcbiAgICAgICAgICAgICAgICBsb25GaWVsZC52YWwoJycpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBzaG93Q29vcmRzKCkge1xyXG4gICAgICAgICAgICAgICAgbGF0RmllbGQudmFsKGxhdCk7XHJcbiAgICAgICAgICAgICAgICBsb25GaWVsZC52YWwobG9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVtb3ZlQ29vcmRzKCk7XHJcbiAgICAgICAgICAgIHNob3dDb29yZHMoKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC50ZW1wTWFya2VyID0gbmV3IEwubWFya2VyKGV2ZW50LmxhdGxuZywge1xyXG4gICAgICAgICAgICAgICAgICAgIGljb246IG5ldyBMLkljb24oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uVXJsOiBpbWFnZVVSTCArICcvbWFya2VyLWljb24tMngtZ3JlZW4ucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhZG93VXJsOiBpbWFnZVVSTCArICcvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29vcmRNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgc2hvd0Nvb3Jkcyk7XHJcblxyXG4gICAgICAgICAgICAkKCcubGVhZmxldC1wb3B1cC1jb250ZW50Jykub24oJ2NsaWNrJywgJyNyZW1vdmVNYXJrZXInLCByZW1vdmVDb29yZHMpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyTGF5ZXJzOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5jb250b3VySlNPTikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5tYXAucmVtb3ZlTGF5ZXIoTWFwLmNvbnRvdXJKU09OKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC50ZW1wTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmZlYXR1cmVMYXllcikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzZXRWaWV3OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHJlcXVpcmUoJy4vcHJvZmlsZU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLnByb2ZpbGVBUEknLCAnW2RhdGEtYXBpPVwicHJvZmlsZVwiXScsIFByb2ZpbGVNYXAuZ2V0RGF0YSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Ly8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktcHJvZmlsZS5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9wcm9maWxlLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIFByb2ZpbGVGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1wcm9maWxlJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBQcm9maWxlRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVGb3JtO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHJlcXVpcmUoJy4vYXBpTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIFByb2ZpbGVNYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcHJvZmlsZUFQSSA9ICcuL3Byb2ZpbGUuanNvbj8nO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcHJvZmlsZUFQSSArPSAkKCcuZmllbGRzLXByb2ZpbGUnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBQcm9maWxlTWFwLmdldFRvb2x0aXBNZXRhO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldERhdGEocHJvZmlsZUFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaGFhdE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtcHJvZmlsZSBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgdmFyIGRhdGFQcm9maWxlID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF2ZXJhZ2VfZWxldmF0aW9uICsgJyAnICsgZGF0YVByb2ZpbGUudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5sYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmxvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+QXppbXV0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmF6aW11dGggKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkRhdGEgU291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBoYWF0TWV0YTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb2ZpbGVNYXA7XHJcbiAgICBcclxufSgpKTtcclxuIl19
