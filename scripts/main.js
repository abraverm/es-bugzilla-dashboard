define(['scripts/d3.v3', 'scripts/elasticsearch', 'scripts/c3/c3'], function (d3, elasticsearch) {

    "use strict";
    var client = new elasticsearch.Client({
            host: 'http://elasticsearch-abraverm.rhcloud.com/elasticsearch',
            log: 'trace'
    });

    client.search({
        index: 'bugzilla',
        size: 0,
        body:
        {
            // Begin query.
            query: {
                query_string: {
                    query: "*",
                    analyze_wildcard: true
                }
            },
            filter: {
                bool: {
                  must: [
                    {
                      range: {
                        "@timestamp": {
                          gte: 925506000000,
                          lte: 942848565206
                        }
                      }
                    }
                  ],
                  must_not: []
                }
            },
            // Aggregate on the results
            aggs: {
                bydate: {
                    date_histogram: {
                        "field": "@timestamp",
                        "interval": "1M",
                        "pre_zone": "+03:00",
                        "pre_zone_adjust_large_interval": true,
                        "min_doc_count": 1,
                    }
                }
            }
        }
    }).then(function (resp) {
            console.log(resp);
            var bugs_date = ['date'];
            var bugs_count = ['count'];
            for (var i=0; i<resp.aggregations.bydate.buckets.length; ++i) {
                  bugs_date.push(resp.aggregations.bydate.buckets[i].key);
                  bugs_count.push(resp.aggregations.bydate.buckets[i].doc_count);
                }
            var chart = c3.generate({
                bindto: '#chart',
                data: {
                        x: 'date',
                        columns: [ bugs_date, bugs_count ]
                },
                axis: {
                  x: {
                    type: 'timeseries',
                    tick: {
                        format: '%Y-%m'
                    }
                  }
                }
            });
    });
});
