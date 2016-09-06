(function() {
    'use strict';

    var Map = require('./map.js');
    var APIResponse = require('./apiResponse.js');

    var APIForm = {
        bindEvents: function() {
            var apiType = $('#btn-getAPI').attr('data-api');

            $('#apiType').on('change', this.switchForm);
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
            $('.alert').hide('fast');
            $('.alert').slideDown();

            APIResponse.clear();

            Map.clearLayers();
            Map.resetView();
        }
    };

    module.exports = APIForm;

}());
