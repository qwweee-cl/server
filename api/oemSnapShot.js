var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    events = require('events'),
    moment = require('moment'),
    momentz = require('moment-timezone'),
    config = require('./config.js'),
    exec = require('child_process').exec,
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

var now = new Date();
//now = new Date("2014","11","06");
var appTimezone = "America/Denver";
var tmpMoment = momentz(now).tz(appTimezone);
if (0&&tmpMoment.format("D")!=1) {
    print("exit oemSnapShot");
    return;
}
var mongoUrl=config.mongodb.hostbatch+":"+config.mongodb.port+"/"+config.mongodb.db;

//eventEmitter.on('saveSessions', saveSessions);
//eventEmitter.on('insertData', insertData);

dbonoff.open(common.db);
common.db.collection('oems').find().toArray(function(err, data) {
    if (err || !data.length) {
        print("no data");
        dbonoff.close(common.db);
        return;
    }
    for (var i = 0 ; i < data.length ; i ++) {
        var oem_countly_db = common.getOEMDB(data[i].deal_no);
        //saveSessions(oem_countly_db, data[i].deal_no);
        //saveDatabase(oem_countly_db, data[i].deal_no);
        runOEMSnapCommand(data[i].name);
    }
    dbonoff.close(common.db);
});

function runOEMSnapCommand(name) {
    var dateStr = tmpMoment.format("YYYYMM")+'01';
    var command = '/usr/bin/mongo '+mongoUrl+' --eval "\n';
    var omeDBName = 'countly_'+name;
    print(omeDBName);
    command += 'db.copyDatabase(\''+omeDBName+'\', \''+dateStr+'\', \''+config.mongodb.hostbatch+'\');"';
    print(command);
    executeCmd(command);
}