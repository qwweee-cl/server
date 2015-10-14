var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};
if (process.argv.length != 4) {
	print("no parameter");
	return false;
}
var indbname = process.argv[2];
var backupColName = "backup_oem_finished"+process.argv[3];
var sessionColName = "session_oem_finished"+process.argv[3];
query = {dbname: indbname};
//print(query);

dbonoff.open(common.db_maintain);
common.db_maintain.collection(backupColName).remove(query ,function(err, res) {
    if(res) {
        print(res);
    }
    if(err) {
    	print(err);
    }
    dbonoff.close(common.db_maintain);
});

var insertData = {};
insertData.dbname = indbname;
insertData.removed = true;
dbonoff.open(common.db_maintain);
common.db_maintain.collection(sessionColName).update({dbname: indbname},
{$set: insertData}, {'upsert': true}, function(err, res) {
    if (err) {
        print('session_finished error');
        print(err);
    }
    dbonoff.close(common.db_maintain);
});

