var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    debug = require('./utils/cl/debug.js'),
    exec = require('child_process').exec,
    events = require('events'),
    config = require('./config.js'),
    eventEmitter = new events.EventEmitter(),
    print = console.log;

function executeCmd(cmd) {
    exec(cmd,  function (error, stdout, stderr) {
        //print(stdout);
        if (error !== null) {
            print('exec error: ' + error);
        }
    });
}

eventEmitter.on('executeCmd', executeCmd);

var mongoUrl=config.mongodb.hostbatch+":"+config.mongodb.port+"/"+config.mongodb.db_batch;
var shardingUrl=config.mongodb.hostbatch+":30000/admin";

dbonoff.open(common.getLocalBatchDB());
common.getLocalBatchDB().collections(function(err,collection) {
    if (!collection.length) {
        common.db.close();
	    common.getLocalBatchDB().close();
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
    //print(eventCmd);
    eventEmitter.emit('executeCmd', eventCmd);
    //print(sessionCmd);
    eventEmitter.emit('executeCmd', sessionCmd);
    //print(shardingCmd);
    //eventEmitter.emit('executeCmd', shardingCmd);

    dbonoff.close(common.getLocalBatchDB());
});