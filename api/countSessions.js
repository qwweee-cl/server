var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    ObjectID = require('mongodb').ObjectID;

var e_log = console.error,
    log = console.log;

var db = common.getLocalBatchDB();

var app_key = process.argv[2] || 0;
if (!app_key) {
	e_log("No app key, exit.");
	process.exit(1);
}

var date = new Date();
var begin_date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 60);
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);

var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');

dbonoff.open(db);
var colName = "raw_session_"+app_key;
var col = db.collection(colName);

var startTime = new Date().getTime();

col.find({_id:{$lt:eid, $gte:bid}}).count(function(e_count, cnt){
    if(e_count) {
        e_log("Get total count with error: " + e_count);
    }
    else {
        log("Total Session Count: " + cnt);
    }
    exitCloseDB();
});

function exitCloseDB() {
    var endTime = new Date().getTime();
	log("Total Time lapsed: "+(endTime-startTime));
    
	dbonoff.close(db);
	process.exit(1);
}


