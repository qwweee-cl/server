var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var query = {};

if (process.argv.length != 5) {
    console.log("Update Session Status: Invalid Parameters Timestame(1234567890) IndexNumber(1 or 2) OEM name(medion, intex, Cheetah)");
    process.exit(1);
}
var inTime = parseInt(process.argv[2]);
var collectionName = 'backup_oem_finished'+process.argv[3];
var oemName = process.argv[4];
query = {$and: [{timestamp: {$lte: inTime}}, {dbname: {$regex: oemName}}]};

dbonoff.open(common.db_maintain);
common.db_maintain.collection(collectionName).findOne(query, function(err, res) {
    if(res) {
        print(res.dbname);
    } else {
//        print(err);
    }
    dbonoff.close(common.db_maintain);
});

