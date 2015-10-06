var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};

if (process.argv.length == 4) {
    //print(process.argv[2]);
    var inTime = parseInt(process.argv[2]);
    query = {timestamp: {$lte: inTime}};
    var collectionName = 'raw_oem_finished'+process.argv[3];
}

dbonoff.open(common.db_maintain);
common.db_maintain.collection(collectionName).findOne(query, function(err, res) {
    if(res) {
        print(res.filename);
    } else {
    }
    dbonoff.close(common.db_maintain);
});

