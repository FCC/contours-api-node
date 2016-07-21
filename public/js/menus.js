(function($, document, window, viewport) {
  $(function () {
    $('.expand-tertiary').click(function (e) {
        e.preventDefault();

        var parent_menu = $(this).parents('.top-level-menu, .tertiary-menu');
        var selected_menu = e.target.href.split('#')[1];

        parent_menu.hide("slide", { direction: "left" }, 500, function(){
          $("#" + selected_menu).show("slide", { direction: "right"}, 500);
        });

    });

    $('.collapse-tertiary').click(function (e) {
        e.preventDefault();

      var parent_menu = $(this).parents('.top-level-menu, .tertiary-menu');
      var selected_menu = e.target.href.split('#')[1];

      parent_menu.hide("slide", { direction: "right" }, 500, function(){
        $("#" + selected_menu).show("slide", { direction: "left"}, 500);
      });
    });

    // var $navbar = $('.navbar');
    // $('.navbar-secondary li.dropdown').mouseenter(function(){
    //   if (!isMobileLayout()) {
    //     $(this).addClass('open');
    //   }
    // }).mouseleave(function(){
    //   $(this).removeClass('open');
    // })
    // $('.navbar-secondary li.dropdown > a.dropdown-toggle').click(function() {
    //   if (!isMobileLayout()) {
    //     window.location = this.href;
    //   }
    // });
    
    // function isMobileLayout() {
    //   if ($navbar.hasClass('navbar-static-top')) {
    //     return false;
    //   } else {
    //     return true;
    //   }
    // }

  });
})(jQuery, document, window, ResponsiveBootstrapToolkit);