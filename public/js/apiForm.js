(function() {
    'use strict';

    window.APIForm = {
        init: function() {

        },
        bindEvents: function() {
            var apiType = $('#btn-getAPI').attr('data-api');

            $('#apiType').on('change', APIForm.switchForm);
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

            Map.clearLayers();
            Map.resetView();
        },
        showError: function() {
            if ($('.alert').is(':hidden')) {
                $('.alert').slideDown();
            }

            Map.clearLayers();
            Map.resetView();
        }
    };

    APIForm.bindEvents();

}());
