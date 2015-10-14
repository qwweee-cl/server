var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};
if (process.argv.length != 3) {
	print("no parameter");
	return false;
}
var indbname = process.argv[2];
query = {dbname: indbname};
//print(query);

dbonoff.open(common.db_maintain);
common.db_maintain.collection('raw_finished').remove(query ,function(err, res) {
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
common.db_maintain.collection("backup_finished").update({dbname: indbname},
{$set: insertData}, {'upsert': true}, function(err, res) {
    if (err) {
        print('raw_finished error');
        print(err);
    }
    dbonoff.close(common.db_maintain);
});

