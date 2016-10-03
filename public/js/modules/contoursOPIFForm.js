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
