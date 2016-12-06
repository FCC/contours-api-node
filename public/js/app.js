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
            // var apiURL = [];
            var apiType = $('#apiType').val();
            // var serviceType = $('#serviceType').val();
            // var amParams = '';

            if (apiType === 'contoursOPIF') {
                contourAPI = './entity.json?';
                contourAPI += $('.fields-contoursOPIF').find('input, select')
                    .filter(function() {
                        if (this.value !== '') {
                            return this;
                        }
                    })
                    .serialize();
            } else {
                contourAPI = './coverage.json?';
                contourAPI += $('.fields-contoursEnterprise').find('input, select').serialize();
            }

            /*if (serviceType === 'am') {
                amParams = '?' + $('#form-params').serialize().split('&').slice(3, 5).join('&');
                contourAPI += amParams;
            }*/

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
                // contourMeta += '<dt>File Number:</dt>';
                // contourMeta += '<dd>' + data.features[i].properties.filenumber + '</dd>';
                contourMeta += '<dt>Application ID:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.application_id + '</dd>';
                contourMeta += '<dt>Channel:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.channel + '</dd>';
                contourMeta += '<dt>No. of radials:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.nradial + '</dd>';
                contourMeta += '<dt>Latitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.antenna_lat + '</dd>';
                contourMeta += '<dt>Longitude:</dt>';
                contourMeta += '<dd>' + data.features[i].properties.antenna_lon + '</dd>';
                contourMeta += '</dl>';

                Map.stationMarker = L.marker([data.features[i].properties.antenna_lat, data.features[i].properties.antenna_lon], Map.markerIcon)
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
            var opifForm = $('#frm-contoursOPIF');
            var inputTypeFields = opifForm.find('input').closest('div').not(':last');

            var idTypes = {
                facilityid: 'Facility ID',
                callsign: 'Call Sign',
                filenumber: 'File Number',
                applicationid: 'Application ID',
                antennaid: 'Antenna ID'
            };

            // create Input Type field (not part of Entity API)
            var selectTpl = '<div class="form-group">';
            selectTpl += '<label for="ent-inputType" class="required">Input Type</label>';
            selectTpl += '<select id="ent-inputType" class="js-inputType form-control" name="inputType">';
            selectTpl += '<option value="ent-callsign" selected>Call Sign</option>';
            selectTpl += '<option value="ent-facilityId">Facility ID</option>';
            selectTpl += '<option value="ent-applicationId">Application ID</option>';
            selectTpl += '</select>';
            selectTpl += '</div>';

            opifForm.find('div').eq(0).after(selectTpl);

            // hide Input Type fields by default
            inputTypeFields.hide();
            

            // display Input Type options based on selection
            opifForm.on('change', '.js-inputType', function() {
                inputTypeFields.hide();
                $('#' + this.value).closest('div').slideDown();
            });

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

            // reset fields to default values when Service or Input Type changes
            opifForm.on('change', '.js-opif, .js-inputType', function() {
                opifForm
                    .find('input').val('')
                    .end()
                    .find('select:gt(1)').each(function(index, el) {
                        el.value = index === 3 ? 'ned' : 'false';
                    });                
            });

            // hide Input Type fields except Call Sign when Service Type changes
            opifForm.on('change', '.js-opif', function() {
                $('.js-inputType').val('ent-callsign');
                inputTypeFields.hide();
                $('#ent-callsign').closest('div').slideDown();
            });

            // show Call Sign field as default
            $('#ent-callsign').closest('div').slideDown(); 

            $('#ent-pop [value="false"]').attr('selected', true);
            $('#ent-area [value="false"]').attr('selected', true);
            

            $('#form-params').on('click.contoursOPIFAPI', '[data-api="contoursOPIF"]', ContourMap.getContour);

        },
        getParams: function() {
            // get parameters (form fields) from Swagger JSON
            $.ajax({
                url: 'json/api-entity.json',
                async: true,
                type: 'GET',
                dataType: 'json',
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
            haatMeta += '<dt>No. of radials:</dt>';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwdWJsaWMvanMvbWFpbi5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2FwaUZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9hcGlSZXNwb25zZS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2NvbnRvdXJNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9jb250b3Vyc0VudGVycHJpc2VGb3JtLmpzIiwicHVibGljL2pzL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2VsZXZhdGlvbkZvcm0uanMiLCJwdWJsaWMvanMvbW9kdWxlcy9lbGV2YXRpb25NYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9oYWF0Rm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL2hhYXRNYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9tYXAuanMiLCJwdWJsaWMvanMvbW9kdWxlcy9wcm9maWxlRm9ybS5qcyIsInB1YmxpYy9qcy9tb2R1bGVzL3Byb2ZpbGVNYXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2FwaUZvcm0uanMnKTtcclxuICAgIHZhciBNYXAgPSByZXF1aXJlKCcuL21vZHVsZXMvbWFwLmpzJyk7XHJcbiAgICB2YXIgQ29udG91ckVudGVycHJpc2VGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2NvbnRvdXJzRW50ZXJwcmlzZUZvcm0uanMnKTtcclxuICAgIHZhciBDb250b3VyT1BJRkZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvY29udG91cnNPUElGRm9ybS5qcycpO1xyXG4gICAgdmFyIEVsZXZhdGlvbkZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvZWxldmF0aW9uRm9ybS5qcycpO1xyXG4gICAgdmFyIEhBQVRGb3JtID0gcmVxdWlyZSgnLi9tb2R1bGVzL2hhYXRGb3JtLmpzJyk7XHJcbiAgICB2YXIgUHJvZmlsZUZvcm0gPSByZXF1aXJlKCcuL21vZHVsZXMvcHJvZmlsZUZvcm0uanMnKTtcclxuICAgIFxyXG4gICAgQVBJRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICBNYXAuaW5pdCgpO1xyXG4gICAgRWxldmF0aW9uRm9ybS5nZXRQYXJhbXMoKTsgICAgXHJcbiAgICBDb250b3VyRW50ZXJwcmlzZUZvcm0uZ2V0UGFyYW1zKCk7XHJcbiAgICBDb250b3VyT1BJRkZvcm0uZ2V0UGFyYW1zKCk7IFxyXG4gICAgSEFBVEZvcm0uZ2V0UGFyYW1zKCk7ICAgICAgICBcclxuICAgIFByb2ZpbGVGb3JtLmdldFBhcmFtcygpO1xyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgdmFyIEFQSUZvcm0gPSB7XHJcbiAgICAgICAgYmluZEV2ZW50czogZnVuY3Rpb24oKSB7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICQoJyNhcGlUeXBlJykub24oJ2NoYW5nZScsIEFQSUZvcm0uc3dpdGNoRm9ybSk7XHJcblxyXG4gICAgICAgICAgICAkKHdpbmRvdykua2V5ZG93bihmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAkKCcjYnRuLWdldEFQSScpLmNsaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgJCgnI21vZGFsLWxvYWRpbmcnKS5tb2RhbCh7XHJcbiAgICAgICAgICAgICAgICBiYWNrZHJvcDogJ3N0YXRpYycsXHJcbiAgICAgICAgICAgICAgICBrZXlib2FyZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBzaG93OiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN3aXRjaEZvcm06IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRBUEkgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG5cclxuICAgICAgICAgICAgJCgnLmZpZWxkcycpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgJCgnLmZpZWxkcy0nICsgc2VsZWN0ZWRBUEkpLnNsaWRlRG93bigpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2J0bi1nZXRBUEknKS5hdHRyKCdkYXRhLWFwaScsIHNlbGVjdGVkQVBJKTtcclxuXHJcbiAgICAgICAgICAgICQoJy5qcy1hbS1vbmx5Jykuc2xpZGVVcCgpO1xyXG4gICAgICAgICAgICAkKCcjZm9ybS1wYXJhbXMnKVswXS5yZXNldCgpO1xyXG5cclxuICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiaWRWYWx1ZVwiXScpLnRleHQoJ0ZhY2lsaXR5IElEJyk7XHJcbiAgICAgICAgICAgICQoJ2xhYmVsW2Zvcj1cImNoYW5uZWxcIl0nKS5hdHRyKCdyZXF1aXJlZCcsIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2FwaVR5cGUnKS52YWwoc2VsZWN0ZWRBUEkpOyAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS5jbGVhcigpO1xyXG4gICAgICAgICAgICBNYXAuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgTWFwLnJlc2V0VmlldygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2hvd0Vycm9yOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBlcnJNc2cgPSAnJztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBlcnJNc2cgPSBkYXRhLnJlc3BvbnNlSlNPTi5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnN0YXR1c01lc3NhZ2U7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICAgICAgICAgICAgZXJyTXNnID0gZGF0YS5yZXNwb25zZUpTT04udHlwZTtcclxuICAgICAgICAgICAgfSAgICAgICAgXHJcblxyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKCdoaWRlJyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5oaWRlKCdmYXN0Jyk7XHJcblxyXG4gICAgICAgICAgICAkKCcjdHh0LWVycm9yJylcclxuICAgICAgICAgICAgICAgIC5lbXB0eSgpICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC50ZXh0KGVyck1zZyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYWxlcnQnKS5zbGlkZURvd24oKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElGb3JtID0gcmVxdWlyZSgnLi9hcGlGb3JtLmpzJyk7XHJcbiAgICB2YXIgTWFwID0gcmVxdWlyZSgnLi9tYXAuanMnKTtcclxuICAgIHZhciBBUElSZXNwb25zZSA9IHJlcXVpcmUoJy4vYXBpUmVzcG9uc2UuanMnKTtcclxuXHJcbiAgICAvLyB1c2VkIHRvIGNyZWF0ZSBFbGV2YXRpb24sIEhBQVQsIFByb2ZpbGUgbWFwc1xyXG4gICAgdmFyIEFQSU1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oYXBpVVJMLCBhcGlTdWNjZXNzKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWpheFN1Y2Nlc3MgPSBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFsZXJ0JykuaGlkZSgnZmFzdCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIEFQSU1hcC5jcmVhdGVNYXJrZXIoZGF0YSk7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoZGF0YSk7ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgQVBJUmVzcG9uc2UudXJsID0gYXBpVVJMO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogYXBpVVJMLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBhcGlTdWNjZXNzID8gYXBpU3VjY2VzcyA6IGFqYXhTdWNjZXNzLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBBUElGb3JtLnNob3dFcnJvcihkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIG1ldGEgPSBBUElNYXAuZ2V0VG9vbHRpcE1ldGEoZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBsYXQgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMubGF0O1xyXG4gICAgICAgICAgICB2YXIgbG9uID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLmxvbjtcclxuXHJcbiAgICAgICAgICAgIE1hcC5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgTWFwLnN0YXRpb25NYXJrZXIgPSBMLm1hcmtlcihbbGF0LCBsb25dLCBNYXAubWFya2VySWNvbik7XHJcblxyXG4gICAgICAgICAgICBNYXAuc3RhdGlvbk1hcmtlci5hZGRUbyhNYXAubWFwKVxyXG4gICAgICAgICAgICAgICAgLmJpbmRQb3B1cChtZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnLmZpZWxkczp2aXNpYmxlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ2lucHV0W25hbWU9XCJsYXRcIl0nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudmFsKGxhdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKCdpbnB1dFtuYW1lPVwibG9uXCJdJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnZhbChsb24pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLnNldFZpZXcoW2xhdCwgbG9uXSwgNyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEFQSU1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSB7XHJcblxyXG4gICAgICAgIGRpc3BsYXk6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgLy8gZGlzcGxheSBKU09OIG5leHQgdG8gbWFwXHJcblxyXG4gICAgICAgICAgICAkKCcjbW9kYWwtbG9hZGluZycpLm1vZGFsKCdoaWRlJyk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX291dCBjb2RlJylcclxuICAgICAgICAgICAgICAgIC50ZXh0KCcnKVxyXG4gICAgICAgICAgICAgICAgLnRleHQoSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikpO1xyXG5cclxuICAgICAgICAgICAgJCgncHJlIGNvZGUnKS5lYWNoKGZ1bmN0aW9uKGksIGJsb2NrKSB7XHJcbiAgICAgICAgICAgICAgICBobGpzLmhpZ2hsaWdodEJsb2NrKGJsb2NrKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX2R3bmxkJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdocmVmJywgQVBJUmVzcG9uc2UudXJsKVxyXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRlJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uKCkgeyAgIFxyXG4gICAgICAgICAgICAkKCcuYXBpUmVzcG9uc2VfX291dCBjb2RlJykudGV4dCgnJyk7XHJcbiAgICAgICAgICAgICQoJy5hcGlSZXNwb25zZV9fZHdubGQnKS5hZGRDbGFzcygnaGlkZScpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBUElSZXNwb25zZTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJRm9ybSA9IHJlcXVpcmUoJy4vYXBpRm9ybS5qcycpO1xyXG4gICAgdmFyIE1hcCA9IHJlcXVpcmUoJy4vbWFwLmpzJyk7XHJcbiAgICB2YXIgQVBJUmVzcG9uc2UgPSByZXF1aXJlKCcuL2FwaVJlc3BvbnNlLmpzJyk7XHJcblxyXG4gICAgLy8gdXNlZCB0byBjcmVhdGUgQ292ZXJhZ2UgYW5kIEVudGl0eSBtYXBzXHJcbiAgICB2YXIgQ29udG91ck1hcCA9IHtcclxuICAgICAgICBnZXRDb250b3VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRvdXJBUEkgPSAnJztcclxuICAgICAgICAgICAgLy8gdmFyIGFwaVVSTCA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgYXBpVHlwZSA9ICQoJyNhcGlUeXBlJykudmFsKCk7XHJcbiAgICAgICAgICAgIC8vIHZhciBzZXJ2aWNlVHlwZSA9ICQoJyNzZXJ2aWNlVHlwZScpLnZhbCgpO1xyXG4gICAgICAgICAgICAvLyB2YXIgYW1QYXJhbXMgPSAnJztcclxuXHJcbiAgICAgICAgICAgIGlmIChhcGlUeXBlID09PSAnY29udG91cnNPUElGJykge1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSA9ICcuL2VudGl0eS5qc29uPyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyQVBJICs9ICQoJy5maWVsZHMtY29udG91cnNPUElGJykuZmluZCgnaW5wdXQsIHNlbGVjdCcpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsdWUgIT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSA9ICcuL2NvdmVyYWdlLmpzb24/JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJBUEkgKz0gJCgnLmZpZWxkcy1jb250b3Vyc0VudGVycHJpc2UnKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8qaWYgKHNlcnZpY2VUeXBlID09PSAnYW0nKSB7XHJcbiAgICAgICAgICAgICAgICBhbVBhcmFtcyA9ICc/JyArICQoJyNmb3JtLXBhcmFtcycpLnNlcmlhbGl6ZSgpLnNwbGl0KCcmJykuc2xpY2UoMywgNSkuam9pbignJicpO1xyXG4gICAgICAgICAgICAgICAgY29udG91ckFQSSArPSBhbVBhcmFtcztcclxuICAgICAgICAgICAgfSovXHJcblxyXG4gICAgICAgICAgICBBUElSZXNwb25zZS51cmwgPSBjb250b3VyQVBJO1xyXG5cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogY29udG91ckFQSSxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5hbGVydCcpLmhpZGUoJ2Zhc3QnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQ29udG91ck1hcC5jcmVhdGVDb250b3VyKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFQSUZvcm0uc2hvd0Vycm9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBBUElSZXNwb25zZS5kaXNwbGF5KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJRm9ybS5zaG93RXJyb3IoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgQVBJUmVzcG9uc2UuZGlzcGxheShkYXRhKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVDb250b3VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyX3N0eWxlID0ge1xyXG4gICAgICAgICAgICAgICAgY29sb3I6ICcjMTM0MjhCJyxcclxuICAgICAgICAgICAgICAgIGZpbGxDb2xvcjogJyMxMzQyOEInLFxyXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMS4wLFxyXG4gICAgICAgICAgICAgICAgZmlsbE9wYWNpdHk6IDAuMyxcclxuICAgICAgICAgICAgICAgIHdlaWdodDogNFxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgTWFwLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAuY29udG91ckpTT04gPSBMLmdlb0pzb24oZGF0YSwge1xyXG4gICAgICAgICAgICAgICAgc3R5bGU6IGNvbnRvdXJfc3R5bGVcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLmZpdEJvdW5kcyhNYXAuY29udG91ckpTT04uZ2V0Qm91bmRzKCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCQoJyNhcGlUeXBlJykudmFsKCkgPT09ICdjb250b3Vyc09QSUYnKSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU9QSUZNYXJrZXIoZGF0YSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBDb250b3VyTWFwLmNyZWF0ZU1hcmtlcihkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVNYXJrZXI6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGFGZWF0ID0gZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB2YXIgY29udG91ck1ldGEgPSAnJztcclxuXHJcbiAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIgPSBMLm1hcGJveC5mZWF0dXJlTGF5ZXIoKS5hZGRUbyhNYXAubWFwKTtcclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllci5jbGVhckxheWVycygpO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgPSAnJztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkbCBjbGFzcz1cImRsLWNvbnRvdXIgZGwtaG9yaXpvbnRhbFwiPic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5hbnRlbm5hX2xhdCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkxvbmdpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmFudGVubmFfbG9uICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TnVtLiBvZiBSYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQubnJhZGlhbCArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LnJjYW1zbCArICcgbWV0ZXJzPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5GaWVsZCBTdHJlbmd0aDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmZpZWxkICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Rk0gQ2hhbm5lbDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmNoYW5uZWwgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5FUlA6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhRmVhdC5lcnAgKyAnPC9kZD4nO1xyXG5cclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkdD5DdXJ2ZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGFGZWF0LmN1cnZlICsgJzwvZGQ+JztcclxuXHJcbiAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+U291cmNlOjwvZHQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YUZlYXQuZWxldmF0aW9uX2RhdGFfc291cmNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzwvZGw+JztcclxuXHJcbiAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGFGZWF0LmFudGVubmFfbGF0LCBkYXRhRmVhdC5hbnRlbm5hX2xvbl0sIE1hcC5tYXJrZXJJY29uKVxyXG4gICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAuYmluZFBvcHVwKGNvbnRvdXJNZXRhKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVPUElGTWFya2VyOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250b3VyTWV0YSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLmZlYXR1cmVMYXllciA9IEwubWFwYm94LmZlYXR1cmVMYXllcigpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICBNYXAuZmVhdHVyZUxheWVyLmNsZWFyTGF5ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZmVhdHVyZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhID0gJyc7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRsIGNsYXNzPVwiZGwtY29udG91ciBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2FsbCBTaWduOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYWxsc2lnbiArICc8L2RkPic7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PlNlcnZpY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5zZXJ2aWNlICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0PkZhY2lsaXR5IElEOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5mYWNpbGl0eV9pZCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICAvLyBjb250b3VyTWV0YSArPSAnPGR0PkZpbGUgTnVtYmVyOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIC8vIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5maWxlbnVtYmVyICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+QXBwbGljYXRpb24gSUQ6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFwcGxpY2F0aW9uX2lkICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+Q2hhbm5lbDo8L2R0Pic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzW2ldLnByb3BlcnRpZXMuY2hhbm5lbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPGR0Pk5vLiBvZiByYWRpYWxzOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5ucmFkaWFsICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TGF0aXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICAgICAgY29udG91ck1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFudGVubmFfbGF0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgICAgIGNvbnRvdXJNZXRhICs9ICc8ZGQ+JyArIGRhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5hbnRlbm5hX2xvbiArICc8L2RkPic7XHJcbiAgICAgICAgICAgICAgICBjb250b3VyTWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgICAgIE1hcC5zdGF0aW9uTWFya2VyID0gTC5tYXJrZXIoW2RhdGEuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5hbnRlbm5hX2xhdCwgZGF0YS5mZWF0dXJlc1tpXS5wcm9wZXJ0aWVzLmFudGVubmFfbG9uXSwgTWFwLm1hcmtlckljb24pXHJcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvKE1hcC5mZWF0dXJlTGF5ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmJpbmRQb3B1cChjb250b3VyTWV0YSk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENvbnRvdXJNYXA7XHJcblxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIENvbnRvdXJNYXAgPSByZXF1aXJlKCcuL2NvbnRvdXJNYXAuanMnKTsgICBcclxuXHJcbiAgICB2YXIgRW50cnBDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVudHJwRm9ybSA9ICQoJyNmcm0tY29udG91cnNFbnRlcnByaXNlJyk7XHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlU2VsID0gZW50cnBGb3JtLmZpbmQoJ3NlbGVjdCcpLmVxKDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgc2VydmljZVNlbC5hZGRDbGFzcygnanMtZW50cnAnKTtcclxuICAgICAgICAgICAgJCgnbGFiZWxbZm9yPVwiY2hhbm5lbFwiXScpLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzcGxheSBvcHRpb25hbCBmaWVsZHMgYmFzZWQgb24gU2VydmljZSBUeXBlXHJcbiAgICAgICAgICAgICQoJyNmcm0tY29udG91cnNFbnRlcnByaXNlJykub24oJ2NoYW5nZScsICcuanMtZW50cnAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlVmFsID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCcjZnJtLWNvbnRvdXJzRW50ZXJwcmlzZScpLmZpbmQoJ2lucHV0JykudmFsKCcnKTtcclxuICAgICAgICAgICAgICAgICQoJyNjdXJ2ZScpLnZhbCgwKTtcclxuICAgICAgICAgICAgICAgICQoJyNzcmMnKS52YWwoJ25lZCcpO1xyXG4gICAgICAgICAgICAgICAgJCgnI3VuaXQnKS52YWwoJ20nKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHNlcnZpY2VWYWwgPT09ICdmbScpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJjaGFubmVsXCJdJykucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NoYW5uZWwnKS5hdHRyKCdyZXF1aXJlZCcsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAkKCdsYWJlbFtmb3I9XCJjaGFubmVsXCJdJykuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2NoYW5uZWwnKS5hdHRyKCdyZXF1aXJlZCcsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICQoJyNmb3JtLXBhcmFtcycpLm9uKCdjbGljay5jb250b3Vyc0VudGVycHJpc2VBUEknLCAnW2RhdGEtYXBpPVwiY29udG91cnNFbnRlcnByaXNlXCJdJywgQ29udG91ck1hcC5nZXRDb250b3VyKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1jb3ZlcmFnZS5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9jb3ZlcmFnZS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBFbnRycENvbnRvdXJGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc0VudGVycHJpc2UnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIEVudHJwQ29udG91ckZvcm0uYmluZEV2ZW50cygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbnRycENvbnRvdXJGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBDb250b3VyTWFwID0gcmVxdWlyZSgnLi9jb250b3VyTWFwLmpzJyk7XHJcblxyXG4gICAgdmFyIE9QSUZDb250b3VyRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIG9waWZGb3JtID0gJCgnI2ZybS1jb250b3Vyc09QSUYnKTtcclxuICAgICAgICAgICAgdmFyIGlucHV0VHlwZUZpZWxkcyA9IG9waWZGb3JtLmZpbmQoJ2lucHV0JykuY2xvc2VzdCgnZGl2Jykubm90KCc6bGFzdCcpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGlkVHlwZXMgPSB7XHJcbiAgICAgICAgICAgICAgICBmYWNpbGl0eWlkOiAnRmFjaWxpdHkgSUQnLFxyXG4gICAgICAgICAgICAgICAgY2FsbHNpZ246ICdDYWxsIFNpZ24nLFxyXG4gICAgICAgICAgICAgICAgZmlsZW51bWJlcjogJ0ZpbGUgTnVtYmVyJyxcclxuICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uaWQ6ICdBcHBsaWNhdGlvbiBJRCcsXHJcbiAgICAgICAgICAgICAgICBhbnRlbm5haWQ6ICdBbnRlbm5hIElEJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8gY3JlYXRlIElucHV0IFR5cGUgZmllbGQgKG5vdCBwYXJ0IG9mIEVudGl0eSBBUEkpXHJcbiAgICAgICAgICAgIHZhciBzZWxlY3RUcGwgPSAnPGRpdiBjbGFzcz1cImZvcm0tZ3JvdXBcIj4nO1xyXG4gICAgICAgICAgICBzZWxlY3RUcGwgKz0gJzxsYWJlbCBmb3I9XCJlbnQtaW5wdXRUeXBlXCIgY2xhc3M9XCJyZXF1aXJlZFwiPklucHV0IFR5cGU8L2xhYmVsPic7XHJcbiAgICAgICAgICAgIHNlbGVjdFRwbCArPSAnPHNlbGVjdCBpZD1cImVudC1pbnB1dFR5cGVcIiBjbGFzcz1cImpzLWlucHV0VHlwZSBmb3JtLWNvbnRyb2xcIiBuYW1lPVwiaW5wdXRUeXBlXCI+JztcclxuICAgICAgICAgICAgc2VsZWN0VHBsICs9ICc8b3B0aW9uIHZhbHVlPVwiZW50LWNhbGxzaWduXCIgc2VsZWN0ZWQ+Q2FsbCBTaWduPC9vcHRpb24+JztcclxuICAgICAgICAgICAgc2VsZWN0VHBsICs9ICc8b3B0aW9uIHZhbHVlPVwiZW50LWZhY2lsaXR5SWRcIj5GYWNpbGl0eSBJRDwvb3B0aW9uPic7XHJcbiAgICAgICAgICAgIHNlbGVjdFRwbCArPSAnPG9wdGlvbiB2YWx1ZT1cImVudC1hcHBsaWNhdGlvbklkXCI+QXBwbGljYXRpb24gSUQ8L29wdGlvbj4nO1xyXG4gICAgICAgICAgICBzZWxlY3RUcGwgKz0gJzwvc2VsZWN0Pic7XHJcbiAgICAgICAgICAgIHNlbGVjdFRwbCArPSAnPC9kaXY+JztcclxuXHJcbiAgICAgICAgICAgIG9waWZGb3JtLmZpbmQoJ2RpdicpLmVxKDApLmFmdGVyKHNlbGVjdFRwbCk7XHJcblxyXG4gICAgICAgICAgICAvLyBoaWRlIElucHV0IFR5cGUgZmllbGRzIGJ5IGRlZmF1bHRcclxuICAgICAgICAgICAgaW5wdXRUeXBlRmllbGRzLmhpZGUoKTtcclxuICAgICAgICAgICAgXHJcblxyXG4gICAgICAgICAgICAvLyBkaXNwbGF5IElucHV0IFR5cGUgb3B0aW9ucyBiYXNlZCBvbiBzZWxlY3Rpb25cclxuICAgICAgICAgICAgb3BpZkZvcm0ub24oJ2NoYW5nZScsICcuanMtaW5wdXRUeXBlJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpbnB1dFR5cGVGaWVsZHMuaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgJCgnIycgKyB0aGlzLnZhbHVlKS5jbG9zZXN0KCdkaXYnKS5zbGlkZURvd24oKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICBvcGlmRm9ybVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xhYmVsJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9ICQoZWwpLmF0dHIoJ2ZvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdmb3InLCAnZW50LScgKyBhdHRyVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdbaWRdJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaWRWYWwgPSAkKGVsKS5hdHRyKCdpZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdpZCcsICdlbnQtJyArIGlkVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdzZWxlY3QnKS5lcSgwKS5hZGRDbGFzcygnanMtb3BpZicpO1xyXG5cclxuICAgICAgICAgICAgLy8gcmVzZXQgZmllbGRzIHRvIGRlZmF1bHQgdmFsdWVzIHdoZW4gU2VydmljZSBvciBJbnB1dCBUeXBlIGNoYW5nZXNcclxuICAgICAgICAgICAgb3BpZkZvcm0ub24oJ2NoYW5nZScsICcuanMtb3BpZiwgLmpzLWlucHV0VHlwZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgb3BpZkZvcm1cclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgnaW5wdXQnKS52YWwoJycpXHJcbiAgICAgICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoJ3NlbGVjdDpndCgxKScpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLnZhbHVlID0gaW5kZXggPT09IDMgPyAnbmVkJyA6ICdmYWxzZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIGhpZGUgSW5wdXQgVHlwZSBmaWVsZHMgZXhjZXB0IENhbGwgU2lnbiB3aGVuIFNlcnZpY2UgVHlwZSBjaGFuZ2VzXHJcbiAgICAgICAgICAgIG9waWZGb3JtLm9uKCdjaGFuZ2UnLCAnLmpzLW9waWYnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICQoJy5qcy1pbnB1dFR5cGUnKS52YWwoJ2VudC1jYWxsc2lnbicpO1xyXG4gICAgICAgICAgICAgICAgaW5wdXRUeXBlRmllbGRzLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgICQoJyNlbnQtY2FsbHNpZ24nKS5jbG9zZXN0KCdkaXYnKS5zbGlkZURvd24oKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBzaG93IENhbGwgU2lnbiBmaWVsZCBhcyBkZWZhdWx0XHJcbiAgICAgICAgICAgICQoJyNlbnQtY2FsbHNpZ24nKS5jbG9zZXN0KCdkaXYnKS5zbGlkZURvd24oKTsgXHJcblxyXG4gICAgICAgICAgICAkKCcjZW50LXBvcCBbdmFsdWU9XCJmYWxzZVwiXScpLmF0dHIoJ3NlbGVjdGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgICQoJyNlbnQtYXJlYSBbdmFsdWU9XCJmYWxzZVwiXScpLmF0dHIoJ3NlbGVjdGVkJywgdHJ1ZSk7XHJcbiAgICAgICAgICAgIFxyXG5cclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmNvbnRvdXJzT1BJRkFQSScsICdbZGF0YS1hcGk9XCJjb250b3Vyc09QSUZcIl0nLCBDb250b3VyTWFwLmdldENvbnRvdXIpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIGdldCBwYXJhbWV0ZXJzIChmb3JtIGZpZWxkcykgZnJvbSBTd2FnZ2VyIEpTT05cclxuICAgICAgICAgICAgJC5hamF4KHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2pzb24vYXBpLWVudGl0eS5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL2VudGl0eS57Zm9ybWF0fSddLmdldC5wYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBPUElGQ29udG91ckZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG5cclxuICAgICAgICAgICAgJCgnI2ZybS1jb250b3Vyc09QSUYnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuXHJcbiAgICAgICAgICAgIE9QSUZDb250b3VyRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE9QSUZDb250b3VyRm9ybTtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgRWxldmF0aW9uTWFwID0gcmVxdWlyZSgnLi9lbGV2YXRpb25NYXAuanMnKTtcclxuXHJcbiAgICB2YXIgRWxldmF0aW9uRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmVsZXZhdGlvbkFQSScsICdbZGF0YS1hcGk9XCJlbGV2YXRpb25cIl0nLCBFbGV2YXRpb25NYXAuZ2V0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICAkKCcjZnJtLWVsZXZhdGlvbicpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnbGFiZWwnKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBlbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyVmFsID0gJChlbCkuYXR0cignZm9yJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICQoZWwpLmF0dHIoJ2ZvcicsICdlbGV2LScgKyBhdHRyVmFsKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgICAgIC5maW5kKCdbaWRdJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaWRWYWwgPSAkKGVsKS5hdHRyKCdpZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdpZCcsICdlbGV2LScgKyBpZFZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFBhcmFtczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHQvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1lbGV2YXRpb24uanNvbicsXHJcbiAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXHJcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtc0RhdGEgPSBkYXRhLnBhdGhzWycvZWxldmF0aW9uLntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEVsZXZhdGlvbkZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLWVsZXZhdGlvbicpLmFwcGVuZChmaWVsZHNldEhUTUwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgRWxldmF0aW9uRm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfSAgICAgICAgXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZXZhdGlvbkZvcm07XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgRWxldmF0aW9uTWFwID0ge1xyXG5cclxuICAgICAgICBnZXREYXRhOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZhdGlvbkFQSSA9ICcuL2VsZXZhdGlvbi5qc29uPyc7XHJcblxyXG4gICAgICAgICAgICBlbGV2YXRpb25BUEkgKz0gJCgnLmZpZWxkcy1lbGV2YXRpb24nKS5maW5kKCdpbnB1dCwgc2VsZWN0Jykuc2VyaWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0VG9vbHRpcE1ldGEgPSBFbGV2YXRpb25NYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShlbGV2YXRpb25BUEkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VG9vbHRpcE1ldGE6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGVsZXZNZXRhID0gJzxkbCBjbGFzcz1cImRsLWVsZXZhdGlvbiBkbC1ob3Jpem9udGFsXCI+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkdD5FbGV2YXRpb246PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuZWxldmF0aW9uICsgJyAnICsgZGF0YS5mZWF0dXJlc1swXS5wcm9wZXJ0aWVzLnVuaXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGR0PkxhdGl0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1sxXSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgZWxldk1ldGEgKz0gJzxkZD4nICsgZGF0YS5mZWF0dXJlc1swXS5nZW9tZXRyeS5jb29yZGluYXRlc1swXSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBlbGV2TWV0YSArPSAnPGRkPicgKyBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXMuZGF0YVNvdXJjZSArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGVsZXZNZXRhICs9ICc8L2RsPic7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZWxldk1ldGE7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZXZhdGlvbk1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgSEFBVE1hcCA9IHJlcXVpcmUoJy4vaGFhdE1hcC5qcycpO1xyXG5cclxuICAgIHZhciBIQUFURm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLmhhYXRBUEknLCAnW2RhdGEtYXBpPVwiaGFhdFwiXScsIEhBQVRNYXAuZ2V0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICAkKCcjZnJtLWhhYXQnKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xhYmVsJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9ICQoZWwpLmF0dHIoJ2ZvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdmb3InLCAnaGFhdC0nICsgYXR0clZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnW2lkXScpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkVmFsID0gJChlbCkuYXR0cignaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuYXR0cignaWQnLCAnaGFhdC0nICsgaWRWYWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgLy8gZ2V0IHBhcmFtZXRlcnMgKGZvcm0gZmllbGRzKSBmcm9tIFN3YWdnZXIgSlNPTlxyXG4gICAgICAgICAgICAkLmFqYXgoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnanNvbi9hcGktaGFhdC5qc29uJyxcclxuICAgICAgICAgICAgICAgIGFzeW5jOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiBcImpzb25cIixcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zRGF0YSA9IGRhdGEucGF0aHNbJy9oYWF0Lntmb3JtYXR9J10uZ2V0LnBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIEhBQVRGb3JtLmNyZWF0ZVRlbXBsYXRlKHBhcmFtc0RhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWVsZHMgPSB7fTtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICQoJyNhcGlGb3JtLXRlbXBsYXRlJykuaHRtbCgpO1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUsIGZpZWxkc2V0SFRNTDtcclxuXHJcbiAgICAgICAgICAgIHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHNvdXJjZSk7XHJcblxyXG4gICAgICAgICAgICBmaWVsZHMucGFyYW1zID0gZGF0YTtcclxuICAgICAgICAgICAgZmllbGRzZXRIVE1MID0gdGVtcGxhdGUoZmllbGRzKTtcclxuICAgICAgICAgICAgJCgnI2ZybS1oYWF0JykuYXBwZW5kKGZpZWxkc2V0SFRNTCk7XHJcblxyXG4gICAgICAgICAgICBIQUFURm9ybS5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhBQVRGb3JtO1xyXG5cclxufSgpKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIHZhciBBUElNYXAgPSByZXF1aXJlKCcuL2FwaU1hcC5qcycpO1xyXG4gICAgXHJcbiAgICB2YXIgSEFBVE1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0QVBJID0gJy4vaGFhdC5qc29uPyc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBoYWF0QVBJICs9ICQoJy5maWVsZHMtaGFhdCcpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IEhBQVRNYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShoYWF0QVBJKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1oYWF0IGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICB2YXIgZGF0YUhBQVQgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXM7IFxyXG5cclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BdmVyYWdlIEhBQVQ6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5oYWF0X2F2ZXJhZ2UgKyAnICcgKyBkYXRhSEFBVC51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULmxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YUhBQVQubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5Oby4gb2YgcmFkaWFsczo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULm5yYWRpYWwgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PlJDQU1TTDo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFIQUFULnJjYW1zbCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhSEFBVC5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGhhYXRNZXRhO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gSEFBVE1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgdmFyIE1hcCA9IHtcclxuICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXAgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY29udG91ckpTT04gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGlvbk1hcmtlciA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5pbWFnZVVSTCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zZWFyY2goJ2FwaS9jb250b3VycycpID09PSAxID8gJ2ltYWdlcycgOiAnL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICBNYXAuY3JlYXRlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgTC5tYXBib3guYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2lZMjl0Y0hWMFpXTm9JaXdpWVNJNkluTXlibE15YTNjaWZRLlA4eXBwZXNIa2k1cU15eFRjMkNOTGcnO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcCA9IEwubWFwYm94Lm1hcCgnbWFwJywgJ2ZjYy5rNzRlZDVnZScsIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWF4Wm9vbTogMTlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuc2V0VmlldyhbNDEuMDUsIC05NV0sIDQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VTdHJlZXQgPSBMLm1hcGJveC50aWxlTGF5ZXIoJ2ZjYy5rNzRlZDVnZScpLmFkZFRvKE1hcC5tYXApO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVNhdGVsbGl0ZSA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGQ3bjBnJyk7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVGVycmFpbiA9IEwubWFwYm94LnRpbGVMYXllcignZmNjLms3NGNtM29sJyk7XHJcblxyXG4gICAgICAgICAgICBMLmNvbnRyb2wuc2NhbGUoe1xyXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b21yaWdodCdcclxuICAgICAgICAgICAgfSkuYWRkVG8oTWFwLm1hcCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZ2VvY29kZXIgPSBMLm1hcGJveC5nZW9jb2RlcignbWFwYm94LnBsYWNlcy12MScpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxheWVyQ29udHJvbCA9IG5ldyBMLkNvbnRyb2wuTGF5ZXJzKHtcclxuICAgICAgICAgICAgICAgICdTdHJlZXQnOiBiYXNlU3RyZWV0LmFkZFRvKE1hcC5tYXApLFxyXG4gICAgICAgICAgICAgICAgJ1NhdGVsbGl0ZSc6IGJhc2VTYXRlbGxpdGUsXHJcbiAgICAgICAgICAgICAgICAnVGVycmFpbic6IGJhc2VUZXJyYWluXHJcbiAgICAgICAgICAgIH0sIHt9LCB7XHJcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcGxlZnQnXHJcbiAgICAgICAgICAgIH0pLmFkZFRvKE1hcC5tYXApO1xyXG5cclxuICAgICAgICAgICAgTWFwLm1hcmtlckljb24gPSB7XHJcbiAgICAgICAgICAgICAgICBpY29uOiBuZXcgTC5JY29uKHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uVXJsOiBNYXAuaW1hZ2VVUkwgKyAnL21hcmtlci1pY29uLTJ4LWJsdWUucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICBzaGFkb3dVcmw6IE1hcC5pbWFnZVVSTCArICcvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGljb25TaXplOiBbMjUsIDQxXSxcclxuICAgICAgICAgICAgICAgICAgICBpY29uQW5jaG9yOiBbMTIsIDQxXSxcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZG93U2l6ZTogWzQxLCA0MV1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBNYXAubWFwLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXBpVHlwZSA9ICQoJyNhcGlUeXBlJykudmFsKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFwaVR5cGUgIT09ICdjb250b3Vyc09QSUYnICkge1xyXG4gICAgICAgICAgICAgICAgICAgIE1hcC5jcmVhdGVUZW1wTWFya2VyKGV2ZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVUZW1wTWFya2VyOiBmdW5jdGlvbihldmVudCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIGxhdCA9IGV2ZW50LmxhdGxuZy5sYXQudG9GaXhlZCgxMCk7XHJcbiAgICAgICAgICAgIHZhciBsb24gPSBldmVudC5sYXRsbmcubG5nLnRvRml4ZWQoMTApO1xyXG4gICAgICAgICAgICB2YXIgZmllbGRzID0gJCgnLmZpZWxkczp2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgIHZhciBsYXRGaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibGF0XCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBsb25GaWVsZCA9IGZpZWxkcy5maW5kKCdpbnB1dFtuYW1lPVwibG9uXCJdJyk7XHJcbiAgICAgICAgICAgIHZhciBjb29yZE1ldGEgPSAnPGRsIGNsYXNzPVwiZGwtY29vcmRzIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICAvL3ZhciBpbWFnZVVSTCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zZWFyY2goJ2FwaS9jb250b3VycycpID09PSAxID8gJ2ltYWdlcycgOiAnL2ltYWdlcyc7XHJcblxyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGNvb3JkTWV0YSArPSAnPGRkPicgKyBsYXQgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkdD5Mb25naXR1ZGU6PC9kdD4nO1xyXG4gICAgICAgICAgICBjb29yZE1ldGEgKz0gJzxkZD4nICsgbG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgY29vcmRNZXRhICs9ICc8L2RsPjxidXR0b24gaWQ9XCJyZW1vdmVNYXJrZXJcIiBjbGFzcz1cImJ0biBidG4tZGVmYXVsdCBidG4teHNcIj5SZW1vdmU8L2J1dHRvbj4nO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVtb3ZlQ29vcmRzKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTWFwLm1hcC5yZW1vdmVMYXllcihNYXAudGVtcE1hcmtlcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGF0RmllbGQudmFsKCcnKVxyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKCcnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gc2hvd0Nvb3JkcygpIHtcclxuICAgICAgICAgICAgICAgIGxhdEZpZWxkLnZhbChsYXQpO1xyXG4gICAgICAgICAgICAgICAgbG9uRmllbGQudmFsKGxvbik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJlbW92ZUNvb3JkcygpO1xyXG4gICAgICAgICAgICBzaG93Q29vcmRzKCk7XHJcblxyXG4gICAgICAgICAgICBNYXAudGVtcE1hcmtlciA9IG5ldyBMLm1hcmtlcihldmVudC5sYXRsbmcsIHtcclxuICAgICAgICAgICAgICAgICAgICBpY29uOiBuZXcgTC5JY29uKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWNvblVybDogTWFwLmltYWdlVVJMICsgJy9tYXJrZXItaWNvbi0yeC1ncmVlbi5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkb3dVcmw6IE1hcC5pbWFnZVVSTCArICcvbWFya2VyLXNoYWRvdy5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpY29uU2l6ZTogWzI1LCA0MV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25BbmNob3I6IFsxMiwgNDFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cEFuY2hvcjogWzEsIC0zNF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd1NpemU6IFs0MSwgNDFdXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuYWRkVG8oTWFwLm1hcClcclxuICAgICAgICAgICAgICAgIC5iaW5kUG9wdXAoY29vcmRNZXRhKVxyXG4gICAgICAgICAgICAgICAgLm9wZW5Qb3B1cCgpXHJcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgc2hvd0Nvb3Jkcyk7XHJcblxyXG4gICAgICAgICAgICAkKCcubGVhZmxldC1wb3B1cC1jb250ZW50Jykub24oJ2NsaWNrJywgJyNyZW1vdmVNYXJrZXInLCByZW1vdmVDb29yZHMpO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyTGF5ZXJzOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXAubWFwLmhhc0xheWVyKE1hcC5jb250b3VySlNPTikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5tYXAucmVtb3ZlTGF5ZXIoTWFwLmNvbnRvdXJKU09OKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnN0YXRpb25NYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC5zdGF0aW9uTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLnRlbXBNYXJrZXIpKSB7XHJcbiAgICAgICAgICAgICAgICBNYXAubWFwLnJlbW92ZUxheWVyKE1hcC50ZW1wTWFya2VyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE1hcC5tYXAuaGFzTGF5ZXIoTWFwLmZlYXR1cmVMYXllcikpIHtcclxuICAgICAgICAgICAgICAgIE1hcC5mZWF0dXJlTGF5ZXIuY2xlYXJMYXllcnMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzZXRWaWV3OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgTWFwLm1hcC5zZXRWaWV3KFs0MS4wNSwgLTk1XSwgNCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1hcDtcclxuXHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHJlcXVpcmUoJy4vcHJvZmlsZU1hcC5qcycpO1xyXG5cclxuICAgIHZhciBQcm9maWxlRm9ybSA9IHtcclxuICAgICAgICBiaW5kRXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgJCgnI2Zvcm0tcGFyYW1zJykub24oJ2NsaWNrLnByb2ZpbGVBUEknLCAnW2RhdGEtYXBpPVwicHJvZmlsZVwiXScsIFByb2ZpbGVNYXAuZ2V0RGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBjcmVhdGUgY3VzdG9tIGZpZWxkIElEIGFuZCBmb3IgYXR0cmlidXRlIHZhbHVlc1xyXG4gICAgICAgICAgICAkKCcjZnJtLXByb2ZpbGUnKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ2xhYmVsJykuZWFjaChmdW5jdGlvbihpbmRleCwgZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9ICQoZWwpLmF0dHIoJ2ZvcicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAkKGVsKS5hdHRyKCdmb3InLCAncHJvZmlsZS0nICsgYXR0clZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnW2lkXScpLmVhY2goZnVuY3Rpb24oaW5kZXgsIGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlkVmFsID0gJChlbCkuYXR0cignaWQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgJChlbCkuYXR0cignaWQnLCAncHJvZmlsZS0nICsgaWRWYWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRQYXJhbXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAvLyBnZXQgcGFyYW1ldGVycyAoZm9ybSBmaWVsZHMpIGZyb20gU3dhZ2dlciBKU09OXHJcbiAgICAgICAgICAgICQuYWpheCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdqc29uL2FwaS1wcm9maWxlLmpzb24nLFxyXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBcIkdFVFwiLFxyXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJhbXNEYXRhID0gZGF0YS5wYXRoc1snL3Byb2ZpbGUue2Zvcm1hdH0nXS5nZXQucGFyYW1ldGVycztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgUHJvZmlsZUZvcm0uY3JlYXRlVGVtcGxhdGUocGFyYW1zRGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gJCgnI2FwaUZvcm0tdGVtcGxhdGUnKS5odG1sKCk7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZSwgZmllbGRzZXRIVE1MO1xyXG5cclxuICAgICAgICAgICAgdGVtcGxhdGUgPSBIYW5kbGViYXJzLmNvbXBpbGUoc291cmNlKTtcclxuXHJcbiAgICAgICAgICAgIGZpZWxkcy5wYXJhbXMgPSBkYXRhO1xyXG4gICAgICAgICAgICBmaWVsZHNldEhUTUwgPSB0ZW1wbGF0ZShmaWVsZHMpO1xyXG4gICAgICAgICAgICAkKCcjZnJtLXByb2ZpbGUnKS5hcHBlbmQoZmllbGRzZXRIVE1MKTtcclxuXHJcbiAgICAgICAgICAgIFByb2ZpbGVGb3JtLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gUHJvZmlsZUZvcm07XHJcbn0oKSk7XHJcbiIsIihmdW5jdGlvbigpIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICB2YXIgQVBJTWFwID0gcmVxdWlyZSgnLi9hcGlNYXAuanMnKTtcclxuXHJcbiAgICB2YXIgUHJvZmlsZU1hcCA9IHtcclxuXHJcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9maWxlQVBJID0gJy4vcHJvZmlsZS5qc29uPyc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBwcm9maWxlQVBJICs9ICQoJy5maWVsZHMtcHJvZmlsZScpLmZpbmQoJ2lucHV0LCBzZWxlY3QnKS5zZXJpYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIEFQSU1hcC5nZXRUb29sdGlwTWV0YSA9IFByb2ZpbGVNYXAuZ2V0VG9vbHRpcE1ldGE7XHJcblxyXG4gICAgICAgICAgICBBUElNYXAuZ2V0RGF0YShwcm9maWxlQVBJKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFRvb2x0aXBNZXRhOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgIHZhciBoYWF0TWV0YSA9ICc8ZGwgY2xhc3M9XCJkbC1wcm9maWxlIGRsLWhvcml6b250YWxcIj4nO1xyXG4gICAgICAgICAgICB2YXIgZGF0YVByb2ZpbGUgPSBkYXRhLmZlYXR1cmVzWzBdLnByb3BlcnRpZXM7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGR0PkF2ZXJhZ2UgRWxldmF0aW9uOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuYXZlcmFnZV9lbGV2YXRpb24gKyAnICcgKyBkYXRhUHJvZmlsZS51bml0ICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5MYXRpdHVkZTo8L2R0Pic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZGQ+JyArIGRhdGFQcm9maWxlLmxhdCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+TG9uZ2l0dWRlOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUubG9uICsgJzwvZGQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkdD5BemltdXRoOjwvZHQ+JztcclxuICAgICAgICAgICAgaGFhdE1ldGEgKz0gJzxkZD4nICsgZGF0YVByb2ZpbGUuYXppbXV0aCArICc8L2RkPic7XHJcbiAgICAgICAgICAgIGhhYXRNZXRhICs9ICc8ZHQ+RGF0YSBTb3VyY2U6PC9kdD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPGRkPicgKyBkYXRhUHJvZmlsZS5lbGV2YXRpb25fZGF0YV9zb3VyY2UgKyAnPC9kZD4nO1xyXG4gICAgICAgICAgICBoYWF0TWV0YSArPSAnPC9kbD4nO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGhhYXRNZXRhO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gUHJvZmlsZU1hcDtcclxuICAgIFxyXG59KCkpO1xyXG4iXX0=
