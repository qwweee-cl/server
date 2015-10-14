var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    momentz = require('moment-timezone'),
    print = console.log;

var appTimezone = "America/Denver";
var currDate = new Date();
var tmpMoment = momentz(currDate).tz(appTimezone);
var query = {};
if (process.argv.length != 4) {
    print("no parameter");
    return false;
}
var dbname = process.argv[2];
var dbIndex = process.argv[3];
var collectionName = "session_finished"+dbIndex;


dbonoff.open(common.db_maintain);
//common.db_maintain.collection("dashboard_finished").find({backupTime: backup_time}, function(err, res) {
common.db_maintain.collection(collectionName).findOne({dbname: {'$regex': dbname}}, function(err, res) {
    if (err) {
        print('session_finished error');
        print(err);
    }
    if (!res) {
        print("null");
    } else {
        //print(res);
        if (res.removed) {
            print(res.removed);
        } else {
            print("null");
        }
    }
    dbonoff.close(common.db_maintain);
});
