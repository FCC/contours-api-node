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

            // add default option to src field
            $('#src').prepend('<option value="" selected></option>');

            $('#pop [value="false"]').attr('selected', true);
            $('#area [value="false"]').attr('selected', true);

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
