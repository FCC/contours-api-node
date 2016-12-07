(function() {
    'use strict';

    var ContourMap = require('./contourMap.js');

    var OPIFContourForm = {
        bindEvents: function() {
            var opifForm = $('#frm-contoursOPIF');
            var inputTypeFields = opifForm.find('input').closest('div').not(':eq(3), :eq(4)');

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
            
            // add default option to Curve field
            $('#ent-curve').prepend('<option value="" selected></option>');

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
