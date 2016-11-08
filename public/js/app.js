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
        showError: function(data) {
            var errMsg = '';
            
            try {
                errMsg = data.responseJSON.features[0].properties.statusMessage;            
            } catch(e) {
                errMsg = data.responseJSON.type;
            }        

            $('#modal-loading').modal('hide');

            $('.alert').hide('fast');

            $('#txt-error')
                .empty()              
                .text(errMsg);

            $('.alert').slideDown();
            
            Map.clearLayers();
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

    // used to create Elevation, HAAT, Profile maps
    var APIMap = {

        getData: function(apiURL, apiSuccess) {

            var ajaxSuccess = function(data) {
                if (data.features[0].properties.status === 'success') {
                    $('.alert').hide('fast');
                    APIMap.createMarker(data);                    
                } else {
                    APIForm.showError(data);                    
                }

                APIResponse.display(data);
            };

            APIResponse.url = apiURL;

            $.ajax({
                url: apiURL,
                async: true,
                type: 'GET',
                dataType: 'json',
                success: apiSuccess ? apiSuccess : ajaxSuccess,
                error: function(data) {
                    APIForm.showError(data);
                    APIResponse.display(data);
                }
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

            $('.apiResponse__out code')
                .text('')
                .text(JSON.stringify(data, null, 2));

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

    // used to create Coverage and Entity maps
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

                if ($('#ent-serviceType').val() === 'am') {
                    contourAPI += '?stationClass=' + apiURL[3] + '&timePeriod=' + apiURL[4];    
                }                

            } else {
                contourAPI = './coverage.json?';
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
                    } else {
                        APIForm.showError();
                    }

                    APIResponse.display(data);
                },
                error: function(data) {
                    APIForm.showError(data);
                    APIResponse.display(data);
                }
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
            $('label[for="channel"]').addClass('required');

            // display optional fields based on Service Type
            $('#frm-contoursEnterprise').on('change', '.js-entrp', function() {
                var serviceVal = this.value;

                $('#frm-contoursEnterprise').find('input').val('');
                $('#curve').val(0);
                $('#src').val('ned');
                $('#unit').val('m');
                
                if (serviceVal === 'fm') {
                    $('label[for="channel"]').removeClass('required');
                    $('#channel').attr('required', false);
                
                } else {
                    $('label[for="channel"]').addClass('required');
                    $('#channel').attr('required', true);
                }
            });

            $('#form-params').on('click.contoursEnterpriseAPI', '[data-api="contoursEnterprise"]', ContourMap.getContour);
            
        },
        getParams: function() {
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-coverage.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/coverage.{format}'].get.parameters;

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
            
            // create custom field ID and for attribute values
            opifForm
                .find('label').each(function(index, el) {
                    var attrVal = $(el).attr('for');

                    $(el).attr('for', 'ent-' + attrVal);
                })
                .end()
                .find('[id]').each(function(index, el) {
                    var idVal = $(el).attr('id');

                    $(el).attr('id', 'ent-' + idVal);
                })
                .end()
                .find('select').eq(0).addClass('js-opif');
            
            // display optional fields based on Service Type
            opifForm.on('change', '.js-opif', function() {
                var serviceVal = this.value;

                $('#ent-idType')
                    .val('facilityid')
                    .find('option').hide();

                $('label[for="ent-idValue"]').text('Facility ID');
                $('#ent-idValue').val('');

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
            $('#ent-idType').on('change', function() {
                $('#ent-idValue').val('');
                $('label[for="ent-idValue"]').text(idTypes[this.value]);
            });

            $('#form-params').on('click.contoursOPIFAPI', '[data-api="contoursOPIF"]', ContourMap.getContour);

        },
        getParams: function() {
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-entity.json',
                async: true,
                type: "GET",
                dataType: "json",
                success: function(data) {
                    var paramsData = data.paths['/entity.{format}'].get.parameters;

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

            // create custom field ID and for attribute values
            $('#frm-elevation')
                .find('label').each(function(index, el) {
                    var attrVal = $(el).attr('for');

                    $(el).attr('for', 'elev-' + attrVal);
                })
                .end()
                .find('[id]').each(function(index, el) {
                    var idVal = $(el).attr('id');

                    $(el).attr('id', 'elev-' + idVal);
                });
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

            // create custom field ID and for attribute values
            $('#frm-haat')
                .find('label').each(function(index, el) {
                    var attrVal = $(el).attr('for');

                    $(el).attr('for', 'haat-' + attrVal);
                })
                .end()
                .find('[id]').each(function(index, el) {
                    var idVal = $(el).attr('id');

                    $(el).attr('id', 'haat-' + idVal);
                });
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
            this.imageURL = window.location.pathname.search('api/contours') === 1 ? 'images' : '/images';

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
                    iconUrl: Map.imageURL + '/marker-icon-2x-blue.png',
                    shadowUrl: Map.imageURL + '/marker-shadow.png',
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
            //var imageURL = window.location.pathname.search('api/contours') === 1 ? 'images' : '/images';

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
                        iconUrl: Map.imageURL + '/marker-icon-2x-green.png',
                        shadowUrl: Map.imageURL + '/marker-shadow.png',
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

            // create custom field ID and for attribute values
            $('#frm-profile')
                .find('label').each(function(index, el) {
                    var attrVal = $(el).attr('for');

                    $(el).attr('for', 'profile-' + attrVal);
                })
                .end()
                .find('[id]').each(function(index, el) {
                    var idVal = $(el).attr('id');

                    $(el).attr('id', 'profile-' + idVal);
                });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tYXAuanMnKTtcclxuICAgIHZhciBDb250b3VyRW50ZXJwcmlzZUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvY29udG91cnNFbnRlcnByaXNlRm9ybS5qcycpO1xyXG4gICAgdmFyIENvbnRvdXJPUElGRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9jb250b3Vyc09QSUZGb3JtLmpzJyk7XHJcbiAgICB2YXIgRWxldmF0aW9uRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9lbGV2YXRpb25Gb3JtLmpzJyk7XHJcbiAgICB2YXIgSEFBVEZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvaGFhdEZvcm0uanMnKTtcclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHJlcXVpcmUoJy4vbW9kdWxlcy9wcm9maWxlRm9ybS5qcycpO1xyXG4gICAgXHJcbiAgICBBUElGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgIE1hcC5pbml0KCk7XHJcbiAgICBFbGV2YXRpb25Gb3JtLmdldFBhcmFtcygpOyAgICBcclxuICAgIENvbnRvdXJFbnRlcnByaXNlRm9ybS5nZXRQYXJhbXMoKTtcclxuICAgIENvbnRvdXJPUElGRm9ybS5nZXRQYXJhbXMoKTsgXHJcbiAgICBIQUFURm9ybS5nZXRQYXJhbXMoKTsgICAgICAgIFxyXG4gICAgUHJvZmlsZUZvcm0uZ2V0UGFyYW1zKCk7XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHsgICAgICAgICAgICBcclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS5vbignY2hhbmdlJywgQVBJRm9ybS5zd2l0Y2hGb3JtKTtcclxuXHJcbiAgICAgICAgICAgICQod2luZG93KS5rZXlkb3duKGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyNidG4tZ2V0QVBJJykuY2xpY2soKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKHtcclxuICAgICAgICAgICAgICAgIGJhY2tkcm9wOiAnc3RhdGljJyxcclxuICAgICAgICAgICAgICAgIGtleWJvYXJkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHNob3c6IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3dpdGNoRm9ybTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZEFQSSA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuZmllbGRzJykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAkKCcuZmllbGRzLScgKyBzZWxlY3RlZEFQSSkuc2xpZGVEb3duKCk7XHJcblxyXG4gICAgICAgICAgICAkKCcjYnRuLWdldEFQSScpLmF0dHIoJ2RhdGEtYXBpJywgc2VsZWN0ZWRBUEkpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmpzLWFtLW9ubHknKS5zbGlkZVVwKCk7XHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpWzBdLnJlc2V0KCk7XHJcblxyXG4gICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJpZFZhbHVlXCJdJykudGV4dCgnRmFjaWxpdHkgSUQnKTtcclxuICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiY2hhbm5lbFwiXScpLmF0dHIoJ3JlcXVpcmVkJywgdHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjYXBpVHlwZScpLnZhbChzZWxlY3RlZEFQSSk7ICAgICAgICAgICBcclxuXHJcbiAgICAgICAgICAgIEFQSVJlc3BvbnNlLmNsZWFyKCk7XHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG4gICAgICAgICAgICBNYXAucmVzZXRWaWV3KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzaG93RXJyb3I6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGVyck1zZyA9ICcnO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGVyck1zZyA9IGRhdGEucmVzcG9uc2VKU09OLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuc3RhdHVzTWVzc2FnZTsgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgICAgICAgICBlcnJNc2cgPSBkYXRhLnJlc3BvbnNlSlNPTi50eXBlO1xyXG4gICAgICAgICAgICB9ICAgICAgICBcclxuXHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoJ2hpZGUnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuXHJcbiAgICAgICAgICAgICQoJyN0eHQtZXJyb3InKVxyXG4gICAgICAgICAgICAgICAgLmVtcHR5KCkgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLnRleHQoZXJyTXNnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hbGVydCcpLnNsaWRlRG93bigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSUZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSByZXF1aXJlKCcuL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21hcC5qcycpO1xyXG4gICAgdmFyIEFQSVJlc3BvbnNlID0gcmVxdWlyZSgnLi9hcGlSZXNwb25zZS5qcycpO1xyXG5cclxuICAgIC8vIHVzZWQgdG8gY3JlYXRlIEVsZXZhdGlvbiwgSEFBVCwgUHJvZmlsZSBtYXBzXHJcbiAgICB2YXIgQVBJTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbihhcGlVUkwsIGFwaVN1Y2Nlc3MpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBhamF4U3VjY2VzcyA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuc3RhdHVzID09PSAnc3VjY2VzcycpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcihkYXRhKTsgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIEFQSVJlc3BvbnNlLmRpc3BsYXkoZGF0YSk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS51cmwgPSBhcGlVUkw7XHJcblxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVUkwsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGFwaVN1Y2Nlc3MgPyBhcGlTdWNjZXNzIDogYWpheFN1Y2Nlc3MsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSUZvcm0uc2hvd0Vycm9yKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSVJlc3BvbnNlLmRpc3BsYXkoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU1hcmtlcjogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgbWV0YSA9IEFQSU1hcC5nZXRUb29sdGlwTWV0YShkYXRhKTtcclxuICAgICAgICAgICAgdmFyIGxhdCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5sYXQ7XHJcbiAgICAgICAgICAgIHZhciBsb24gPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMubG9uO1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtsYXQsIGxvbl0sIE1hcC5tYXJrZXJJY29uKTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyLmFkZFRvKE1hcC5tYXApXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKG1ldGEpXHJcbiAgICAgICAgICAgICAgICAub3BlblBvcHVwKClcclxuICAgICAgICAgICAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCcuZmllbGRzOnZpc2libGUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmluZCgnaW5wdXRbbmFtZT1cImxhdFwiXScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC52YWwobGF0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWU9XCJsb25cIl0nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudmFsKGxvbik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIE1hcC5tYXAuc2V0VmlldyhbbGF0LCBsb25dLCA3KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gQVBJTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElSZXNwb25zZSA9IHtcclxuXHJcbiAgICAgICAgZGlzcGxheTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IEpTT04gbmV4dCB0byBtYXBcclxuXHJcbiAgICAgICAgICAgICQoJyNtb2RhbC1sb2FkaW5nJykubW9kYWwoJ2hpZGUnKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKVxyXG4gICAgICAgICAgICAgICAgLnRleHQoJycpXHJcbiAgICAgICAgICAgICAgICAudGV4dChKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSk7XHJcblxyXG4gICAgICAgICAgICAkKCdwcmUgY29kZScpLmVhY2goZnVuY3Rpb24oaSwgYmxvY2spIHtcclxuICAgICAgICAgICAgICAgIGhsanMuaGlnaGxpZ2h0QmxvY2soYmxvY2spO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fZHdubGQnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2hyZWYnLCBBUElSZXNwb25zZS51cmwpXHJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGUnKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjbGVhcjogZnVuY3Rpb24oKSB7ICAgXHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fb3V0IGNvZGUnKS50ZXh0KCcnKTtcclxuICAgICAgICAgICAgJCgnLmFwaVJlc3BvbnNlX19kd25sZCcpLmFkZENsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSVJlc3BvbnNlO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICAvLyB1c2VkIHRvIGNyZWF0ZSBDb3ZlcmFnZSBhbmQgRW50aXR5IG1hcHNcclxuICAgIHZhciBDb250b3VyTWFwID0ge1xyXG4gICAgICAgIGdldENvbnRvdXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgY29udG91ckFQSSA9ICcnO1xyXG4gICAgICAgICAgICB2YXIgYXBpVVJMID0gW107XHJcbiAgICAgICAgICAgIHZhciBhcGlUeXBlID0gJCgnI2FwaVR5cGUnKS52YWwoKTtcclxuICAgICAgICAgICAgdmFyIHNlcnZpY2VUeXBlID0gJCgnI3NlcnZpY2VUeXBlJykudmFsKCk7XHJcbiAgICAgICAgICAgIHZhciBhbVBhcmFtcyA9ICcnO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFwaVR5cGUgPT09ICdjb250b3Vyc09QSUYnKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcuZmllbGRzLScgKyBhcGlUeXBlKS5maW5kKCc6aW5wdXQnKS5ub3QoJ2J1dHRvbicpLmVhY2goZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcGlVUkwucHVzaCh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgPSBhcGlVUkwuc2xpY2UoMCwgMykuam9pbignLycpICsgJy5qc29uJzsgICAgXHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCQoJyNlbnQtc2VydmljZVR5cGUnKS52YWwoKSA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gJz9zdGF0aW9uQ2xhc3M9JyArIGFwaVVSTFszXSArICcmdGltZVBlcmlvZD0nICsgYXBpVVJMWzRdOyAgICBcclxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSA9ICcuL2NvdmVyYWdlLmpzb24/JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gJCgnLmZpZWxkcy1jb250b3Vyc0VudGVycHJpc2UnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoc2VydmljZVR5cGUgPT09ICdhbScpIHtcclxuICAgICAgICAgICAgICAgIGFtUGFyYW1zID0gJz8nICsgJCgnI2Zvcm0tcGFyYW1zJykuc2VyaWFsaXplKCkuc3BsaXQoJyYnKS5zbGljZSgzLCA1KS5qb2luKCcmJyk7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJICs9IGFtUGFyYW1zO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS51cmwgPSBjb250b3VyQVBJO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogY29udG91ckFQSSxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQ29udG91ck1hcC5jcmVhdGVDb250b3VyKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSUZvcm0uc2hvd0Vycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVDb250b3VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyX3N0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgY29sb3I6ICcjMTM0MjhCJyxcclxuICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogJyMxMzQyOEInLFxyXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMS4wLFxyXG4gICAgICAgICAgICAgICAgZmlsbE9wYWNpdHk6IDAuMyxcclxuICAgICAgICAgICAgICAgIHdlaWdodDogNFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuY29udG91ckpTT04gPSBMLmdlb0pzb24oZGF0YSwge1xyXG4gICAgICAgICAgICAgICAgc3R5bGU6IGNvbnRvdXJfc3R5bGVcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLmZpdEJvdW5kcyhNYXAuY29udG91ckpTT04uZ2V0Qm91bmRzKCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCQoJyNhcGlUeXBlJykudmFsKCkgPT09ICdjb250b3Vyc09QSUYnKSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU9QSUZNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGFGZWF0ID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB2YXIgY29udG91ck1ldGEgPSAnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIgPSBMLm1hcGJveC5mZWF0dXJlTGF5ZXIoKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllci5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgPSAnJztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkbCBjbGFzcz1cImRsLWNvbnRvdXIgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5hbnRlbm5hX2xhdCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmFudGVubmFfbG9uICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TnVtLiBvZiBSYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQubnJhZGlhbCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LnJjYW1zbCArICcgbWV0ZXJzPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GaWVsZCBTdHJlbmd0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmZpZWxkICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Rk0gQ2hhbm5lbDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmNoYW5uZWwgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5FUlA6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5lcnAgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5DdXJ2ZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmN1cnZlICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+U291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGFGZWF0LmFudGVubmFfbGF0LCBkYXRhRmVhdC5hbnRlbm5hX2xvbl0sIE1hcC5tYXJrZXJJY29uKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGNvbnRvdXJNZXRhKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVPUElGTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7IFxyXG4gICAgICAgICAgICB2YXIgY29udG91ck1ldGEgPSAnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIgPSBMLm1hcGJveC5mZWF0dXJlTGF5ZXIoKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllci5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSA9ICcnO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkbCBjbGFzcz1cImRsLWNvbnRvdXIgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkNhbGwgU2lnbjo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuY2FsbHNpZ24gKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc2VydmljZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5TZXJ2aWNlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc2VydmljZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GYWNpbGl0eSBJRDo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuZmFjaWxpdHlfaWQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GaWxlIE51bWJlcjo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuZmlsZW51bWJlciArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkFwcGxpY2F0aW9uIElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5hcHBsaWNhdGlvbl9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sb24gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlciA9IEwubWFya2VyKFtkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuc3RhdGlvbl9sYXQsIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zdGF0aW9uX2xvbl0sIE1hcC5tYXJrZXJJY29uKVxyXG4gICAgICAgICAgICAgICAgICAgIC5hZGRUbyhNYXAuZmVhdHVyZUxheWVyKVxyXG4gICAgICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29udG91ck1ldGEpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBDb250b3VyTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBDb250b3VyTWFwID0gcmVxdWlyZSgnLi9jb250b3VyTWFwLmpzJyk7ICAgXHJcblxyXG4gICAgdmFyIEVudHJwQ29udG91ckZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBlbnRycEZvcm0gPSAkKCcjZnJtLWNvbnRvdXJzRW50ZXJwcmlzZScpO1xyXG4gICAgICAgICAgICB2YXIgc2VydmljZVNlbCA9IGVudHJwRm9ybS5maW5kKCdzZWxlY3QnKS5lcSgwKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHNlcnZpY2VTZWwuYWRkQ2xhc3MoJ2pzLWVudHJwJyk7XHJcbiAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImNoYW5uZWxcIl0nKS5hZGRDbGFzcygncmVxdWlyZWQnKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGRpc3BsYXkgb3B0aW9uYWwgZmllbGRzIGJhc2VkIG9uIFNlcnZpY2UgVHlwZVxyXG4gICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXJzRW50ZXJwcmlzZScpLm9uKCdjaGFuZ2UnLCAnLmpzLWVudHJwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZVZhbCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc0VudGVycHJpc2UnKS5maW5kKCdpbnB1dCcpLnZhbCgnJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjY3VydmUnKS52YWwoMCk7XHJcbiAgICAgICAgICAgICAgICAkKCcjc3JjJykudmFsKCduZWQnKTtcclxuICAgICAgICAgICAgICAgICQoJyN1bml0JykudmFsKCdtJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChzZXJ2aWNlVmFsID09PSAnZm0nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiY2hhbm5lbFwiXScpLnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGFubmVsJykuYXR0cigncmVxdWlyZWQnLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiY2hhbm5lbFwiXScpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGFubmVsJykuYXR0cigncmVxdWlyZWQnLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suY29udG91cnNFbnRlcnByaXNlQVBJJywgJ1tkYXRhLWFwaT1cImNvbnRvdXJzRW50ZXJwcmlzZVwiXScsIENvbnRvdXJNYXAuZ2V0Q29udG91cik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktY292ZXJhZ2UuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvY292ZXJhZ2Uue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRW50cnBDb250b3VyRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cnNFbnRlcnByaXNlJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBFbnRycENvbnRvdXJGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gRW50cnBDb250b3VyRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHJlcXVpcmUoJy4vY29udG91ck1hcC5qcycpO1xyXG5cclxuICAgIHZhciBPUElGQ29udG91ckZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBpZFR5cGVzID0ge1xyXG4gICAgICAgICAgICAgICAgZmFjaWxpdHlpZDogJ0ZhY2lsaXR5IElEJyxcclxuICAgICAgICAgICAgICAgIGNhbGxzaWduOiAnQ2FsbCBTaWduJyxcclxuICAgICAgICAgICAgICAgIGZpbGVudW1iZXI6ICdGaWxlIE51bWJlcicsXHJcbiAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbmlkOiAnQXBwbGljYXRpb24gSUQnLFxyXG4gICAgICAgICAgICAgICAgYW50ZW5uYWlkOiAnQW50ZW5uYSBJRCdcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICB0djogWydmYWNpbGl0eWlkJywgJ2NhbGxzaWduJywgJ2ZpbGVudW1iZXInLCAnYXBwbGljYXRpb25pZCddLFxyXG4gICAgICAgICAgICAgICAgZm06IFsnZmFjaWxpdHlpZCcsICdjYWxsc2lnbicsICdmaWxlbnVtYmVyJywgJ2FwcGxpY2F0aW9uaWQnXSxcclxuICAgICAgICAgICAgICAgIGFtOiBbJ2ZhY2lsaXR5aWQnLCAnY2FsbHNpZ24nLCAnYW50ZW5uYWlkJ11cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcGlmRm9ybSA9ICQoJyNmcm0tY29udG91cnNPUElGJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICBvcGlmRm9ybVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xhYmVsJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9ICQoZWwpLmF0dHIoJ2ZvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdmb3InLCAnZW50LScgKyBhdHRyVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdbaWRdJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaWRWYWwgPSAkKGVsKS5hdHRyKCdpZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdpZCcsICdlbnQtJyArIGlkVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdzZWxlY3QnKS5lcSgwKS5hZGRDbGFzcygnanMtb3BpZicpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgIG9waWZGb3JtLm9uKCdjaGFuZ2UnLCAnLmpzLW9waWYnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlVmFsID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjZW50LWlkVHlwZScpXHJcbiAgICAgICAgICAgICAgICAgICAgLnZhbCgnZmFjaWxpdHlpZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ29wdGlvbicpLmhpZGUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJlbnQtaWRWYWx1ZVwiXScpLnRleHQoJ0ZhY2lsaXR5IElEJyk7XHJcbiAgICAgICAgICAgICAgICAkKCcjZW50LWlkVmFsdWUnKS52YWwoJycpO1xyXG5cclxuICAgICAgICAgICAgICAgICQoc2VydmljZVR5cGVzW3NlcnZpY2VWYWxdKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJ29wdGlvblt2YWx1ZT1cIicgKyB2YWx1ZSArICdcIl0nKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc2VydmljZVZhbCA9PT0gJ2FtJykge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBzZWxlY3RlZCBJRCBUeXBlIGxhYmVsIHRleHRcclxuICAgICAgICAgICAgJCgnI2VudC1pZFR5cGUnKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAkKCcjZW50LWlkVmFsdWUnKS52YWwoJycpO1xyXG4gICAgICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiZW50LWlkVmFsdWVcIl0nKS50ZXh0KGlkVHlwZXNbdGhpcy52YWx1ZV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3Vyc09QSUZBUEknLCAnW2RhdGEtYXBpPVwiY29udG91cnNPUElGXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1lbnRpdHkuanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvZW50aXR5Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE9QSUZDb250b3VyRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcblxyXG4gICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXJzT1BJRicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG5cclxuICAgICAgICAgICAgT1BJRkNvbnRvdXJGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gT1BJRkNvbnRvdXJGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSByZXF1aXJlKCcuL2VsZXZhdGlvbk1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25Gb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suZWxldmF0aW9uQVBJJywgJ1tkYXRhLWFwaT1cImVsZXZhdGlvblwiXScsIEVsZXZhdGlvbk1hcC5nZXREYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBjdXN0b20gZmllbGQgSUQgYW5kIGZvciBhdHRyaWJ1dGUgdmFsdWVzXHJcbiAgICAgICAgICAgICQoJyNmcm0tZWxldmF0aW9uJylcclxuICAgICAgICAgICAgICAgIC5maW5kKCdsYWJlbCcpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSAkKGVsKS5hdHRyKCdmb3InKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuYXR0cignZm9yJywgJ2VsZXYtJyArIGF0dHJWYWwpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5lbmQoKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ1tpZF0nKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpZFZhbCA9ICQoZWwpLmF0dHIoJ2lkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmF0dHIoJ2lkJywgJ2VsZXYtJyArIGlkVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGFyYW1zOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVsZXZhdGlvbi5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9lbGV2YXRpb24ue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5jcmVhdGVUZW1wbGF0ZShwYXJhbXNEYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0ge307XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSAkKCcjYXBpRm9ybS10ZW1wbGF0ZScpLmh0bWwoKTtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlLCBmaWVsZHNldEhUTUw7XHJcblxyXG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZShzb3VyY2UpO1xyXG5cclxuICAgICAgICAgICAgZmllbGRzLnBhcmFtcyA9IGRhdGE7XHJcbiAgICAgICAgICAgIGZpZWxkc2V0SFRNTCA9IHRlbXBsYXRlKGZpZWxkcyk7XHJcbiAgICAgICAgICAgICQoJyNmcm0tZWxldmF0aW9uJykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBFbGV2YXRpb25Gb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9ICAgICAgICBcclxuICAgIH07XHJcbiAgICBcclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uRm9ybTtcclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBFbGV2YXRpb25NYXAgPSB7XHJcblxyXG4gICAgICAgIGdldERhdGE6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZWxldmF0aW9uQVBJID0gJy4vZWxldmF0aW9uLmpzb24/JztcclxuXHJcbiAgICAgICAgICAgIGVsZXZhdGlvbkFQSSArPSAkKCcuZmllbGRzLWVsZXZhdGlvbicpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEVsZXZhdGlvbk1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGVsZXZhdGlvbkFQSSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUb29sdGlwTWV0YTogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgZWxldk1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtZWxldmF0aW9uIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkVsZXZhdGlvbjo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5lbGV2YXRpb24gKyAnICcgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMudW5pdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzFdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLmdlb21ldHJ5LmNvb3JkaW5hdGVzWzBdICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5EYXRhIFNvdXJjZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllcy5kYXRhU291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBlbGV2TWV0YTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gRWxldmF0aW9uTWFwO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBIQUFUTWFwID0gcmVxdWlyZSgnLi9oYWF0TWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIEhBQVRGb3JtID0ge1xyXG4gICAgICAgIGJpbmRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKS5vbignY2xpY2suaGFhdEFQSScsICdbZGF0YS1hcGk9XCJoYWF0XCJdJywgSEFBVE1hcC5nZXREYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBjdXN0b20gZmllbGQgSUQgYW5kIGZvciBhdHRyaWJ1dGUgdmFsdWVzXHJcbiAgICAgICAgICAgICQoJyNmcm0taGFhdCcpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnbGFiZWwnKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyVmFsID0gJChlbCkuYXR0cignZm9yJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmF0dHIoJ2ZvcicsICdoYWF0LScgKyBhdHRyVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdbaWRdJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaWRWYWwgPSAkKGVsKS5hdHRyKCdpZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdpZCcsICdoYWF0LScgKyBpZFZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1oYWF0Lmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL2hhYXQue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgSEFBVEZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWhhYXQnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuXHJcbiAgICAgICAgICAgIEhBQVRGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVEZvcm07XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIEFQSU1hcCA9IHJlcXVpcmUoJy4vYXBpTWFwLmpzJyk7XHJcbiAgICBcclxuICAgIHZhciBIQUFUTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRBUEkgPSAnLi9oYWF0Lmpzb24/JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGhhYXRBUEkgKz0gJCgnLmZpZWxkcy1oYWF0JykuZmluZCgnaW5wdXQsIHNlbGVjdCcpLnNlcmlhbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgQVBJTWFwLmdldFRvb2x0aXBNZXRhID0gSEFBVE1hcC5nZXRUb29sdGlwTWV0YTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXREYXRhKGhhYXRBUEkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VG9vbHRpcE1ldGE6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGhhYXRNZXRhID0gJzxkbCBjbGFzcz1cImRsLWhhYXQgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIHZhciBkYXRhSEFBVCA9IGRhdGEuZmVhdHVyZXNbMF0ucHJvcGVydGllczsgXHJcblxyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkF2ZXJhZ2UgSEFBVDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmhhYXRfYXZlcmFnZSArICcgJyArIGRhdGFIQUFULnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5sb24gKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PiMgb2YgcmFkaWFsczo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULm5yYWRpYWwgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULnJjYW1zbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGhhYXRNZXRhO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVE1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY29udG91ckpTT04gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGlvbk1hcmtlciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5pbWFnZVVSTCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zZWFyY2goJ2FwaS9jb250b3VycycpID09PSAxID8gJ2ltYWdlcycgOiAnL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICBNYXAuY3JlYXRlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgTC5tYXBib3guYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2lZMjl0Y0hWMFpXTm9JaXdpWVNJNkluTXlibE15YTNjaWZRLlA4eXBwZXNIa2k1cU15eFRjMkNOTGcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcCA9IEwubWFwYm94Lm1hcCgnbWFwJywgJ2ZjYy5rNzRlZDVnZScsIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4Wm9vbTogMTlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VTdHJlZXQgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRlZDVnZScpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVNhdGVsbGl0ZSA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGQ3bjBnJyk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVGVycmFpbiA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGNtM29sJyk7XHJcblxyXG4gICAgICAgICAgICBMLmNvbnRyb2wuc2NhbGUoe1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b21yaWdodCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZ2VvY29kZXIgPSBMLm1hcGJveC5nZW9jb2RlcignbWFwYm94LnBsYWNlcy12MScpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxheWVyQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuTGF5ZXJzKHtcclxuICAgICAgICAgICAgICAgICdTdHJlZXQnOiBiYXNlU3RyZWV0LmFkZFRvKE1hcC5tYXApLFxyXG4gICAgICAgICAgICAgICAgJ1NhdGVsbGl0ZSc6IGJhc2VTYXRlbGxpdGUsXHJcbiAgICAgICAgICAgICAgICAnVGVycmFpbic6IGJhc2VUZXJyYWluXHJcbiAgICAgICAgICAgIH0sIHt9LCB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcGxlZnQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcmtlckljb24gPSB7XHJcbiAgICAgICAgICAgICAgICBpY29uOiBuZXcgTC5JY29uKHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uVXJsOiBNYXAuaW1hZ2VVUkwgKyAnL21hcmtlci1pY29uLTJ4LWJsdWUucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICBzaGFkb3dVcmw6IE1hcC5pbWFnZVVSTCArICcvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGljb25TaXplOiBbMjUsIDQxXSxcclxuICAgICAgICAgICAgICAgICAgICBpY29uQW5jaG9yOiBbMTIsIDQxXSxcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZG93U2l6ZTogWzQxLCA0MV1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXBpVHlwZSA9ICQoJyNhcGlUeXBlJykudmFsKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFwaVR5cGUgIT09ICdjb250b3Vyc09QSUYnICkge1xyXG4gICAgICAgICAgICAgICAgICAgIE1hcC5jcmVhdGVUZW1wTWFya2VyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wTWFya2VyOiBmdW5jdGlvbihldmVudCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIGxhdCA9IGV2ZW50LmxhdGxuZy5sYXQudG9GaXhlZCgxMCk7XHJcbiAgICAgICAgICAgIHZhciBsb24gPSBldmVudC5sYXRsbmcubG5nLnRvRml4ZWQoMTApO1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0gJCgnLmZpZWxkczp2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgIHZhciBsYXRGaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibGF0XCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBsb25GaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibG9uXCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBjb29yZE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtY29vcmRzIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICAvL3ZhciBpbWFnZVVSTCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zZWFyY2goJ2FwaS9jb250b3VycycpID09PSAxID8gJ2ltYWdlcycgOiAnL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGRkPicgKyBsYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkZD4nICsgbG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8L2RsPjxidXR0b24gaWQ9XCJyZW1vdmVNYXJrZXJcIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdCBidG4teHNcIj5SZW1vdmU8L2J1dHRvbj4nO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlQ29vcmRzKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAudGVtcE1hcmtlcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGF0RmllbGQudmFsKCcnKVxyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKCcnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc2hvd0Nvb3JkcygpIHtcclxuICAgICAgICAgICAgICAgIGxhdEZpZWxkLnZhbChsYXQpO1xyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKGxvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlbW92ZUNvb3JkcygpO1xyXG4gICAgICAgICAgICBzaG93Q29vcmRzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAudGVtcE1hcmtlciA9IG5ldyBMLm1hcmtlcihldmVudC5sYXRsbmcsIHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uOiBuZXcgTC5JY29uKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvblVybDogTWFwLmltYWdlVVJMICsgJy9tYXJrZXItaWNvbi0yeC1ncmVlbi5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dVcmw6IE1hcC5pbWFnZVVSTCArICcvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29vcmRNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgc2hvd0Nvb3Jkcyk7XHJcblxyXG4gICAgICAgICAgICAkKCcubGVhZmxldC1wb3B1cC1jb250ZW50Jykub24oJ2NsaWNrJywgJyNyZW1vdmVNYXJrZXInLCByZW1vdmVDb29yZHMpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyTGF5ZXJzOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5jb250b3VySlNPTikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5tYXAucmVtb3ZlTGF5ZXIoTWFwLmNvbnRvdXJKU09OKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC50ZW1wTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmZlYXR1cmVMYXllcikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzZXRWaWV3OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHJlcXVpcmUoJy4vcHJvZmlsZU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLnByb2ZpbGVBUEknLCAnW2RhdGEtYXBpPVwicHJvZmlsZVwiXScsIFByb2ZpbGVNYXAuZ2V0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICAkKCcjZnJtLXByb2ZpbGUnKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xhYmVsJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9ICQoZWwpLmF0dHIoJ2ZvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdmb3InLCAncHJvZmlsZS0nICsgYXR0clZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnW2lkXScpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkVmFsID0gJChlbCkuYXR0cignaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuYXR0cignaWQnLCAncHJvZmlsZS0nICsgaWRWYWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1wcm9maWxlLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL3Byb2ZpbGUue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgUHJvZmlsZUZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLXByb2ZpbGUnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuXHJcbiAgICAgICAgICAgIFByb2ZpbGVGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gUHJvZmlsZUZvcm07XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9maWxlQVBJID0gJy4vcHJvZmlsZS5qc29uPyc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBwcm9maWxlQVBJICs9ICQoJy5maWVsZHMtcHJvZmlsZScpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IFByb2ZpbGVNYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShwcm9maWxlQVBJKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1wcm9maWxlIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICB2YXIgZGF0YVByb2ZpbGUgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkF2ZXJhZ2UgRWxldmF0aW9uOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuYXZlcmFnZV9lbGV2YXRpb24gKyAnICcgKyBkYXRhUHJvZmlsZS51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BemltdXRoOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuYXppbXV0aCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGhhYXRNZXRhO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gUHJvZmlsZU1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iXX0=
