var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

dbonoff.open(common.db);
common.db.collection('oems').find().toArray(
    function(err, data) {
        if (data) {
            var str = "";
            for (i=0; i<data.length; i++) {
                str += data[i].deal_no+", ";
            }
            print(str);
        } else {
        }
        dbonoff.close(common.db);
});

