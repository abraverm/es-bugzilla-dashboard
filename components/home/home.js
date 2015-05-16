/**
 * Created by abraverm on 5/8/15.
 */
var Home = angular.module('home', []);

Home.controller('home.controller',function ($scope, $log, config) {
    $log.debug('Starting home controller');
    $scope.graphs = [];
    $scope.products = config.products;
});

Home.controller('home.graphAllBugs',function ($scope, $log, EsService) {
    $log.debug('Starting home.graphAllBugs controller');
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


Home.factory('EsService', function($log, esFactory, config) {
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
