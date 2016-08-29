'use strict';

module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);
    require('grunt-browserify')(grunt);

    // Configurable paths
    var paths = {
        tmp: '.tmp',
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
                tasks: ['less', 'usebanner', 'autoprefixer', 'copy']
            },
            scripts: {
                files: ['<%= paths.assets %>/js/main.js', '<%= paths.assets %>/js/modules/**/*.js'],
                tasks: ['jshint', 'browserify:dev']
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
                sourceMap: true
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
        autoprefixer: {
            options: {
                browsers: ['> 4%', 'last 4 versions']
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
                src: ['<%= paths.assets %>/js/main.js'],
                dest: '<%= paths.assets %>/js/app.js'
            },
            production: {
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                },
                src: '<%= browserify.dev.src %>',
                dest: '<%= paths.assets %>/js/app.js'
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
        }
    });

    grunt.registerTask('build', [
        'jshint',
        'less',
        'usebanner',
        'autoprefixer',
        'browserify:dev'        
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};
