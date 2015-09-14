var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    momentz = require('moment-timezone'),
    print = console.log;

var appTimezone = "America/Denver";
var currDate = new Date();
var tmpMoment = momentz(currDate).tz(appTimezone);
var query = {};
if (process.argv.length != 3) {
    print("no parameter");
    return false;
}
var backup_time = process.argv[2];


dbonoff.open(common.db_maintain);
//common.db_maintain.collection("dashboard_finished").find({backupTime: backup_time}, function(err, res) {
common.db_maintain.collection("dashboard_finished").findOne({backupTime: {'$regex': backup_time}}, function(err, res) {
    if (err) {
        print('session_finished error');
        print(err);
    }
    if (!res) {
        print("null");
    } else {
        if (res.endTime) {
            print(res.endTime);
        } else {
            print("null");
        }
    }
    dbonoff.close(common.db_maintain);
});
