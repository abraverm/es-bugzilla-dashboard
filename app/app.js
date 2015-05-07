'use strict';
// dashboard dependencies
// Initialize dashboard and required modules
var app = angular.module('dashboard', [ 'ngRoute', 'oc.lazyLoad', 'ui.bootstrap']);

// Constants
app.constant('config', {
    appName: 'Dashboard',
    appVersion: '0.0.1' ,
    debug: true,
    es_host: 'http://elasticsearch-abraverm.rhcloud.com/elasticsearch',
    products: ['Bugzilla']
});

// Log configuration
app.config( function($logProvider, config){
    $logProvider.debugEnabled(config.debug);
});

// Dashboard controller
app.controller('dashboard.controller',function ($scope, $log, config) {
    $log.debug('Starting dashboard controller');
    $scope.products = config.products;
});

// Navigation bar controller

// Link modules to required files
app.config(function($ocLazyLoadProvider, config) {
    $ocLazyLoadProvider.config({
        // Debug ocLazyLoad
        debug: config.debug,
        // main application module
        loadedModules: ['dashboard'],
        // defining loaded modules and association to their dependencies
        modules: [
            {
                name: 'elasticsearch',
                files: ['../bower_components/elasticsearch/elasticsearch.angular.min.js'],
                cache: true
            },
            {
                name: 'ng-google-chart',
                files: [
                    '../bower_components/angular-google-chart/ng-google-chart.js'
                ],
                cache: true
            },
            {
                name: 'home',
                files: ['components/home/home.js', 'components/home/query.js'],
                cache: false
            },
            {
                name: 'bugzilla',
                files: ['components/bugzilla/bugzilla.js', 'components/bugzilla/query.js'],
                cache: false
            }
    ]

    });
});

// Set log configuration


// View configuration
app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/home', {
                templateUrl: 'components/home/home.html',
                controller: 'home.controller',
                resolve: {
                    loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                        return $ocLazyLoad.load(['home', 'elasticsearch', 'ng-google-chart']);
                    }]
                }
            }).
            when('/Bugzilla', {
                templateUrl: 'components/bugzilla/bugzilla.html',
                controller: 'bugzilla.controller',
                resolve: {
                    loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                        return $ocLazyLoad.load(['bugzilla', 'elasticsearch', 'ng-google-chart']);
                    }]
                }
            }).
            otherwise({
                redirectTo: '/home'
            });
    }]);


MathJax.Hub.Config({
    AsciiMath: {
        fixphi: true,
        useMathMLspacing: true,
        displaystyle: true,
        decimalsign: "."
    },
    tex2jax: {
        inlineMath: [
            ['$', '$'],
            ['\\(', '\\)']
        ]
    },
    "HTML-CSS": {
        linebreaks: {
            automatic: false,
            width: "container"
        }
    },
    extensions: ['asciimath2jax.js'],
    jax: ['input/TeX', 'input/AsciiMath', 'output/HTML-CSS']
});
