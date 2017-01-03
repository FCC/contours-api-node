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
                errMsg = data.responseJSON.statusMessage;
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
