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
        showError: function() {
            $('#modal-loading').modal('hide');

            $('.alert').hide('fast');
            $('.alert').slideDown();

            APIResponse.clear();                     
        }
    };

    module.exports = APIForm;

}());
