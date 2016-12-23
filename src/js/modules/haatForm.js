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

            // add default option to src fields
            $('#haat-src').prepend('<option value="" selected></option>');
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
