var QUERY = {
    "index": "bugzilla",
    "size": 0,
    "body":
    {
        "query": {
            "query_string": {
                "query": "*",
                    "analyze_wildcard": true
            }
        },
        "filter": {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": 925506000000,
                                "lte": 942848565206
                            }
                        }
                    }
                ],
                    "must_not": []
            }
        },
        "aggs": {
            "bydate": {
                "date_histogram": {
                    "field": "@timestamp",
                        "interval": "1M",
                        "pre_zone": "+03:00",
                        "pre_zone_adjust_large_interval": true,
                        "min_doc_count": 1
                }
            }
        }
    }
};