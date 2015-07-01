var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    print = console.log;

var genericdb = common.getGenericDB();
print(genericdb.tag);

