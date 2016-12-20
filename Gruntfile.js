'use strict';

module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);
    require('grunt-browserify')(grunt);

    // Configurable paths
    var paths = {
        tmp: '.tmp',
        src: './src',
        assets: './public'
    };

    grunt.initConfig({

        // Project settings
        paths: paths,
        config: { version: '1.0.0' },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            less: {
                files: ['./src/bootstrap-gisp/less/**/*.less'],
                tasks: ['less', 'usebanner', 'postcss', 'copy']
            },
            scripts: {
                files: ['<%= paths.src %>/js/main.js', '<%= paths.src %>/js/modules/**/*.js'],
                tasks: ['jshint', 'concat', 'browserify:dev']
            }
        },

        // Lint LESS
        lesslint: {
            src: ['.src/bootstrap-gisp/less/**/*.less'],
            options: {
                csslint: {
                    'box-model': false,
                    'adjoining-classes': false,
                    'qualified-headings': false,
                    'empty-rules': false,
                    'outline-none': false,
                    'unique-headings': false
                }
            }
        },

        // Lint JS
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= paths.assets %>/js/main.js',
                '<%= paths.assets %>/js/modules/**/.*.js'
            ]
        },

        // LESS -> CSS
        less: {
            options: {
                paths: ['bootstrap-gisp/less', 'bower_components'],
                compress: true,
                sourceMap: false
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: './src/bootstrap-gisp/less',
                    src: ['gisp-theme.less'],
                    dest: '<%= paths.assets %>/css/',
                    ext: '.min.css'
                }]
            }
        },

        // Add vendor prefixed styles to CSS
        postcss: {
            options: {
                map: {
                    inline: false
                },
                processors: [
                    require('autoprefixer')({ browsers: ['last 4 version'] })
                ]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= paths.assets %>/css/',
                    src: '{,*/}*.css',
                    dest: '<%= paths.assets %>/css/'
                }]
            }
        },

        // Bundle Bootstrap plugins
        concat: {
            pluginsjs: {
                src: [
                    // 'bower_components/bootstrap/js/affix.js',
                    // 'bower_components/bootstrap/js/alert.js',
                    //'bower_components/bootstrap/js/dropdown.js',
                    //'bower_components/bootstrap/js/tooltip.js',
                    'bower_components/bootstrap/js/modal.js'
                    //'bower_components/bootstrap/js/transition.js'
                    // 'bower_components/bootstrap/js/button.js',
                    // 'bower_components/bootstrap/js/popover.js',
                    // 'bower_components/bootstrap/js/carousel.js',
                    // 'bower_components/bootstrap/js/scrollspy.js',
                    // 'bower_components/bootstrap/js/collapse.js'
                    // 'bower_components/bootstrap/js/tab.js',
                ],
                dest: './public/js/vendor/bootstrap.min.js'
            }
        },

        // Add a banner to the top of the generated LESS file.
        usebanner: {
            taskName: {
                options: {
                    position: 'top',
                    banner: '/* FCC GIS Theme v<%= config.version %> | http://fcc.github.io/design-standards/ */\n\n',
                    linebreak: true
                },
                files: {
                    src: ['<%= paths.assets %>/css/gisp-theme.min.css'],
                }
            }
        },

        browserify: {
            options: {
                browserifyOptions: {
                    debug: true
                }
            },
            dev: {
                src: ['<%= paths.src %>/js/main.js'],
                dest: '<%= paths.assets %>/js/app.js'
            },
            prod: {
                options: {
                    browserifyOptions: {
                        debug: false
                    }
                },
                src: ['<%= paths.src %>/js/main.js'],
                dest: '<%= paths.assets %>/js/app.js'
            }
        },

        uglify: {
            options: {
                mangle: {
                    except: ['jQuery', 'Handlebars']
                },
                sourceMap: false
            },
            my_target: {

                files: {
                    '<%= paths.assets %>/js/app.min.js': ['<%= paths.assets %>/js/app.js']
                }
            }
        },

        'string-replace': {
            dev: {
                src: '<%= paths.assets %>/contour-demo.html',
                dest: '<%= paths.assets %>/',
                options: {
                    replacements: [{
                        pattern: 'app.min.js',
                        replacement: 'app.js'
                    }]
                }
            },
            prod: {
                src: '<%= paths.assets %>/contour-demo.html',
                dest: '<%= paths.assets %>/',
                options: {
                    replacements: [{
                        pattern: 'app.js',
                        replacement: 'app.min.js'
                    }]
                }
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                files: [

                    { // fonts 
                        dot: true,
                        expand: true,
                        cwd: 'bower_components/font-awesome/fonts',
                        src: '**',
                        dest: '<%= paths.assets %>/fonts'
                    }
                ]
            }
        },
        clean: {
            release: ['<%= paths.assets %>/js/app.js', '<%= paths.assets %>/css/*.map']
        }
    });

    grunt.registerTask('build', [
        'jshint',
        'less',
        'usebanner',
        'postcss',
        'concat',
        'browserify:dev',
        'string-replace:dev'
    ]);

    grunt.registerTask('build:release', [
        'jshint',
        'less',
        'usebanner',
        'postcss',
        'concat',
        'browserify:prod',
        'uglify',
        'string-replace:prod',
        'clean:release'
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};
