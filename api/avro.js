const avro = require('avsc');
const avroMap = {
  "beginSession": {
  "type": "record",
  "name": "BeginSessionRaw",
  "doc": "BeginSessionRaw",
  "fields": [
  {"name": "app_key", "type": "string"},
  {"name": "device_id", "type": "string"},
  {"name": "timestamp", "type": "long"},
  {"name": "tz", "type": "string"},
  {"name": "metrics", "type": {
    "type": "record",
    "name": "Metrics",
    "fields": [
      {"name": "_device", "type": "string"},
      {"name": "_os", "type": "string"},
      {"name": "_os_version", "type": "string"},
      {"name": "_carrier", "type": "string"},
      {"name": "_resolution", "type": "string"},
      {"name": "_density", "type": "string"},
      {"name": "_locale", "type": "string"},
      {"name": "_app_version", "type": "string"}
    ]}
  },
  {"name": "vendor_info", "type": {
    "type": "record",
    "name": "VendorInfo",
    "fields": [
      {"name": "sr_no_ori", "type": "string"},
      {"name": "sr_no_cur", "type": "string"}
    ]}
  },
  {"name": "sdk_version", "type": "float"},
  {"name": "begin_session", "type": "int"},
  {"name": "qmwd_active_user", "type": "int"},
  {"name": "session_id", "type": "long"}
  ]
},
  "endSession": {
  "type": "record",
  "namespace" : "com.perfectcorp.countly.schema",
  "name": "EndSessionRaw",
  "doc": "EndSessionRaw",
  "fields": [
  {"name": "app_key", "type": "string"},
  {"name": "device_id", "type": "string"},
  {"name": "timestamp", "type": "long"},
  {"name": "tz", "type": "string"},
  {"name": "metrics", "type": {
    "type": "record",
    "name": "Metrics",
    "fields": [
      {"name": "_device", "type": "string"},
      {"name": "_os", "type": "string"},
      {"name": "_os_version", "type": "string"},
      {"name": "_carrier", "type": "string"},
      {"name": "_resolution", "type": "string"},
      {"name": "_density", "type": "string"},
      {"name": "_locale", "type": "string"},
      {"name": "_app_version", "type": "string"}
    ]}
  },
  {"name": "vendor_info", "type": {
    "type": "record",
    "name": "VendorInfo",
    "fields": [
      {"name": "sr_no_ori", "type": "string"},
      {"name": "sr_no_cur", "type": "string"}
    ]}
  },
  {"name": "end_session", "type": "int"},
  {"name": "session_duration", "type": "long"},
  {"name": "session_id", "type": "long"}
  ]
},
  "events": {
  "type": "record",
  "namespace": "com.perfectcorp.countly.schema",
  "name": "EventRaw",
  "doc": "EventRaw",
  "fields": [{
    "name": "app_key",
    "type": "string"
  },
  {
    "name": "device_id",
    "type": "string"
  },
  {
    "name": "timestamp",
    "type": "long"
  },
  {
    "name": "tz",
    "type": "string"
  },
  {
    "name": "metrics",
    "type": {
      "type": "record",
      "name": "Metrics",
      "fields": [{
        "name": "_device",
        "type": "string"
      },
      {
        "name": "_os",
        "type": "string"
      },
      {
        "name": "_os_version",
        "type": "string"
      },
      {
        "name": "_carrier",
        "type": "string"
      },
      {
        "name": "_resolution",
        "type": "string"
      },
      {
        "name": "_density",
        "type": "string"
      },
      {
        "name": "_locale",
        "type": "string"
      },
      {
        "name": "_app_version",
        "type": "string"
      }]
    }
  },
  {
    "name": "vendor_info",
    "type": {
      "type": "record",
      "name": "VendorInfo",
      "fields": [{
        "name": "sr_no_ori",
        "type": "string"
      },
      {
        "name": "sr_no_cur",
        "type": "string"
      }]
    }
  },
  {
    "name": "events",
    "type": {
      "type": "array",
      "items": {
        "name": "Events",
        "type": "record",
        "fields": [{
          "name": "key",
          "type": "string"
        },
        {
          "name": "count",
          "type": "int"
        },
        {
        "name": "timestamp",
          "type": "long"
        },
        {
          "name": "tz",
          "type": "string"
        },
        {
          "name": "segmentation",
          "type": {
            "type": "map",
            "values": "string"
          }
        },
        {
          "name": "sum",
          "type": "long"
        }]
      }
    }
  }]
}
};

