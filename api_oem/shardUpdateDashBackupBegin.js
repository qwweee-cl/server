var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    momentz = require('moment-timezone'),
    print = console.log;

var appTimezone = "America/Denver";
var currDate = new Date();
var tmpMoment = momentz(currDate).tz(appTimezone);
var query = {};
if (process.argv.length != 5) {
	print("no parameter");
	return false;
}
var backup_time = process.argv[2];
var clad1_findOne = process.argv[3];
var clad2_findOne = process.argv[4];

var insertData = {};
insertData.backupTime = backup_time;
insertData.beginTime = tmpMoment.format("YYYY-MM-DD HH:mm");
insertData.clad1 = clad1_findOne;
insertData.clad2 = clad2_findOne;

dbonoff.open(common.db_maintain);
common.db_maintain.collection("dashboard_finished").update({backupTime: backup_time},
{$set: insertData}, {'upsert': true}, function(err, res) {
    if (err) {
        print('session_finished error');
        print(err);
    }
    dbonoff.close(common.db_maintain);
});
