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
                console.log(serviceVal);

                $('#frm-contoursEnterprise').find('input').val('');
                $('#curve').val(0);
                $('#src').val('ned');
                $('#unit').val('m');

                if (serviceVal === 'fm') {
                    $('label[for="channel"]').removeClass('required');
                    $('#channel').attr('required', false);

                    $('label[for="nradial"]').addClass('required');
                    $('#nradial').attr('nradial', true);

                    $('label[for="rcamsl"]').addClass('required');
                    $('#rcamsl').attr('rcamsl', true);

                    $('label[for="erp"]').addClass('required');
                    $('#erp').attr('erp', true);

                    $('label[for="curve"]').addClass('required');
                    $('#curve').attr('curve', true);

                    $('label[for="frequency"]').removeClass('required');
                    $('#frequency').attr('frequency', false);

                    $('label[for="power"]').removeClass('required');
                    $('#power').attr('power', false);

                    $('label[for="rms"]').removeClass('required');
                    $('#rms').attr('rms', false);

                    $('label[for="pattern"]').removeClass('required');
                    $('#pattern').attr('pattern', false);

                } else if (serviceVal === 'tv') {
                    $('label[for="channel"]').addClass('required');
                    $('#channel').attr('required', true);

                    $('label[for="nradial"]').addClass('required');
                    $('#nradial').attr('nradial', true);

                    $('label[for="rcamsl"]').addClass('required');
                    $('#rcamsl').attr('rcamsl', true);

                    $('label[for="erp"]').addClass('required');
                    $('#erp').attr('erp', true);

                    $('label[for="curve"]').addClass('required');
                    $('#curve').attr('curve', true);

                    $('label[for="frequency"]').removeClass('required');
                    $('#frequency').attr('frequency', false);

                    $('label[for="power"]').removeClass('required');
                    $('#power').attr('power', false);

                    $('label[for="rms"]').removeClass('required');
                    $('#rms').attr('rms', false);

                    $('label[for="pattern"]').removeClass('required');
                    $('#pattern').attr('pattern', false);

                } else {
                    $('label[for="channel"]').removeClass('required');
                    $('#channel').attr('required', false);

                    $('label[for="nradial"]').removeClass('required');
                    $('#nradial').attr('nradial', false);

                    $('label[for="rcamsl"]').removeClass('required');
                    $('#rcamsl').attr('rcamsl', false);

                    $('label[for="erp"]').removeClass('required');
                    $('#erp').attr('erp', false);

                    $('label[for="curve"]').removeClass('required');
                    $('#curve').attr('curve', false);

                    $('label[for="frequency"]').addClass('required');
                    $('#frequency').attr('frequency', true);

                    $('label[for="power"]').addClass('required');
                    $('#power').attr('power', true);

                    $('label[for="rms"]').addClass('required');
                    $('#rms').attr('rms', true);

                    $('label[for="pattern"]').addClass('required');
                    $('#pattern').attr('pattern', true);
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