module.exports = {
  avroEncode: function(type, jsonObj) {
    var encoder = avro.parse(avroMap[type]);
/*
    var endocer = avro.parse({"name": "events", "type": {
    "type": "array", "items": {
    "name": "Events",
      "type": "record",
      "fields": [
        {"name": "key", "type": "string"},
          {"name": "count", "type": "int"},
          {"name": "etimestamp", "type": "long"},
          {"name": "tz", "type": "string"},
          {"name": "segmentation", "type": "string"},
          {"name": "sum", "type": "long"}
      ]
    }
    }
  });
*/
////// ok
/*
    var encoder = avro.parse({
  "namespace" : "my.com.ns",
  "name": "events",
  "type" :  "record",
  "fields" : [
    {"name": "events", "type": {
      "type": "array",
      "items": {
        "name": "Events",
        "type": "record",
        "fields": [
      {
        "name": "key",
        "type": "string"
      },
      {
        "name": "count",
        "type": "int"
      },
      {
        "name": "timestamp",
        "type": "long"
      },
      {
        "name": "tz",
        "type": "string"
      },
      {
        "name": "sum",
        "type": "long"
      }]
    }
     }}
  ]
});
*/
//// evnets no segments
/*
    var encoder = avro.parse({
  "type": "record",
  "namespace" : "com.perfectcorp.countly.schema",
  "name": "EventRaw",
  "doc": "EventRaw",
  "fields": [
  {"name": "app_key", "type": "string"},
  {"name": "device_id", "type": "string"},
  {"name": "timestamp", "type": "long"},
  {"name": "tz", "type": "string"},
  {"name": "metrics", "type": {
    "type": "record",
    "name": "Metrics",
    "fields": [
      {"name": "_device", "type": "string"},
      {"name": "_os", "type": "string"},
      {"name": "_os_version", "type": "string"},
      {"name": "_carrier", "type": "string"},
      {"name": "_resolution", "type": "string"},
      {"name": "_density", "type": "string"},
      {"name": "_locale", "type": "string"},
      {"name": "_app_version", "type": "string"}
    ]}
  },
  {"name": "vendor_info", "type": {
    "type": "record",
    "name": "VendorInfo",
    "fields": [
      {"name": "sr_no_ori", "type": "string"},
      {"name": "sr_no_cur", "type": "string"}
    ]}
  },
  {"name": "events", "type": {
    "type": "array", "items": {
    "name": "Events",
      "type": "record",
      "fields": [
        {"name": "key", "type": "string"},
          {"name": "count", "type": "int"},
          {"name": "timestamp", "type": "long"},
          {"name": "tz", "type": "string"},
          {"name": "sum", "type": "long"}
      ]
    }
    }
  }]
});
*/

////// test
/*
    var encoder = avro.parse({
  "namespace" : "my.com.ns",
  "name": "events",
  "type" :  "record",
  "fields" : [
    {"name": "events", "type": {
      "type": "array",
      "items": {
        "name": "Events",
        "type": "record",
        "fields": [
      {
        "name": "key",
        "type": "string"
      },
      {
        "name": "count",
        "type": "int"
      },
      {
        "name": "timestamp",
        "type": "long"
      },
      {
        "name": "tz",
        "type": "string"
      },
      {
        "name": "segmentation",
        "type": "record",
        "fields": [{
          "name": "segmentation",
          "type":{
            "type":"map",
            "values":"string"
          }}]
      },
      {
        "name": "sum",
        "type": "long"
      }]
    }
     }}
  ]
});
*/
/*
var encoder = avro.parse({"name": "events", "type": {
    "type": "array", "items": {
    "name": "events",
      "type": "record",
      "fields": [
        {"name": "key", "type": "string"},
          {"name": "count", "type": "int"},
          {"name": "timestamp", "type": "log"},
          {"name": "tz", "type": "string"},
          {"name": "segmentation",
           "type": {
               "type":"map",
               "values":"string"
               }
          },
          {"name": "sum", "type": "long"}
      ]
    }
    }
  });
*/
/*
    var encoder = avro.parse({
    "name": "events",
      "type": "record",
      "fields": [
        {"name": "key", "type": "string"},
          {"name": "count", "type": "int"},
          {"name": "timestamp", "type": "long"},
          {"name": "tz", "type": "string"},
          {"name": "segmentation",
           "type": {
               "type":"map",
               "values":"string"
               }
          },
          {"name": "sum", "type": "long"}
      ]
    });
*/
/*
    var encoder = avro.parse({
  "type": "record",
  "namespace": "com.perfectcorp.countly.schema",
  "name": "EventRaw",
  "doc": "EventRaw",
  "fields": [{
    "name": "app_key",
    "type": "string"
  },
  {
    "name": "device_id",
    "type": "string"
  },
  {
    "name": "timestamp",
    "type": "long"
  },
  {
    "name": "tz",
    "type": "string"
  },
  {
    "name": "metrics",
    "type": {
      "type": "record",
      "name": "Metrics",
      "fields": [{
        "name": "_device",
        "type": "string"
      },
      {
        "name": "_os",
        "type": "string"
      },
      {
        "name": "_os_version",
        "type": "string"
      },
      {
        "name": "_carrier",
        "type": "string"
      },
      {
        "name": "_resolution",
        "type": "string"
      },
      {
        "name": "_density",
        "type": "string"
      },
      {
        "name": "_locale",
        "type": "string"
      },
      {
        "name": "_app_version",
        "type": "string"
      }]
    }
  },
  {
    "name": "vendor_info",
    "type": {
      "type": "record",
      "name": "VendorInfo",
      "fields": [{
        "name": "sr_no_ori",
        "type": "string"
      },
      {
        "name": "sr_no_cur",
        "type": "string"
      }]
    }
  },
  {
    "name": "events",
    "type": {
      "type": "array",
      "items": {
        "name": "Events",
        "type": "record",
        "fields": [{
          "name": "key",
          "type": "string"
        },
        {
          "name": "count",
          "type": "int"
        },
        {
          "name": "timestamp",
          "type": "long"
        },
        {
          "name": "tz",
          "type": "string"
        },
        {
          "name": "segmentation",
          "type": {
            "type": "map",
            "values": "string"
          }
        },
        {
          "name": "sum",
          "type": "long"
        }]
      }
    }
  }]
});
*/
/* ok
    var encoder = avro.parse({
  "name":"deviceids",
  "type":"record",
  "fields":[
    { "name": "deviceids",
      "type":{
            "type":"map",
            "values":"string"
            }
    }
  ]
});
*/
/*
    var encoder = avro.parse({
            "type":"map",
            "values":"string"
            });
*/
/*
    var encoder = avro.parse({
  "namespace" : "my.com.ns",
  "name": "myrecord",
  "type" :  "record",
  "fields" : [
     {"name": "uid", "type": "int"},
     {"name": "somefield", "type": "string"},
     {"name": "options", "type": {
        "type": "array",
        "items": {
            "type": "record",
            "name": "lvl2_record",
            "fields": [
                {"name": "item1_lvl2", "type": "string"},
                {"name": "item2_lvl2", "type": {
                    "type": "array",
                    "items": {
                        "type": "record",
                        "name": "lvl3_record",
                        "fields": [
                            {"name": "item1_lvl3", "type": "string"},
                            {"name": "item2_lvl3", "type": "string"}
                        ]
                    }
                }}
            ]
        }
     }}
  ]
});
*/
    const buf = encoder.toBuffer(jsonObj); // Encoded buffer.
/*
    console.log(buf);
    const val = encoder.fromBuffer(buf); // {kind: 'CAT', name: 'Albert'}
    console.log(val);
*/
    return buf;
  },
  avroDecode: function(type, avroBinary) {
    var decoder = avro.parse(avroMap[type]);
    const val = decoder.fromBuffer(avroBinary)
    return val;
  }
}
