(function($, document, window, viewport) {
  $(function () {
    // IE10 Win8 fix for viewport width
    if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
      var msViewportStyle = document.createElement('style')
      msViewportStyle.appendChild(
        document.createTextNode(
          '@-ms-viewport{width:auto!important}'
        )
      )
      document.querySelector('head').appendChild(msViewportStyle)
    }

    $site_header = $('.site-header');
    $header_dropdown = $('.site-header .dropdown');
    $header_dropdown.on('show.bs.dropdown', function () {
      $site_header.addClass('dropdown-open');
    });
    $header_dropdown.on('hide.bs.dropdown', function () {
      $site_header.removeClass('dropdown-open');
    });

    // Slideout menu
    $('[data-toggle="offcanvas"]').click(function () {
      if ($(this).attr('data-toggle-direction') == 'top') {
        $('.row-offcanvas').toggleClass('active-top');
        $('.row-offcanvas').removeClass('active-right');
      }
      else {
        $('.row-offcanvas').toggleClass('active-right');
        $('.row-offcanvas').removeClass('active-top');
      }
    });

    // Set slideout menu height
    $window_height = $(window).height();
    $primary_menu_height = $('#menu-primary').height();
    $secondary_menu_height = $('.row-offcanvas-right.active-right .menu-secondary').height($window_height - $primary_menu_height);

    // Select dropdowns
    //$('.selectpicker').selectpicker();

    $top_margin = $('.col-featured').height();
    $access_now_col = $('.col-access-now');
    $access_now_col.css('top', $top_margin);

    // Access now see more link
    $('.block-access-now .read-more').on('click', function(event) {
      $expand_link = $(this);
      event.preventDefault();
      $access_now_block = $('.block-access-now');
      $access_now_parent = $('.block-access-now', $access_now_col).parent();

      $access_now_parent.toggleClass('open');

      // Controls easing animation for expanding container
      if ($access_now_parent.hasClass('open')) {
        // Hide file links
        $('.block-file-links', $access_now_col).parent().toggleClass('visible-xs');

        // Set current width so it doesn't resize with container
        $('.access-now-left', $access_now_block).width($('.access-now-left', $access_now_block).width());

        // Resize parent container
        $('.block-access-now', $access_now_col).parent().toggleClass('col-sm-6 col-sm-12', 500, 'swing', function() {
          // Swap text
          $('.block-header', $access_now_block).toggleClass('show-more show-less');

          // Show right side
          $('.access-now-right', $access_now_block).toggle();

          // Resize left side of expanded access block
          $('.access-now-left', $access_now_block).toggleClass('col-sm-12 col-sm-6');
          $('.access-now-left', $access_now_block).css('width','');
        });
      }
      else {
        // Set current width so it doesn't resize with container
        $('.access-now-left', $access_now_block).width($('.access-now-left', $access_now_block).width());

        // Hide right side
        $('.access-now-right', $access_now_block).toggle();

        // Resize parent container
        $('.block-access-now', $access_now_col).parent().toggleClass('col-sm-6 col-sm-12', 1000, 'swing', function() {
          // Swap text
          $('.block-header', $access_now_block).toggleClass('show-more show-less');

          // Resize left side of expanded access block
          $('.access-now-left', $access_now_block).toggleClass('col-sm-12 col-sm-6');
          $('.access-now-left', $access_now_block).css('width','');

          // Show file links
          $('.block-file-links', $access_now_col).parent().toggleClass('visible-xs');
        });
      }
    });

    // List block active on link hover
    $list_heading = $('.list-block-hover .block-list-item').not('.leader-name, .file-link');
    $list_heading.hover( function () {
      $(this).toggleClass('block-list-item-hover');
    });

    // Special handling for file links
    $list_heading = $('.list-block-hover .block-list-item.file-link > a');
    $list_heading.hover( function () {
      $(this).parent().toggleClass('block-list-item-hover');
    });

    // Special handling for leadership hovering
    $list_heading = $('#leadership-carousel .block-list-item');
    $list_heading.hover( function () {
      if ($('#leadership-carousel').hasClass('carousel-off')) {
        $(this).closest('.block-list-item').toggleClass('block-list-item-hover');
      }
    });

    // List group secondary content carousel
    $list_group_carousel = $('.carousel');
    $list_group_carousel_inner = $list_group_carousel.find('.carousel-inner');
    $list_group_next = $('.block-list-content-next');
    $list_group_prev = $('.block-list-content-prev');

    $list_group_carousel.carousel({
      'interval': false,
      'wrap': false
    });
    $list_group_next.click (function (e) {
      e.preventDefault()
      $(this).closest($list_group_carousel).carousel('next');
    });
    $list_group_prev.click (function (e) {
      e.preventDefault()
      $(this).closest($list_group_carousel).carousel('prev');
    });

    // Adjust carousel height when the slide transition starts to keep text
    // from getting cut off and make the transition smoother
    $list_group_carousel.on('slide.bs.carousel', function () {
      $list_group_carousel_inner = $(this).find('.carousel-inner');
      $current_height = $list_group_carousel_inner.children('.active').height();
      $list_group_carousel_inner.height($current_height);
      $next_height = $list_group_carousel_inner.children('.item:not(.active)').height();
      $list_group_carousel_inner.height($next_height);
    });

    $(window).bind('resize', function() {
      var $navbar = $('.navbar');
      var $page_content = $('.page-content');
      viewport.changed(function() {
        if (viewport.is('md') || viewport.is('lg')) {
          $window_width = $(window).width();
          $menu_width = $('.navbar-primary .container').innerWidth();
          $dropdown_margin = ($menu_width - $window_width)/2;
          $dropdown_menu = $('.site-header .dropdown-menu');
          $dropdown_menu.width($window_width);
          $('.site-header .dropdown-left .dropdown-menu').css('margin-left', $dropdown_margin);
          $('.site-header .dropdown-right .dropdown-menu').css('margin-right', $dropdown_margin);
          if ($navbar.hasClass('navbar-fixed-top')) {
            $navbar.addClass('navbar-static-top').removeClass('navbar-fixed-top');
            $page_content.css('padding-top', '');
          }
        }
        if (viewport.is('xs') || viewport.is('sm')) {
          $('.site-header .dropdown .dropdown-menu').css({'margin': '0', 'width': '100%'});
          if ($navbar.hasClass('navbar-static-top')) {
            $navbar.addClass('navbar-fixed-top').removeClass('navbar-static-top');
            $page_content.css('padding-top', $navbar.height() * 1.5);
          }
        }
        if ( viewport.is('xs') ) {
          // Remove nav search bar placeholder text for small screens
          $('#search-form-header input').attr('placeholder', '');
          // Leadership carousel activation for small sceens
          $('#leadership-carousel').removeClass('carousel-off').carousel({
            interval: false,
            wrap: true
          });
          $('#leadership-carousel-inner').addClass('carousel-inner');
        }
        else {
          // Replace nav search bar placeholder text for large screens
          $('#search-form-header input').attr('placeholder', 'Search');
          // Leadership carousel deactivation for large sceens
          $('#leadership-carousel').addClass('carousel-off');
          $('#leadership-carousel-inner').removeClass('carousel-inner');
        }

        // Manually set megamenu width so it takes up full screen
        //$('#menu-secondary .dropdown-menu').css('width', $(window).width());
      })
    }).trigger('resize');

    // Leadership individual page changing content with mobile select dropdown
    $('.page-leadership-staff #select-page').on('change', function() {
      var tab = $(this).val();
      $('.menu-leadership a[href="#' + tab + '"]').tab('show')
    });

    // Leadership individual page make sure dropdown is synced with active tab
    $('.menu-leadership a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      var active_tab = e.target.href.split('#')[1];
      $('.page-leadership-staff #select-page').val(active_tab);
    })

    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })

    // Setup focus for mobile navigation search button
    $('.btn-toggle-search').click(function() {
      $('#search-text').focus();
    });

    // Setup mobile blog filter button
    $('.blog-filter-btn').click(function() {
      $('.blog-filters').toggle();
      $(this).toggleClass('open');
    });

    // Add ability to cycle through tabs in mobile
    $('.block-transactions .tab-prev').click(function(e) {
      e.preventDefault();

      var tabs = $('.block-transactions .nav-tabs li'),
        active = tabs.filter('.active'),
        prev = active.prev('li'),
        toClick = (prev[0] != tabs.eq(0)[0]) ? prev.find('a') : tabs.eq(3).find('a');

      toClick.trigger('click');
    });
    $('.block-transactions .tab-next').click(function(e) {
      e.preventDefault();

      var tabs = $('.block-transactions .nav-tabs li'),
        active = tabs.filter('.active'),
        next = active.next('li'),
        toClick = (next[0] != tabs.eq(4)[0]) ? next.find('a') : tabs.eq(1).find('a');

      toClick.trigger('click');
    });

    // Keep "Read More" caret with last word
    $read_more = $('.read-more-arrow');
    $read_more.each(function () {
      $read_more_text = $(this).text().trim().split(' ');
      $last_word = ' <span class="read-more-last-word">';
      $last_word += $read_more_text.pop();
      $last_word += '<span class="read-more-caret"></span></span>';
      $(this).html($read_more_text.join(' ') + $last_word);
    });

  });
})(jQuery, document, window, ResponsiveBootstrapToolkit);

// Accordian expand / Collapse All
$('.accordion-expand-collapse-all').click(function(e){
  e.preventDefault;
  var target = $(this).attr('href');
  console.log(target);
  if ( $(this).hasClass('expanded') ) {
    $(target).find('.panel-collapse').collapse('hide');
    $(this).removeClass('expanded');
  } else {
    $(target).find('.panel-collapse').collapse('show');
    $(this).addClass('expanded');
  }
})