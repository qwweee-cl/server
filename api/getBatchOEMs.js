var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

dbonoff.open(common.db);
common.db.collection('oems').find().toArray(
    function(err, data) {
        if (data) {
            var str = "";
            for (i=0; i<data.length; i++) {
                var oemdb1 = common.getOEMBatchDB(data[i].deal_no);
                str += oemdb1.tag+", ";
            }
            print(str);
        } else {
        }
        dbonoff.close(common.db);
});

