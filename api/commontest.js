var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var dbInstance = common.getDBByName("countly_Java");

print(dbInstance.tag);
dbonoff.open(dbInstance);
dbInstance.collections(function(err,collection) {
    if (!collection.length) {
        common.db.close();
	    print('no data');
        return;
    }
    for (var i=0; i<collection.length; i++) {
        var collectionName = collection[i].collectionName;
        print(collectionName);
    }
    dbonoff.close(dbInstance);
});