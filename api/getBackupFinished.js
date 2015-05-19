var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};

if (process.argv.length == 3) {
    //print(process.argv[2]);
    var inTime = parseInt(process.argv[2]);
    query = {timestamp: {$lte: inTime}};
}

dbonoff.open(common.db_maintain);
common.db_maintain.collection('backup_finished').findOne(query, function(err, res) {
    if(res) {
        print(res.dbname);
    } else {
    }
    dbonoff.close(common.db_maintain);
});

