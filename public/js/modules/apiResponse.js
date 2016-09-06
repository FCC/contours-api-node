(function() {
    'use strict';

    var Map = require('./map.js');

    var APIResponse = {

        display: function(data) {
            // display JSON next to map

            $('.apiResponse__out code').text(JSON.stringify(data, null, 2));
            $('pre code').each(function(i, block) {
                hljs.highlightBlock(block);
            });

            $('.apiResponse__dwnld')
                .attr('href', Map.url)
                .removeClass('hide');
        },

        clear: function() {
            $('.apiResponse__out code').text('');
            $('.apiResponse__dwnld').addClass('hide');
        }
    };

    module.exports = APIResponse;

}());
