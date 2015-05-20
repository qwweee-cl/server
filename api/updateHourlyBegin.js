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
var indbname = process.argv[2];
query = {dbname: indbname};
//print(query);

dbonoff.open(common.db_maintain);
common.db_maintain.collection('backup_finished').find(query ,function(err, res) {
    if(res) {
        //print(res);
        var insertData = {};
        insertData.dbname = indbname;
        insertData.beginTime = tmpMoment.format("YYYY-MM-DD HH:mm");

        dbonoff.open(common.db_maintain);
        common.db_maintain.collection("session_finished").update({dbname: indbname},
        {$set: insertData}, {'upsert': true}, function(err, res) {
            if (err) {
                print('session_finished error');
                print(err);
            }
            dbonoff.close(common.db_maintain);
        });
    } else {
        print("on backup_finished no db: "+indbname);
        process.exit(1);
    }
    if(err) {
    	print(err);
    }
    dbonoff.close(common.db_maintain);
});
