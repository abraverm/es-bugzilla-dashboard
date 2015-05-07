/**
 * Created by abraverm on 5/8/15.
 */

var Bugzilla = angular.module('bugzilla', []);

Bugzilla.controller('bugzilla.controller',function ($scope, $log) {
    $log.debug('Starting bugzilla controller');
    $scope.graphs = [];
});

// All Bugs
Bugzilla.controller('bugzilla.graphAllBugs',function ($scope, $log, EsService) {
    $log.debug('Starting bugzilla.graphAllBugs controller');
    $scope.graphs.push({"name": "All Bugs"})
    $scope.graphAllBugs = {};
    $scope.graphAllBugs.data = {
        "cols": [
            {id: "x", label: "Date", type: "date"},
            {id: "count", label: "Number of Bugs", type: "number"}
        ],
        "rows": EsService.search(QUERY, "bydate", "x", "count")};
    $scope.graphAllBugs.type = 'LineChart';
});


Bugzilla.factory('EsService', function($log, esFactory, config) {
    function ElasticsearchService() {
        $log.debug('Starting Elasticsearch Service');
        if (config.debug){
            var es = esFactory({host: config.es_host, log: 'trace'});
        } else {
            var es = esFactory({host: config.es_host});
        }
        $log.debug('Connected to Elasticsearch server');

        this.search = function(query, agg, x, y){
            $log.debug('Sending a request to Elasticsearch server');
            $log.debug(query);
            var esData = [];
            es.search(query).then(function (response) {
                $log.debug('Got a response from Elasticsearch server:');
                $log.debug(response);
                $log.debug('Translating Elasticsearch response to C3 data');
                for (var i = 0; i < response.aggregations[agg].buckets.length; ++i) {
                    var datapoint = new Array();
                    datapoint['c'] = [];
                    datapoint['c'].push({ 'v': new Date(response.aggregations[agg].buckets[i].key)});
                    datapoint['c'].push({ 'v': response.aggregations[agg].buckets[i].doc_count});
                    esData.push(datapoint);
                };
                $log.debug('Finished translating Elasticsearch response to C3 data');
                $log.debug('Returning search results data');
            });
            return esData;
        };
    };
    return new ElasticsearchService();
});

Bugzilla.factory('TotalBugsOpenOnRelease', function($log, esFactory, config) {
    function ElasticsearchService() {
        $log.debug('[TotalBugsOpenOnRelease] Starting Elasticsearch Total');
        if (config.debug){
            var es = esFactory({host: config.es_host, log: 'trace'});
        } else {
            var es = esFactory({host: config.es_host});
        }
        $log.debug('[TotalBugsOpenOnRelease] Connected to Elasticsearch server');

        this.search = function(fromDate, toDate, callback){
            var queryOnRelease = {
                "index": "bugzilla",
                "size": 0,
                "search_type": "count",
                "body":
                {
                    "filter": { "and": [
                        { "range": { "@timestamp": { "lt":  fromDate } } },
                        { "range": { "message.cf_last_closed": { "gt":  fromDate } } }
                    ]
                    }

                }
            };
            var queryReleaseLife = {
                "index": "bugzilla",
                "size": 0,
                "body":
                {
                    "query": {
                        "range": { "message.creation_time": {
                            "gte":  fromDate,
                            "lte": toDate
                        }
                    }},
                    "filter": { "range": { "message.creation_time": {
                        "gte":  fromDate,
                        "lte": toDate
                    } } },
                    "aggs": { "date": { "date_histogram": {
                        "field": "@timestamp",
                        "interval": "1M"
                    } } }

                }
            };
            $log.debug('[TotalBugsOpenOnRelease] Sending a request to Elasticsearch server');
            $log.debug(queryOnRelease);
            $log.debug(queryReleaseLife);
            var total = 0 ;
            var esData = [];
            var sum = 0;
            es.search(queryOnRelease).then(function (response) {
                $log.debug('[TotalBugsOpenOnRelease][queryOnRelease] Got a response from Elasticsearch server:');
                $log.debug(response);
                $log.debug('[TotalBugsOpenOnRelease][queryOnRelease] Translating Elasticsearch response');
                total = response.hits.total;
                $log.debug('[TotalBugsOpenOnRelease][queryOnRelease] Returning search results data: '+esData);
                es.search(queryReleaseLife).then(function(response){
                    $log.debug('[TotalBugsOpenOnRelease][queryReleaseLife] Got a response from Elasticsearch server:');
                    $log.debug(response);
                    $log.debug('[TotalBugsOpenOnRelease][queryReleaseLife] Translating Elasticsearch response');
                    for (var i = 0; i < response.aggregations.date.buckets.length; ++i) {
                        sum += response.aggregations.date.buckets[i].doc_count;
                        var datapoint = new Array();
                        datapoint['c'] = [];
                        datapoint['c'].push({ 'v': new Date(response.aggregations.date.buckets[i].key)});
                        datapoint['c'].push({ 'v': ddpFunc(total, sum)});
                        esData.push(datapoint);
                    };
                    callback(esData);
                });
            });
        };

        var ddpFunc = function(total, count){
            return total/(total+count);
        };
    };
    return new ElasticsearchService();
});
// DDP Graph
Bugzilla.controller('bugzilla.graphDDP',function ($scope, $log, EsService, TotalBugsOpenOnRelease) {
    $log.debug('Starting bugzilla.graphNumBugs controller');
    $scope.graphs.push({"name": "DDP"})
    $scope.graphDDP = {};
    TotalBugsOpenOnRelease.search("2002-06-28", "2006-02-20",function(result){
        $scope.graphDDP.data = {
            "cols": [
                {id: "x", label: "Date", type: "date"},
                {id: "count", label: "V2.16", type: "number"}
            ],
            "rows": result};
        });
    $scope.graphDDP.type = 'LineChart';
});

