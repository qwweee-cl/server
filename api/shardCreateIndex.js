var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    debug = require('./utils/cl/debug.js'),
    exec = require('child_process').exec,
    events = require('events'),
    config = require('./config.js'),
    eventEmitter = new events.EventEmitter(),
    print = console.log;

var type1 = ["e315c111663af26a53e5fe4c82cc1baeecf50599",
             "c277de0546df31757ff26a723907bc150add4254",
             "75edfca17dfbe875e63a66633ed6b00e30adcb92",
             "9219f32e8de29b826faf44eb9b619788e29041bb"];
var type2 = ["0368eb926b115ecaf41eff9a0536a332ef191417",
             "02ce3171f470b3d638feeaec0b3f06bd27f86a26"];

function executeCmd(cmd) {
    exec(cmd,  function (error, stdout, stderr) {
        //print(stdout);
        if (error !== null) {
            print('exec error: ' + error);
        }
    });
}

if (process.argv.length != 4) {
    print("no parameter");
    return false;
}
var db_batch = process.argv[2];
var app_type = process.argv[3];

eventEmitter.on('executeCmd', executeCmd);

var mongoUrl=config.mongodb.hostbatch+":"+config.mongodb.port+"/"+db_batch;
var shardingUrl=config.mongodb.hostbatch+":30000/admin";

var curBatchDB = common.getDBByName(db_batch);

//createIndex();
common.getCheckApps(createIndex, dbonoff);

function checkDatas(value, datas, app_type) {
    if (datas) {
        for (var i=0;i<datas.length;i++) {
            if (datas[i].key == value) {
                if (app_type == 1) {
                    if (type1.indexOf(value) != -1) {
                        return true;
                    }
                    print(value);
                    return false;
                } else if (app_type == 2) {
                    if (type2.indexOf(value) != -1) {
                        return true;
                    }
                    print(value);
                    return false;
                }
                //print(datas[i].key);
                //return true;
                print(value);
                return false;
            }
        }
    }
    print(value);
    return false;
}

function createIndex(datas) {
    dbonoff.open(curBatchDB);
    curBatchDB.collections(function(err,collection) {
        if (!collection.length) {
            common.db.close();
            curBatchDB.close();
            print('no data');
            return;
        }
        var eventCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
        var sessionCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
        var shardingCmd = '/usr/bin/mongo '+shardingUrl+' --eval "\n';
        for (var i=0; i<collection.length; i++) {
            var collectionName = collection[i].collectionName;
            collectionName = collectionName.replace('"','');
            collectionName = collectionName.replace('}','');
            collectionName = collectionName.replace(':','');
            collectionName = collectionName.replace('{','');
            if (collectionName.indexOf(common.rawCollection['event'])>=0) {
                var appKey = collectionName.substring(10);
                if (!checkDatas(appKey, datas, app_type)) {
                    continue;
                }
                //print("Entering event :"+collectionName);
                eventCmd += "db."+collectionName+".ensureIndex({app_user_id:1});\n";
                shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
            } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
                var appKey = collectionName.substring(12);
                if (!checkDatas(appKey, datas, app_type)) {
                    continue;
                }
                //print("Entering sessions :"+collectionName);
                sessionCmd += "db."+collectionName+".ensureIndex({app_user_id:1,timestamp:1});\n";
                shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
            }
        }
        eventCmd += '"';
        sessionCmd += '"';
        shardingCmd += '"';
        //print(eventCmd);
        //eventEmitter.emit('executeCmd', eventCmd);
        print(sessionCmd);
        eventEmitter.emit('executeCmd', sessionCmd);
        //print(shardingCmd);
        //eventEmitter.emit('executeCmd', shardingCmd);

        dbonoff.close(curBatchDB);
    });
}
