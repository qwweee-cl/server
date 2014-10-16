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
    for (var i=0; i<collection.length; i++) {
        var collectionName = collection[i].collectionName;
        if (collectionName.indexOf(common.rawCollection['event'])>=0) {
            //print("Entering event :"+collectionName);
            eventCmd += "db."+collectionName+".ensureIndex({app_user_id:1});\n";
        } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
            //print("Entering sessions :"+collectionName);
            sessionCmd += "db."+collectionName+".ensureIndex({app_user_id:1,timestamp:1});\n";
        }
    }
    eventCmd += '"';
    sessionCmd += '"';
    //print(eventCmd);
    eventEmitter.emit('executeCmd', eventCmd);
    //print(sessionCmd);
    eventEmitter.emit('executeCmd', sessionCmd);

    dbonoff.close(common.db_batch);
});