Bugzilla.factory('TotalBugsInRange', function($log, $q, esFactory, config) {
    function ElasticsearchService() {
        $log.debug('[TotalBugsInRange] Starting Elasticsearch Total');
        if (config.debug){
            var es = esFactory({host: config.es_host, log: 'trace'});
        } else {
            var es = esFactory({host: config.es_host});
        }
        $log.debug('[TotalBugsInRange] Connected to Elasticsearch server');

        var opened = function(fromDate,toDate){
            var deferred = $q.defer();
            var query = { "index": "bugzilla", "size": 0, "search_type": "count",
                "body": { "filter": { "range": { "@timestamp": { "gt":  fromDate, "lt":  toDate } } } } };
            es.search(query).then(function(response){
                $log.debug('[TotalBugsInRange] response on request for OPENED');
                $log.debug(response);
                deferred.resolve(response.hits.total);
            });
            return deferred.promise;
        };

        var closed = function(fromDate,toDate){
            var deferred = $q.defer();
            var query = { "index": "bugzilla", "size": 0, "search_type": "count",
                "body": { "filter": { "range": { "message.cf_last_closed": { "gt":  fromDate, "lt":  toDate } } } } };
            es.search(query).then(function(response){
                $log.debug('[TotalBugsInRange] response on request for CLOSED');
                $log.debug(response);
                deferred.resolve(response.hits.total);
            });
            return deferred.promise;
        };

        this.DRE = function(fromDate,toDate){
            var deferred = $q.defer();
            $q.all([closed(fromDate, toDate), opened(fromDate, toDate)]).then(function(results){
                $log.debug(results[0], results[1]);
                var dre = results[0]/results[1];
                if ( dre > 1 ) { dre = 1}
                deferred.resolve(Math.round(dre*100));
            });
            return deferred.promise;
        };
    };
    return new ElasticsearchService();
});
// DRE Graph
Bugzilla.controller('bugzilla.metricDRE',function ($scope,  $q, $log, TotalBugsInRange, $q) {
    $log.debug('Starting bugzilla.metricDRE controller');
    $scope.graphs.push({"name": "DRE"})
    $scope.metricDRE = {};
    $scope.metricDRE.type = "Gauge";
    $scope.metricDRE.options = {
        redFrom: 90, redTo: 100,
        yellowFrom:75, yellowTo: 90,
        minorTicks: 5
    };
    var rDate = { // release Dates
        '2.0': "1998-09-19",
        '2.14': "2001-08-29",
        '2.16': "2002-07-28",
        '2.18': "2005-01-15",
        '2.20': "2005-09-30"
    };
    $log.debug(TotalBugsInRange.DRE(rDate['2.0'],rDate['2.14']));
    $q.all([
        TotalBugsInRange.DRE(rDate['2.0'],rDate['2.14']),
        TotalBugsInRange.DRE(rDate['2.14'],rDate['2.16']),
        TotalBugsInRange.DRE(rDate['2.16'],rDate['2.18']),
        TotalBugsInRange.DRE(rDate['2.18'],rDate['2.20'])
    ]).then(function(dre){
        $scope.metricDRE.data = [
            ['Label', 'Value'],
            ['2.14', dre[0]],
            ['2.16', dre[1]],
            ['2.18', dre[2]],
            ['2.20', dre[3]],
        ];
        $log.debug('bugzilla.graphDRE results');
        $log.debug($scope.metricDRE.data);
    });
});

