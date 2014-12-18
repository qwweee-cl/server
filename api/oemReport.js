var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    events = require('events'),
    moment = require('moment'),
    momentz = require('moment-timezone'),
    eventEmitter = new events.EventEmitter(),
    print = console.log;

var oemMaps = [];
var oemCount = 0;
var appMaps = [];
var appCount = 0;
var now = new Date();
var appTimezone = "America/Denver";
var tmpMoment = momentz(now).tz(appTimezone);
if (0&&tmpMoment.format("D")!=1) {
    print("exit oemReport");
    return;
}
//eventEmitter.on('saveSessions', saveSessions);
//eventEmitter.on('insertData', insertData);

function getOEMsTable() {
    dbonoff.open(common.db);
    common.db.collection('oems').find().toArray(function(err, data) {
        if (err || !data.length) {
            print("no data");
            dbonoff.close(common.db);
            return;
        }
        for (var i = 0 ; i < data.length ; i ++) {
            var oem_countly_db = common.getOEMDB(data[i].deal_no);
            oemMaps[oemCount] = data[i];
            oemCount++;
        }
        dbonoff.close(common.db);
    });
}

function getAPPsTable() {
    
}