var common = {},
    moment = require('moment'),
    momentz = require('moment-timezone'),
    time = require('time')(Date),
    crypto = require('crypto'),
    mongo = require('mongoskin'),
    debug = require('./cl/debug.js'),
    geoip = require('geoip-lite'),
    countlyConfig = require('./../config'),
    print = console.log,
    mapAppKey = require('./../appKey.js'),
	KafkaRest = require('kafka-rest');

(function (common) {

    common.dbMap = {
        'events': 'e',
        'total': 't',
        'new': 'n',
        'unique': 'u',
        'duration': 'd',
        'durations': 'ds',
        'frequency': 'f',
        'loyalty': 'l',
        'sum': 's',
        'count': 'c'
    };

    common.dbUserMap = {
        'device_id': 'did',
        'first_seen': 'fs',
        'session_duration': 'sd',
        'total_session_duration': 'tsd',
        'session_count': 'sc',
        'device': 'd',
        'carrier': 'c',
        'city': 'cty',
        'country_code': 'cc',
        'platform': 'p',
        'platform_version': 'pv',
        'app_version': 'av',
        'last_begin_session_timestamp': 'lbst',
        'last_end_session_timestamp': 'lest',
        'has_ongoing_session': 'hos'
    };

    common.rawCollection = {
        'raw': 'raw_',
        'session': 'raw_session_',
        'event': 'raw_event_'
    };

    var dbName;
    var dbOptions = { safe:false, maxPoolSize: countlyConfig.mongodb.max_pool_size || 1000 };
    var dbRawOptions = { safe:false, maxPoolSize: countlyConfig.mongodb.max_raw_pool_size || 1000 };
    var dbBatchOptions = { safe:false, maxPoolSize: countlyConfig.mongodb.max_batch_pool_size || 1000};

    if (typeof countlyConfig.mongodb === "string") {
        dbName = countlyConfig.mongodb;
    } else if ( typeof countlyConfig.mongodb.replSetServers === 'object'){
        dbName = countlyConfig.mongodb.replSetServers;
        dbOptions.database = countlyConfig.mongodb.db || 'countly';
    } else {
        dbName = (countlyConfig.mongodb.host + ':' + 
            countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db + '?auto_reconnect=true');
    }

    dbLocalRawName = (countlyConfig.mongodb.hostbatch + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_raw + '?auto_reconnect=true');
    dbLocalBatchName = (countlyConfig.mongodb.hostbatch + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_batch + '?auto_reconnect=true');

    common.local_raw = mongo.db(dbLocalRawName, dbRawOptions);
    common.local_raw.tag = countlyConfig.mongodb.db_raw.replace(/system\.|\.\.|\$/g, "");
    common.local_batch = mongo.db(dbLocalBatchName, dbBatchOptions);
    common.local_batch.tag = countlyConfig.mongodb.db_batch.replace(/system\.|\.\.|\$/g, "");


    dbRawName1 = (countlyConfig.mongodb.hostbatch1 + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_raw + '?auto_reconnect=true');
    dbBatchName1 = (countlyConfig.mongodb.hostbatch1 + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_batch + '?auto_reconnect=true');
    dbRawName2 = (countlyConfig.mongodb.hostbatch2 + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_raw + '?auto_reconnect=true');
    dbBatchName2 = (countlyConfig.mongodb.hostbatch2 + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_batch + '?auto_reconnect=true');

    dbIbbName = (countlyConfig.mongodb.host + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_ibb + '?auto_reconnect=true');

    dbMaintainName = (countlyConfig.mongodb.hostbatch + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_maintain + '?auto_reconnect=true');

    dbMaintainName2 = (countlyConfig.mongodb.hostbatch2 + ':' + 
        countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_maintain + '?auto_reconnect=true');

    shardMaintainName = (countlyConfig.mongodb.hostshard + ':' + 
        countlyConfig.mongodb.mongos + '/' + countlyConfig.mongodb.db_maintain + '?auto_reconnect=true');

    newshardMaintainName = (countlyConfig.mongodb.newShard + ':' + 
        countlyConfig.mongodb.newMongos + '/' + countlyConfig.mongodb.db_maintain + '?auto_reconnect=true');

    newshardOthersName = (countlyConfig.mongodb.newShard + ':' + 
        countlyConfig.mongodb.newMongos + '/others' + '?auto_reconnect=true');

    dbReportName = (countlyConfig.mongodb.oemhost + ':' + 
        countlyConfig.mongodb.port + '/' + "oem_report" + '?auto_reconnect=true');

    common.db = mongo.db(dbName, dbOptions);
    common.db.tag = countlyConfig.mongodb.db.replace(/system\.|\.\.|\$/g, "");

    common.shard_others = mongo.db(newshardOthersName, dbOptions);

    common.db_raw1 = mongo.db(dbRawName1, dbRawOptions);
    common.db_raw1.tag = countlyConfig.mongodb.db_raw.replace(/system\.|\.\.|\$/g, "");
    common.db_batch1 = mongo.db(dbBatchName1, dbBatchOptions);
    common.db_batch1.tag = countlyConfig.mongodb.db_batch.replace(/system\.|\.\.|\$/g, "");

    common.db_raw2 = mongo.db(dbRawName2, dbRawOptions);
    common.db_raw2.tag = countlyConfig.mongodb.db_raw.replace(/system\.|\.\.|\$/g, "");
    common.db_batch2 = mongo.db(dbBatchName2, dbBatchOptions);
    common.db_batch2.tag = countlyConfig.mongodb.db_batch.replace(/system\.|\.\.|\$/g, "");

    common.db_report = mongo.db(dbReportName, dbOptions);
    common.db_report.tag = "oem_report".replace(/system\.|\.\.|\$/g, "");

    common.db_ibb = mongo.db(dbIbbName, dbOptions);
    common.db_ibb.tag = countlyConfig.mongodb.db_ibb.replace(/system\.|\.\.|\$/g, "");

    common.db_oem = [];
    common.db_oem_batch = [];
    common.db_oem_dashboard = [];

    common.db_hourly1 = null;
    common.db_closes1 = [];

    common.db_hourly2 = null;
    common.db_closes2 = [];

    common.db_hourlyShard = null;
    common.db_closesShard = [];

    common.db_hourlyNewShard = null;
    common.db_closesNewShard = [];

    common.db_hourlyShardOEM = null;
    common.db_closesShardOEM = [];

    common.db_hourlyNewShardOEM = null;
    common.db_closesNewShardOEM = [];

    common.db_maintain = mongo.db(dbMaintainName, dbOptions);
    common.db_maintain.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");

    common.db_maintain2 = mongo.db(dbMaintainName2, dbOptions);
    common.db_maintain2.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");

    common.shard_maintain = null;

    common.newshard_maintain = null;

    common.config = countlyConfig;

    common.time = time;

    common.moment = moment;
    common.momentz = momentz;

    common.crypto = crypto;

    //common.kafka = new KafkaRest({ 'url': 'http://localhost:8082' });

    common.getCheckApps = function(callback, dbonoffFuc) {
        dbonoffFuc.open(common.db);
        common.db.collection('apps').find().toArray(
            function(err, data) {
                if (data) {
                    callback(data);
                    /*var str = "";
                    for (i=0; i<data.length; i++) {
                        if (data[i]._id == "53f554ef847577512100130a") continue;
                        str += data[i]._id+", ";
                    }
                    print(str);*/
                } else {
                }
                dbonoffFuc.close(common.db);
        });
    };

    common.getHourlyRawDB = function(appKey, inCurrDate) {
        var headName = 'countly_raw',
            rawdbName = '',
            currDate,
            appTimezone = "America/Denver";

        //print("getHourlyRawDB");
        if (inCurrDate) {
            currDate = inCurrDate;
        } else {
            currDate = new Date();
        }
        
        var tmpMoment = momentz(currDate).tz(appTimezone);
        var fileHeadName = tmpMoment.format("YYYYMMDD");
        var tailName = tmpMoment.format("MMDD_HH_mm_");
        tailName = tmpMoment.format("MMDD_");
        var min = tmpMoment.minutes();
        min = tmpMoment.hours();
        var index = parseInt(min/6); // calculate index
        var fullName = headName + tailName + (pad2(index)).toString();
        var filename = fileHeadName+"_raw_"+(pad2(index)).toString();
        fullName = fullName.replace(/system\.|\.\.|\$/g, "");

        var listApps = [mapAppKey.key["YouCam_Perfect_And"], 
        mapAppKey.key["YouCam_Perfect_iOS"], mapAppKey.key["Perfect_iOS"]];

        if (-1 != listApps.indexOf(appKey)) {
            // clad1
            return common.getDBByNameClad1(fullName, filename);
        }
        // clad2
        return common.getDBByNameClad2(fullName, filename);
    };

    common.getShardRawDB = function(appKey, inCurrDate) {
        var headName = 'countly_raw',
            rawdbName = '',
            currDate,
            appTimezone = "America/Denver";

        //print("getHourlyRawDB");
        if (inCurrDate) {
            currDate = inCurrDate;
        } else {
            currDate = new Date();
        }
        
        var tmpMoment = momentz(currDate).tz(appTimezone);
        var fileHeadName = tmpMoment.format("YYYYMMDD");
        var tailName = tmpMoment.format("MMDD_HH_mm_");
        tailName = tmpMoment.format("MMDD_");
        var min = tmpMoment.minutes();
        min = tmpMoment.hours();
        var index = parseInt(min/6); // calculate index
        var fullName = headName + tailName + (pad2(index)).toString();
        var filename = fileHeadName+"_raw_"+(pad2(index)).toString();
        fullName = fullName.replace(/system\.|\.\.|\$/g, "");

        // shard
        return common.getDBByNameShard(fullName, filename);
    };

    common.getDBByNameShard = function (inDBName, filename) {
        var db_name = (countlyConfig.mongodb.hostshard + ':' + 
            countlyConfig.mongodb.mongos + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourlyShard) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyShard = dbInstance;
            return common.db_hourlyShard;
        }
        if (common.db_hourlyShard.tag != inDBName) {
            var old = common.db_hourlyShard;
            common.db_closesShard.push(old);
            if (common.db_closesShard.length >= 3) {
                // remove and close the first obj
                var beRemoveDB = common.db_closesShard.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            if (common.shard_maintain == null) {
                common.shard_maintain = mongo.db(shardMaintainName, dbOptions);
                common.shard_maintain.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");
            }
            common.shard_maintain.collection("raw_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished1 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("event_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished1 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("raw_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished2 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("event_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished2 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("raw_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished3 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("event_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished3 error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyShard = dbInstance;
        }
        return common.db_hourlyShard;
    };

    common.getNewShardRawDB = function(appKey, inCurrDate) {
        var headName = 'countly_raw',
            rawdbName = '',
            currDate,
            appTimezone = "America/Denver";

        //print("getHourlyRawDB");
        if (inCurrDate) {
            currDate = inCurrDate;
        } else {
            currDate = new Date();
        }

        var tmpMoment = momentz(currDate).tz(appTimezone);
        var fileHeadName = tmpMoment.format("YYYYMMDD");
        var tailName = tmpMoment.format("MMDD_HH_mm_");
        tailName = tmpMoment.format("MMDD_");
        var min = tmpMoment.minutes();
        min = tmpMoment.hours();
        var index = parseInt(min/6); // calculate index
        var fullName = headName + tailName + (pad2(index)).toString();
        var filename = fileHeadName+"_raw_"+(pad2(index)).toString();
        fullName = fullName.replace(/system\.|\.\.|\$/g, "");

        // shard
        return common.getDBByNameNewShard(fullName, filename, 
            countlyConfig.mongodb.newShard, countlyConfig.mongodb.newMongos);
    };

    common.getDBByNameNewShard = function (inDBName, filename, hostname, portnum) {
        var db_name = (hostname + ':' + portnum + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourlyNewShard) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyNewShard = dbInstance;
            return common.db_hourlyNewShard;
        }
        if (common.db_hourlyNewShard.tag != inDBName) {
            var old = common.db_hourlyNewShard;
            common.db_closesNewShard.push(old);
            if (common.db_closesNewShard.length >= 3) {
                // remove and close the first obj
                var beRemoveDB = common.db_closesNewShard.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            if (common.newshard_maintain == null) {
                common.newshard_maintain = mongo.db(newshardMaintainName, dbOptions);
                common.newshard_maintain.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");
            }
            common.newshard_maintain.collection("raw_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished1 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("event_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished1 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("raw_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished2 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("event_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished2 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("raw_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished3 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("event_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished3 error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyNewShard = dbInstance;
        }
        return common.db_hourlyNewShard;
    };

    common.getNewShardOEMRawDB = function(appKey, oemHeadName, inCurrDate) {
        var headName = 'oem_countly_raw',
            rawdbName = '',
            currDate,
            appTimezone = "America/Denver";

        if (oemHeadName) {
            headName = "oem_"+oemHeadName+"_raw";
        }

        //print("getHourlyRawDB");
        if (inCurrDate) {
            currDate = inCurrDate;
        } else {
            currDate = new Date();
        }

        var tmpMoment = momentz(currDate).tz(appTimezone);
        var fileHeadName = tmpMoment.format("YYYYMMDD");
        var tailName = tmpMoment.format("MMDD_HH_mm_");
        tailName = tmpMoment.format("MMDD_");
        var min = tmpMoment.minutes();
        min = tmpMoment.hours();
        var index = parseInt(min/24); // calculate index
        var fullName = headName + tailName + (pad2(index)).toString();
        var filename = fileHeadName+"_"+oemHeadName+"_"+(pad2(index)).toString();
        fullName = fullName.replace(/system\.|\.\.|\$/g, "");

        // shard
        return common.getDBByNameNewShardOEM(fullName, filename, 
            countlyConfig.mongodb.newShard, countlyConfig.mongodb.newMongos);
    };

    common.getDBByNameNewShardOEM = function (inDBName, filename, hostname, portnum) {
        var db_name = (hostname + ':' + portnum + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourlyNewShardOEM) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyNewShardOEM = dbInstance;
            return common.db_hourlyNewShardOEM;
        }
        if (common.db_hourlyNewShardOEM.tag != inDBName) {
            var old = common.db_hourlyNewShardOEM;
            common.db_closesNewShardOEM.push(old);
            if (common.db_closesNewShardOEM.length >= 2) {
                // remove and close the first obj
                var beRemoveDB = common.db_closesNewShardOEM.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            if (common.newshard_maintain == null) {
                common.newshard_maintain = mongo.db(newshardMaintainName, dbOptions);
                common.newshard_maintain.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");
            }
            common.newshard_maintain.collection("raw_oem_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_oem_finished1 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("raw_oem_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished2 error');
                        print(err);
                    }
                });
            common.newshard_maintain.collection("raw_oem_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished3 error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyNewShardOEM = dbInstance;
        }
        return common.db_hourlyNewShardOEM;
    };

    common.getShardOEMRawDB = function(appKey, oemHeadName, inCurrDate) {
        var headName = 'oem_countly_raw',
            rawdbName = '',
            currDate,
            appTimezone = "America/Denver";

        if (oemHeadName) {
            headName = "oem_"+oemHeadName+"_raw";
        }

        //print("getHourlyRawDB");
        if (inCurrDate) {
            currDate = inCurrDate;
        } else {
            currDate = new Date();
        }

        var tmpMoment = momentz(currDate).tz(appTimezone);
        var fileHeadName = tmpMoment.format("YYYYMMDD");
        var tailName = tmpMoment.format("MMDD_HH_mm_");
        tailName = tmpMoment.format("MMDD_");
        var min = tmpMoment.minutes();
        min = tmpMoment.hours();
        var index = parseInt(min/24); // calculate index
        var fullName = headName + tailName + (pad2(index)).toString();
        var filename = fileHeadName+"_"+oemHeadName+"_"+(pad2(index)).toString();
        fullName = fullName.replace(/system\.|\.\.|\$/g, "");

        // shard
        return common.getDBByNameShardOEM(fullName, filename);
    };

    common.getDBByNameShardOEM = function (inDBName, filename) {
        var db_name = (countlyConfig.mongodb.hostshard + ':' + 
            countlyConfig.mongodb.mongos + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourlyShardOEM) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyShardOEM = dbInstance;
            return common.db_hourlyShardOEM;
        }
        if (common.db_hourlyShardOEM.tag != inDBName) {
            var old = common.db_hourlyShardOEM;
            common.db_closesShardOEM.push(old);
            if (common.db_closesShardOEM.length >= 2) {
                // remove and close the first obj
                var beRemoveDB = common.db_closesShardOEM.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            if (common.shard_maintain == null) {
                common.shard_maintain = mongo.db(shardMaintainName, dbOptions);
                common.shard_maintain.tag = countlyConfig.mongodb.db_maintain.replace(/system\.|\.\.|\$/g, "");
            }
            common.shard_maintain.collection("raw_oem_finished1").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_oem_finished1 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("raw_oem_finished2").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished2 error');
                        print(err);
                    }
                });
            common.shard_maintain.collection("raw_oem_finished3").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished3 error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourlyShardOEM = dbInstance;
        }
        return common.db_hourlyShardOEM;
    };

    common.getDBByNameClad1 = function (inDBName, filename) {
        var db_name = (countlyConfig.mongodb.hostbatch1 + ':' + 
            countlyConfig.mongodb.port + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourly1) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourly1 = dbInstance;
            return common.db_hourly1;
        }
        if (common.db_hourly1.tag != inDBName) {
            var old = common.db_hourly1;
            common.db_closes1.push(old);
            if (common.db_closes1.length >= 1) {
                // remove and close the first obj
                var beRemoveDB = common.db_closes1.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            common.db_maintain.collection("raw_finished").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished error');
                        print(err);
                    }
                });
            common.db_maintain.collection("event_finished").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourly1 = dbInstance;
        }
        return common.db_hourly1;
    };

    common.getDBByNameClad2 = function (inDBName, filename) {
        var db_name = (countlyConfig.mongodb.hostbatch2 + ':' + 
            countlyConfig.mongodb.port + '/' + inDBName + 
            '?auto_reconnect=true');
        if (!common.db_hourly2) {
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourly2 = dbInstance;
            return common.db_hourly2;
        }
        if (common.db_hourly2.tag != inDBName) {
            var old = common.db_hourly2;
            common.db_closes2.push(old);
            if (common.db_closes2.length >= 1) {
                // remove and close the first obj
                var beRemoveDB = common.db_closes2.shift();
                beRemoveDB.close();
            }
            var insertData = {};
            insertData.dbname = old.tag;
            insertData.timestamp = Math.floor(Date.now()/1000);
            insertData.filename = old.filename;
            common.db_maintain.collection("raw_finished").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('raw_finished error');
                        print(err);
                    }
                });
            common.db_maintain.collection("event_finished").update({dbname: old.tag},
                {$set: insertData}, {'upsert': true}, function(err, res) {
                    if (err) {
                        print('event_finished error');
                        print(err);
                    }
                });
            var dbInstance = mongo.db(db_name, dbRawOptions);
            dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
            dbInstance.filename = filename;
            common.db_hourly2 = dbInstance;
        }
        return common.db_hourly2;
    };

    //initOEMRawDBs();
    common.getDBByName = function (inDBName) {
        var db_name = (countlyConfig.mongodb.hostbatch + ':' + 
            countlyConfig.mongodb.port + '/' + inDBName + 
            '?auto_reconnect=true');
        var dbInstance = mongo.db(db_name, dbBatchOptions);
        dbInstance.tag = inDBName.replace(/system\.|\.\.|\$/g, "");
        return dbInstance;
    };

    common.getRawDB = function (appKey) {
        var listAppRaw_1 = [mapAppKey.key["YouCam_Perfect_And"], 
        mapAppKey.key["YouCam_Perfect_iOS"], mapAppKey.key["Perfect_iOS"]];
        return (-1 != listAppRaw_1.indexOf(appKey)) ? common.db_raw1 : common.db_raw2;
    };

    common.getBatchDB = function (appKey) {
        var listAppBatch_1 = [mapAppKey.key["YouCam_Perfect_And"], 
        mapAppKey.key["YouCam_Perfect_iOS"], mapAppKey.key["Perfect_iOS"]];
        return (-1 != listAppBatch_1.indexOf(appKey)) ? common.db_batch1 : common.db_batch2;
    };

    common.getLocalRawDB = function (appKey) {
        return common.local_raw;
    };

    common.getLocalBatchDB = function (appKey) {
        return common.local_batch;
    };

    common.getYCPBatchDB = function () {
        return common.db_batch1;
    }

    common.getOEMRawDB = function (srNumber) {
        var raw_name = countlyConfig.mongodb.db_raw.match(/\w*(_\w*)/);
        var srNumberName = srNumber.replace(/system\.|\.\.|\$/g, "");
        var oem = common.db_oem[srNumberName];
        if (oem) {
            //console.log("this is a oem "+srNumberName);
        } else {
            //console.log(srNumberName+" there is no oem");
            dbOEMName = (countlyConfig.mongodb.oemhost + ':' + 
                countlyConfig.mongodb.port + '/oem_' + 
                srNumberName + raw_name[1] + '?auto_reconnect=true');
            common.db_oem[srNumberName]=mongo.db(dbOEMName, dbRawOptions);
            oem = common.db_oem[srNumberName];
        }
        oem.tag = "oem_"+srNumberName+raw_name[1];
        return oem;
    };

    common.getOEMBatchDB = function (srNumber) {
        var raw_name = countlyConfig.mongodb.db_batch.match(/\w*(_\w*)/);
        var srNumberName = srNumber.replace(/system\.|\.\.|\$/g, "");
        var oem = common.db_oem[srNumberName];
        if (oem) {
            //console.log("this is a oem "+srNumberName);
        } else {
            //console.log(srNumberName+" there is no oem");
            dbOEMName = (countlyConfig.mongodb.oemhost + ':' + 
                countlyConfig.mongodb.port + '/oem_' + 
                srNumberName + raw_name[1] + '?auto_reconnect=true');
            common.db_oem_batch[srNumberName]=mongo.db(dbOEMName, dbBatchOptions);
            oem = common.db_oem_batch[srNumberName];
        }
        oem.tag = "oem_"+srNumberName+raw_name[1];
        return oem;
    };

    common.getOEMDB = function (srNumber) {
        var srNumberName = srNumber.replace(/system\.|\.\.|\$/g, "");
        var oem = common.db_oem_dashboard[srNumberName];
        if (oem) {
            //console.log("this is a oem "+srNumberName);
        } else {
            //console.log(srNumberName+" there is no oem");
            dbOEMName = (countlyConfig.mongodb.host + ':' + 
                countlyConfig.mongodb.port + '/countly_' + 
                srNumberName + '?auto_reconnect=true');
            common.db_oem_dashboard[srNumberName]=mongo.db(dbOEMName, dbOptions);
            oem = common.db_oem_dashboard[srNumberName];
        }
        oem.tag = "countly_"+srNumberName;
        return oem;
    };

    common.getGenericDB = function () {
        var raw_name = countlyConfig.mongodb.db_raw.match(/\w*(_\w*)/);
        var srNumberName = "countly_generic".replace(/system\.|\.\.|\$/g, "");
        var oem = common.db_oem[srNumberName];
        if (oem) {
            //console.log("this is a oem "+srNumberName);
        } else {
            //console.log(srNumberName+" there is no oem");
            dbOEMName = (countlyConfig.mongodb.host + ':' + 
                countlyConfig.mongodb.port + '/' + 
                srNumberName + '?auto_reconnect=true');
            common.db_oem[srNumberName]=mongo.db(dbOEMName, dbOptions);
            oem = common.db_oem[srNumberName];
        }
        oem.tag = srNumberName;
        return oem;
    };

    common.getErrorDB = function () {
        var raw_name = countlyConfig.mongodb.db_raw.match(/\w*(_\w*)/);
        var srNumberName = "error".replace(/system\.|\.\.|\$/g, "");
        var oem = common.db_oem[srNumberName];
        if (oem) {
            //console.log("this is a oem "+srNumberName);
        } else {
            //console.log(srNumberName+" there is no oem");
            dbOEMName = (countlyConfig.mongodb.hostbatch + ':' + 
                countlyConfig.mongodb.port + '/' + 
                srNumberName + raw_name[1] + '?auto_reconnect=true');
            common.db_oem[srNumberName]=mongo.db(dbOEMName, dbOptions);
            oem = common.db_oem[srNumberName];
        }
        oem.tag = srNumberName+raw_name[1];
        return oem;
    };

    common.computeGeoInfo = function (params) {
        // Location of the user is retrieved using geoip-lite module from her IP address.
        params.country = 'Unknown';
        params.city = 'Unknown';
        var locationData = geoip.lookup(params.ip_address);

        if (locationData) {
            if (locationData.country) {
                params.country = locationData.country;
            }

            if (locationData.city) {
                params.city = locationData.city;
            } 

            // Coordinate values of the user location has no use for now
            if (locationData.ll) {
                params.lat = locationData.ll[0];
                params.lng = locationData.ll[1];
           }
        }
    };

    common.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

    common.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    common.zeroFill = function(number, width) {
        width -= number.toString().length;

        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }

        return number + ""; // always return a string
    };

    common.arrayAddUniq = function (arr, item) {
        if (arr && arr.length) {
            if (arr.indexOf(item) === -1) {
                arr[arr.length] = item;
            }
        } else {
            arr[0] = item;
        }
	return arr;
    };

    common.sha1Hash = function (str, addSalt) {
        var salt = (addSalt) ? new Date().getTime() : '';
        return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
    };

    common.md5Hash = function (str) {
        return crypto.createHash('md5').update(str + '').digest('hex');
    };

    // Creates a time object in the format object["2012.7.20.property"] = increment.
    common.fillTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? +increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly || 
            !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            return false;
        }

        object[timeObj.yearly + '.' + property] = increment;
        object[timeObj.monthly + '.' + property] = increment;
        object[timeObj.daily + '.' + property] = increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            object[timeObj.hourly + '.' + property] = increment;
        }

        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

    function initOEMRawDBs() {
        common.db.collection('oems').find().toArray(function(err, data) {
            for (var i = 0 ; i < data.length ; i ++) {
                var oemdb1 = common.getOEMRawDB(data[i].deal_no);
                var oemdb2 = common.getOEMDB(data[i].deal_no);
                //print(oemdb1.tag);
                //print(oemdb2.tag);
            }
        });
    }

    function empty(e) {
        if (typeof e == 'undefined')
            return true;
        switch(e) {
            case "":
            case 0:
            case "0":
            case null:
            case false:
            case typeof e == "undefined":
                return true;
            default :
                return false;
        }
        return true;
    };
    function pad2(number) {
        return (number < 10 ? '0' : '') + number
    }
    function tzFormat(tz, reqTimestamp) {
        var regex = /^(?:[+-\s]{1})(?:\d{4})$/;
	var path = '/home/hadoop/countly_snow/log/'
        if (tz) {
            if (!tz.match(regex)) {
                debug.writeLog(path+'re.log', "not match data=>"+tz+
                    " Typeof:"+(typeof tz)+" empty:"+empty(tz)+
                    " "+reqTimestamp);
                console.log("not match data=>"+tz+" Typeof:"+
                    (typeof tz)+" empty:"+empty(tz));
                return "";
            }
            debug.writeLog(path+'tz.log', "Typeof:"+(typeof tz)+
                " empty:"+empty(tz)+" length:"+tz.length+"["+tz+"]");
            debug.writeLog(path+'tz.log', "substrig(0,1):",tz.substring(0,1));
            debug.writeLog(path+'g', (typeof tz)+" tz:["+tz+"] "+(tz>=0));
            var absTZ = Math.abs(tz);
            var timezone = (tz>=0?"+":"-")+pad2(Math.floor(absTZ/100))+":"+pad2(absTZ%100);
            debug.writeLog(path+'ne.log', tz+" "+timezone+"("+
                timezone.length+") "+empty(tz)+" "+(typeof tz));
            return timezone;
        } else {
            debug.writeLog(path+'ne.log', "empty data=>"+tz+
                " Typeof:"+(typeof tz)+" empty:"+empty(tz));
            return "";
        }
    }

   // increase/add a time object in the format object["2012.7.20.property"] = increment.
    common.incrTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? +increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly ||
         !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            return false;
        }

        if (object[timeObj.yearly + '.' + property]) object[timeObj.yearly + 
            '.' + property] += increment;
        else object[timeObj.yearly + '.' + property] = increment;

        if (object[timeObj.monthly + '.' + property]) object[timeObj.monthly + 
            '.' + property] += increment;
        else object[timeObj.monthly + '.' + property] = increment;
        
        if (object[timeObj.daily + '.' + property]) object[timeObj.daily + 
            '.' + property] += increment;
        else object[timeObj.daily + '.' + property] = increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            if (object[timeObj.hourly + '.' + property]) object[timeObj.hourly + 
                '.' + property] += increment;
            else object[timeObj.hourly + '.' + property] = increment;
        }

        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            if (object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property])
                object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] += increment;
            else 
                object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

   // decrease/add a time object in the format object["2012.7.20.property"] = -increment,
   // and removed if zero.
    common.decrTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly || 
            !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            console.log('no timestamp to decrease');
            console.log(timeObj);
            return false;
        }

        if (object[timeObj.yearly + '.' + property]) {
            object[timeObj.yearly + '.' + property] -= increment;
            if (object[timeObj.yearly + '.' + property] == 0) 
                delete(object[timeObj.yearly + '.' + property]);
        } else object[timeObj.yearly + '.' + property] = 0 - increment;

        if (object[timeObj.monthly + '.' + property]) {
            object[timeObj.monthly + '.' + property] -= increment;
            if (object[timeObj.monthly + '.' + property] == 0) 
                delete(object[timeObj.monthly + '.' + property]);
        } else object[timeObj.monthly + '.' + property] = 0 - increment;
        
        if (object[timeObj.daily + '.' + property]) {
            object[timeObj.daily + '.' + property] -= increment;
            if (object[timeObj.daily + '.' + property] == 0) 
                delete(object[timeObj.daily + '.' + property]);
        } else object[timeObj.daily + '.' + property] = 0 - increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            if (object[timeObj.hourly + '.' + property]) {
                object[timeObj.hourly + '.' + property] -= increment;
                if (object[timeObj.hourly + '.' + property] == 0) 
                    delete(object[timeObj.hourly + '.' + property]);
            } else object[timeObj.hourly + '.' + property] = increment;
        }


        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            if (object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property]) {
                object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] -= increment;
                if (object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] == 0)
                    delete(object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property]);
            } else 
                object[timeObj.yofw + ".w" + timeObj.weekly + '.' + property] = 0 - increment;
        }
    };

    // Check drop data by timestamp
    common.checkTimestamp = function (timestamp) {
        var duration_time = common.config.api.data_drop_duration_time || 3;
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var checkMoment = moment(today).add(-duration_time, 'months');
        var baseTimestamp = checkMoment.valueOf()/1000;
        if (timestamp >= baseTimestamp) {
            return true;
        } else {
            //console.log(new Date(timestamp*1000)+" is before "+checkMoment.format());
            return false;
        }
    }

    // Adjusts the time to current app's configured timezone appTimezone and returns a time object.
    common.initTimeObj = function (appTimezone, reqTimestamp, reqTZ) {
        var currTimestamp,
            currDate,
            currDateWithoutTimestamp = new Date();
        appTimezone = "America/Denver";

        // Check if the timestamp parameter exists in the request and is a 10 digit integer
        if (reqTimestamp && (reqTimestamp + "").length === 10 && common.isNumber(reqTimestamp)) {
            // If the received timestamp is greater than current time use the current time as timestamp
            currTimestamp = (reqTimestamp > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
            currDate = new Date(currTimestamp * 1000);
        } else {
            currTimestamp = time.time(); // UTC
            currDate = new Date();
        }

	try {
            currDate.setTimezone(appTimezone);
	} catch (err) {
	    console.log('[appTimezone]:'+appTimezone+']');
	    console.log(err);
	}
        //currDateWithoutTimestamp.setTimezone(appTimezone);

        var tmpMoment = momentz(currDate).tz(appTimezone);
        var weekofyear = tmpMoment.format("w");
        var tmpYOW = tmpMoment.format("YYYY");
        if (tmpMoment.month() == 11 && tmpMoment.week() == 1) {
            tmpYOW = (tmpMoment.year()+1).toString();
        }
        //var withoutMoment = momentz(currDateWithoutTimestamp).tz(appTimezone);

/*
        var TZ = tzFormat(reqTZ, reqTimestamp);
        if (0 && !empty(TZ)) {
            tmpMoment = tmpMoment.zone(TZ);
            //withoutMoment = withoutMoment.zone(TZ);
            //console.log("timezone:"+reqTZ+" "+TZ);
        } else {
            tmpMoment = momentz(currDate).tz(appTimezone);
        }
*/
        return {
            yearly: tmpMoment.format("YYYY"),
            monthly: tmpMoment.format("YYYY.M"),
            daily: tmpMoment.format("YYYY.M.D"),
            hourly: tmpMoment.format("YYYY.M.D.H"),
            weekly: tmpMoment.format("w"),
            yofw: tmpYOW
        };
    };

    // Returns an extended Date object that has setTimezone function
    common.getDate = function (timestamp, timezone) {
        var tmpDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            tmpDate.setTimezone(timezone);
        }

        return tmpDate;
    };

    common.getDOY = function (timestamp, timezone) {
        var endDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            endDate.setTimezone(timezone);
        }

        var startDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            startDate.setTimezone(timezone);
        }

        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);

        var diff = endDate - startDate;
        var oneDay = 1000 * 60 * 60 * 24;
        var currDay = Math.ceil(diff / oneDay);

        return currDay;
    };

    /*
     argProperties = { argName: { required: true, type: 'String', 
     max-length: 25, min-length: 25, exclude-from-ret-obj: false }};
     */
    common.validateArgs = function (args, argProperties) {

        var returnObj = {};

        if (!args) {
            return false;
        }

        for (var arg in argProperties) {
            if (argProperties[arg].required) {
                if (args[arg] === void 0) {
                    return false;
                }
            }

            if (args[arg] !== void 0) {
                if (argProperties[arg].type) {
                    if (argProperties[arg].type === 'Number' || 
                        argProperties[arg].type === 'String') {
                        if (toString.call(args[arg]) !== '[object ' + 
                            argProperties[arg].type + ']') {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Boolean') {
                        if (!(args[arg] !== true || args[arg] !== false || 
                            toString.call(args[arg]) !== '[object Boolean]')) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Array') {
                        if (!Array.isArray(args[arg])) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                } else {
                    if (toString.call(args[arg]) !== '[object String]') {
                        return false;
                    }
                }

                /*
                if (toString.call(args[arg]) === '[object String]') {
                    args[arg] = args[arg].replace(/([.$])/mg, '');
                }
                */

                if (argProperties[arg]['max-length']) {
                    if (args[arg].length > argProperties[arg]['max-length']) {
                        return false;
                    }
                }

                if (argProperties[arg]['min-length']) {
                    if (args[arg].length < argProperties[arg]['min-length']) {
                        return false;
                    }
                }

                if (!argProperties[arg]['exclude-from-ret-obj']) {
                    returnObj[arg] = args[arg];
                }
            }
        }

        return returnObj;
    };

    common.returnMessage = function (params, returnCode, message) {
        params.res.writeHead(returnCode, 
            {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + 
                JSON.stringify({result: message}) + ')');
        } else {
            params.res.write(JSON.stringify({result: message}));
        }
        params.res.end();
    };

    common.returnHtml = function (params, returnCode, message) {
        params.res.writeHeader(200, {"Content-Type": "text/html"});
        params.res.write(message);
        params.res.end();
    };

    common.returnOutput = function (params, output) {
        params.res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + JSON.stringify(output) + ')');
        } else {
            params.res.write(JSON.stringify(output));
        }

        params.res.end();
    };

    common.clone = function(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    };

}(common));

module.exports = common;

//common.getHourlyRawDB("e315c111663af26a53e5fe4c82cc1baeecf50599");
//common.getHourlyRawDB("75edfca17dfbe875e63a66633ed6b00e30adcb92");
