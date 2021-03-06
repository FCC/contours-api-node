(function() {
    'use strict';

    var ContourMap = require('./contourMap.js');

    var EntityForm = {
        bindEvents: function() {
            var entityForm = $('#frm-entity');
            var inputTypeFields = entityForm.find('input').closest('div').not(':eq(3), :eq(4)');

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

            entityForm.find('div').eq(0).after(selectTpl);

            // hide Input Type fields by default
            inputTypeFields.hide();
            

            // display Input Type options based on selection
            entityForm.on('change', '.js-inputType', function() {
                inputTypeFields.hide();
                $('#' + this.value).closest('div').slideDown();
            });

            // create custom field ID and for attribute values
            entityForm
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
                .find('select').eq(0).addClass('js-entity');

            // reset fields to default values when Service or Input Type changes
            entityForm.on('change', '.js-entity, .js-inputType', function() {
                entityForm
                    .find('input').val('')
                    .end()
                    .find('select:gt(1)').each(function(index, el) {
                        el.value = index === 3 ? 'ned' : 'false';
                    });                
            });

            // hide Input Type fields except Call Sign when Service Type changes
            entityForm.on('change', '.js-entity', function() {
                $('.js-inputType').val('ent-callsign');
                inputTypeFields.hide();
                $('#ent-callsign').closest('div').slideDown();
            });

            // show Call Sign field as default
            $('#ent-callsign').closest('div').slideDown(); 

            // indicate required fields
            $('label[for="ent-callsign"], label[for="ent-facilityId"], label[for="ent-applicationId"]').addClass('required');

            $('#ent-pop [value="false"]').attr('selected', true);
            $('#ent-area [value="false"]').attr('selected', true);
            
            // add default option to Curve and src fields
            $('#ent-curve, #ent-src').prepend('<option value="" selected></option>');

            $('#form-params').on('click.entityAPI', '[data-api="entity"]', ContourMap.getContour);

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

                    EntityForm.createTemplate(paramsData);
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

            $('#frm-entity').append(fieldsetHTML);

            EntityForm.bindEvents();
        }
    };

    module.exports = EntityForm;

}());