// SEA Metric
Bugzilla.controller("bugzilla.metricSEA", function ($scope) {

    $scope.metricSEA = {};
    $scope.metricSEA.type = "Gauge";
    $scope.metricSEA.options = {
        redFrom: 90, redTo: 100,
        yellowFrom:75, yellowTo: 90,
        minorTicks: 5
    };

    var diff =  function(from, to){ return Math.floor(( Date.parse(to) - Date.parse(from) ) / (24*60*60*1000))};
    var rDate = { // release Dates
        '2.0': "1998-09-19",
        '2.14': "2001-08-29",
        '2.16': "2002-07-28",
        '2.18': "2005-01-15",
        '2.20': "2005-09-30"
    };

    $scope.metricSEA.data = [
        ['Label', 'Value'],
        ['2.14', Math.round(diff(rDate['2.0'],rDate['2.14'])/(6*30))],
        ['2.16', Math.round(diff(rDate['2.14'],rDate['2.16'])/(6*30))],
        ['2.18', Math.round(diff(rDate['2.16'],rDate['2.18'])/(6*30))],
        ['2.20', Math.round(diff(rDate['2.18'],rDate['2.20'])/(6*30))],
    ];
});

// TRD Metric
Bugzilla.controller("bugzilla.metricTRD", function ($scope) {

    $scope.metricTRD = {};
    $scope.metricTRD.type = "Gauge";
    $scope.metricTRD.options = {
        redFrom: 90, redTo: 100,
        yellowFrom:75, yellowTo: 90,
        minorTicks: 5
    };

    $scope.metricTRD.data = [
        ['Label', 'Value'],
        ['5.0', 80],
        ['4.4', 80],
        ['4.2', 80],
        ['4.0', 80],
    ];
});

// CFD Metric
Bugzilla.controller("bugzilla.metricCFD", function ($scope) {

    $scope.metricCFD = {};
    $scope.metricCFD.type = "Gauge";
    $scope.metricCFD.options = {
        redFrom: 90, redTo: 100,
        yellowFrom:75, yellowTo: 90,
        minorTicks: 5
    };

    $scope.metricCFD.data = [
        ['Label', 'Value'],
        ['5.0', 80],
        ['4.4', 80],
        ['4.2', 80],
        ['4.0', 80],
    ];
});

// Test Case Efficiency Graph
Bugzilla.controller('bugzilla.graphTCE',function ($scope, $log, EsService) {
    $log.debug('Starting bugzilla.graphNumBugs controller');;
    $scope.graphs.push({"name": "TCE"})
    $scope.graphTCE = {};
    $scope.graphTCE.data = {
        "cols": [
            {id: "x", label: "Date", type: "date"},
            {id: "count", label: "Number of Bugs", type: "number"}
        ],
        "rows": EsService.search(QUERY, "bydate", "x", "count")};
    $scope.graphTCE.type = 'LineChart';
    $scope.graphTCE.options = {
        'title': 'Test Case Efficiency'
    }
});
