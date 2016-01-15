var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};
if (process.argv.length != 4) {
	print("no parameter");
	return false;
}
var indbname = process.argv[2];
var collectionName = 'raw_finished'+process.argv[3];
var collectionNameTest = 'raw_finished_test'+process.argv[3];
var backupColName = "backup_finished"+process.argv[3];
var backupColNameTest = "backup_finished_test"+process.argv[3];
query = {dbname: indbname};
//print(query);

dbonoff.open(common.db_maintain);
common.db_maintain.collection(collectionName).remove(query ,function(err, res) {
    if(res) {
        print(res);
    }
    if(err) {
    	print(err);
    }
    dbonoff.close(common.db_maintain);
});

common.db_maintain.collection(collectionNameTest).remove(query ,function(err, res) {
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
insertData.timestamp = Math.floor(Date.now()/1000);
dbonoff.open(common.db_maintain);
common.db_maintain.collection(backupColName).update({dbname: indbname},
{$set: insertData}, {'upsert': true}, function(err, res) {
    if (err) {
        print('backup_finished error');
        print(err);
    }
    dbonoff.close(common.db_maintain);
});

dbonoff.open(common.db_maintain);
common.db_maintain.collection(backupColNameTest).update({dbname: indbname},
{$set: insertData}, {'upsert': true}, function(err, res) {
    if (err) {
        print('backup_finished_test error');
        print(err);
    }
    dbonoff.close(common.db_maintain);
});

