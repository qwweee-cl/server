var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

dbonoff.open(common.db);
common.db.collection('apps').find().toArray(
    function(err, data) {
        if (data) {
            var str = "";
            for (i=0; i<data.length; i++) {
                if (data[i]._id == "53f554ef847577512100130a") continue;
                str += data[i]._id+", ";
            }
            print(str);
        } else {
        }
        dbonoff.close(common.db);
});

