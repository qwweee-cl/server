var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    debug = require('./utils/cl/debug.js'),
    exec = require('child_process').exec,
    events = require('events'),
    config = require('./config.js'),
    eventEmitter = new events.EventEmitter(),
    deal_no = "",
    print = console.log;

function executeCmd(cmd) {
    exec(cmd,  function (error, stdout, stderr) {
        //print(stdout);
        if (error !== null) {
            print('exec error: ' + error);
        }
    });
}

function createScript(oemdb1, oemdb2) {
    print(oemdb1.tag);
    print(oemdb2.tag);
    var mongoUrl=config.mongodb.hostbatch+":"+config.mongodb.port+"/"+oemdb1.tag;
    var shardingUrl=config.mongodb.hostbatch+":30000/admin";
    dbonoff.open(oemdb1);
    oemdb1.collections(function(err,collection) {
        if (!collection.length) {
            common.db.close();
            dbonoff.close(oemdb1);
            print('no data');
            return;
        }
        var eventCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
        var sessionCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
        var shardingCmd = '/usr/bin/mongo '+shardingUrl+' --eval "\n';
        for (var i=0; i<collection.length; i++) {
            var collectionName = collection[i].collectionName;
            if (collectionName.indexOf(common.rawCollection['event'])>=0) {
                //print("Entering event :"+collectionName);
                eventCmd += "db."+collectionName+".ensureIndex({app_user_id:1});\n";
                shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
            } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
                //print("Entering sessions :"+collectionName);
                sessionCmd += "db."+collectionName+".ensureIndex({app_user_id:1,timestamp:1});\n";
                shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
            }
        }
        eventCmd += '"';
        sessionCmd += '"';
        shardingCmd += '"';
        print(eventCmd);
        //eventEmitter.emit('executeCmd', eventCmd);
        executeCmd(eventCmd);
        print(sessionCmd);
        //eventEmitter.emit('executeCmd', sessionCmd);
        executeCmd(sessionCmd);
        //print(shardingCmd);
        //eventEmitter.emit('executeCmd', shardingCmd);
        print("oem tag : "+oemdb1.tag);
        dbonoff.close(oemdb1);
    });
}

function initOEMRawDBs() {
    if (process.argv.length < 3) {
        deal_no = 'all';
        dbonoff.open(common.db);
        common.db.collection('oems').find().toArray(function(err, data) {
            for (var i = 0 ; i < data.length ; i ++) {
                var oemdb1 = common.getOEMRawDB(data[i].deal_no);
                var oemdb2 = common.getOEMDB(data[i].deal_no);
                createScript(oemdb1, oemdb2);
            }
            dbonoff.close(common.db);
        });
    } else { //process only one APP
        deal_no = process.argv[2];
        var oemdb1 = common.getOEMRawDB(deal_no);
        var oemdb2 = common.getOEMDB(deal_no);
        createScript(oemdb1, oemdb2);
    }
    
}

eventEmitter.on('createScript', createScript);
eventEmitter.on('executeCmd', executeCmd);
initOEMRawDBs();

/*
dbonoff.open(common.db_batch);
common.db_batch.collections(function(err,collection) {
    if (!collection.length) {
        common.db.close();
	    common.db_batch.close();
	    print('no data');
        return;
    }
    var eventCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
    var sessionCmd = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
    var shardingCmd = '/usr/bin/mongo '+shardingUrl+' --eval "\n';
    for (var i=0; i<collection.length; i++) {
        var collectionName = collection[i].collectionName;
        if (collectionName.indexOf(common.rawCollection['event'])>=0) {
            //print("Entering event :"+collectionName);
            eventCmd += "db."+collectionName+".ensureIndex({app_user_id:1});\n";
            shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
        } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
            //print("Entering sessions :"+collectionName);
            sessionCmd += "db."+collectionName+".ensureIndex({app_user_id:1,timestamp:1});\n";
            shardingCmd += "sh.shardCollection('clad_raw00."+collectionName+"', {app_user_id:1});\n";
        }
    }
    eventCmd += '"';
    sessionCmd += '"';
    shardingCmd += '"';
    print(eventCmd);
    //eventEmitter.emit('executeCmd', eventCmd);
    executeCmd(eventCmd);
    print(sessionCmd);
    //eventEmitter.emit('executeCmd', sessionCmd);
    executeCmd(sessionCmd);
    //print(shardingCmd);
    //eventEmitter.emit('executeCmd', shardingCmd);

    dbonoff.close(common.db_batch);
});*/