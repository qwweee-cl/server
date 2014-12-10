var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    events = require('events'),
    moment = require('moment'),
    momentz = require('moment-timezone'),
    eventEmitter = new events.EventEmitter(),
    print = console.log;

function insertData(dbs, collectionName, data, id, op) {
    var opSet = {};
    opSet[op] = data;
    //print(JSON.stringify(data[id]["53e48d94910640743c000001"]["2014"]["10"]["e"]));
    dbonoff.open(dbs);
    dbs.collection(collectionName).update({'_id': id}, opSet, {'upsert': true}, function (err, object) {
        if (err){
            console.log(err);
        }
        dbonoff.close(dbs);
    });
}

function saveSessions(oem_countly_db, id) {
    dbonoff.open(oem_countly_db);
    oem_countly_db.collection('sessions').find().toArray(function (err, data) {
        if (err || !data.length) {
            print("no data "+oem_countly_db.tag);
            dbonoff.close(oem_countly_db);
            return;
        }
        var saveData = {};
        var dateStr = tmpMoment.format("YYYYMMDD");
        var collectionName = oem_countly_db.tag+'_sessions';
        //print(now);
        print(tmpMoment.format());
        //print(data.length);
        var tmp_dateStr = {};
        for(var i=0;i<data.length;i++) {
            //print(data[i]);
            var data_id = data[i]._id;
            tmp_dateStr[data_id] = data[i];
        }
        saveData[dateStr] = tmp_dateStr;
        
        //print(JSON.stringify(tmp_dateStr));
        var dbs = common.db_report;
        insertData(dbs, collectionName, saveData, dateStr, '$set');
        
        dbonoff.close(oem_countly_db);
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
eventEmitter.on('saveSessions', saveSessions);
eventEmitter.on('insertData', insertData);

dbonoff.open(common.db);
common.db.collection('oems').find().toArray(function(err, data) {
    if (err || !data.length) {
        print("no data");
        dbonoff.close(common.db);
        return;
    }
    for (var i = 0 ; i < data.length ; i ++) {
        var oem_countly_db = common.getOEMDB(data[i].deal_no);
        saveSessions(oem_countly_db, data[i].deal_no);
    }
    dbonoff.close(common.db);
});

