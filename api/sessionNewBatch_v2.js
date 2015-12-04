var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    dbonoff = require('./utils/dbonoff.js'),
	dbs = {},
    //debug = require('./utils/cl/debug.js'),
    ObjectID = require('mongodb').ObjectID,
    countlyApi = {
        data:{
            usage:require('./parts/data/usage.js'),
            fetch:require('./parts/data/fetch.js'),
            events:require('./parts/data/events.js')
        },
        mgmt:{
            users:require('./parts/mgmt/users.js'),
        }
    };
    
var fs = require('fs');
var readline = require('readline');

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

var date = new Date();
console.log(date.toString());
var begin_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()-60);
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);

//console.log('proc_date = '+begin_date+':'+end_date);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
//var bid = new ObjectID('542a50d9981a3d812e000006');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');
//var eid = new ObjectID('542a50e0981a3d812e000007');
var log_id = '000000000000000000000000';

dbs.batch = common.getLocalBatchDB(); // batch raw log
dbs.save = common.getGenericDB(); // dashboard
dbs.base = common.db; // apps
dbs.raw = common.getLocalRawDB(); // live raw log

/*var startStr = "2014-10-06T00:00-07:00",
    endStr = "2014-10-07T00:00-07:00",
    startDate = new Date(Date.parse(startStr)),
    endDate = new Date(Date.parse(endStr)),
    moment = require('moment'),
    zone = "-0700",
    timezone = "",
    startI = 06,
    endI = 06,
    mstart = moment(startDate).zone(zone),
    mend = moment(endDate).zone(zone);
    startSec = startDate.getTime()/1000;
    endSec = endDate.getTime()/1000;
    bid = new ObjectID(startSec.toString(16)+'0000000000000000');
    eid = new ObjectID(endSec.toString(16)+'0000000000000000');*/
console.log("raw:"+dbs.raw.tag);
console.log("batch:"+dbs.batch.tag);

var isDebug = common.config.api.cl_is_debug || false;
var oidFileName = '_next_oid';
var hasOidFile = false;

var YCPDB = common.getYCPBatchDB();
var CountlyDB = common.db;

function processEvents(dbs, app, isFinal, appinfo) {
    //console.log('entering events');
    process.nextTick(function() {
        var apps = app;
        var final = isFinal;
        var appinfos = appinfo;
    	//console.log('isFinale='+final);
    	countlyApi.data.events.processEvents(dbs, apps, final, appinfos);
    });
}
var userCount1 = 0;
var userCount2 = 0;
var ios = null;
var android = null;
function processSessions(dbs, app, isFinal, appinfo) {
    //console.log('entering sessions');
    //console.log(app[0].app_user_id);
    /*
    if (isFinal) {
        //process.emit('hi_mongo');
        console.log('Count1:'+userCount1);
        console.log(android);
        console.log('Count2:'+userCount2);
        console.log(ios);
    }*/
    var appUserId = app[0].app_user_id || null;
/*    if (appinfo.key=="75edfca17dfbe875e63a66633ed6b00e30adcb92") { // Android
        userCount1++;
        android = appinfo;
        YCPDB.collection('raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599').findOne({'app_user_id': appUserId},
            function (err, raw){
                if (err) {
                    console.log(err);
                    return false;
                }
                if (raw) {
                    dbonoff.on('raw');
                    CountlyDB.collection('app_users543f37d0a62268c51e16d053').findOne({'app_user_id': appUserId},
                        function (err, dbAppUser){
                            if (err) {
                                console.log(err);
                                return false;
                            }
                            if (dbAppUser) {
                                process.nextTick(function() {
                                    var apps = app;
                                    var final = isFinal;
                                    var appinfos = appinfo;
                                    //console.log(appinfos);
                                    //console.log("Android:"+appUserId);
                                    countlyApi.data.usage.processSession(dbs, apps, final, appinfos, false);
                                    dbonoff.on('raw');
                                });
                            } else {
                                process.nextTick(function() {
                                    var apps = app;
                                    var final = isFinal;
                                    var appinfos = appinfo;
                                    //console.log(appinfos);
                                    countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
                                    dbonoff.on('raw');
                                });
                            }
                    });
                } else {
                    process.nextTick(function() {
                        var apps = app;
                        var final = isFinal;
                        var appinfos = appinfo;
                        //console.log(appinfos);
                        countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
                        dbonoff.on('raw');
                    });
                }
            });
    } else if (appinfo.key=="9219f32e8de29b826faf44eb9b619788e29041bb") { // iOS
        userCount2++;
        ios = appinfo;
        isYMK = 2;
        YCPDB.collection('raw_session_c277de0546df31757ff26a723907bc150add4254').findOne({'app_user_id': appUserId},
            function (err, raw){
                if (err) {
                    console.log(err);
                    return false;
                }
                if (raw) {
                    dbonoff.on('raw');
                    CountlyDB.collection('app_users543f8693a9e5b7ed76000012').findOne({'app_user_id': appUserId},
                        function (err, dbAppUser){
                            if (err) {
                                console.log(err);
                                return false;
                            }
                            if (dbAppUser) {
                                process.nextTick(function() {
                                    var apps = app;
                                    var final = isFinal;
                                    var appinfos = appinfo;
                                    //console.log(appinfos);
                                    //console.log("iOS:"+appUserId);
                                    countlyApi.data.usage.processSession(dbs, apps, final, appinfos, false);
                                    dbonoff.on('raw');
                                });
                            } else {
                                process.nextTick(function() {
                                    var apps = app;
                                    var final = isFinal;
                                    var appinfos = appinfo;
                                    //console.log(appinfos);
                                    countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
                                    dbonoff.on('raw');
                                });
                            }
                    });
                } else {
                    process.nextTick(function() {
                        var apps = app;
                        var final = isFinal;
                        var appinfos = appinfo;
                        //console.log(appinfos);
                        countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
                        dbonoff.on('raw');
                    });
                }
        });
    } else */
    {
        process.nextTick(function() {
            var apps = app;
            var final = isFinal;
            var appinfos = appinfo;
            countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
            dbonoff.on('raw');
        });
    }
}

function dbClose(dbs) {
    if (dbs.save) {
        dbs.save.close();
    }
    if (dbs.batch) {
        dbs.batch.close();
    }
    if (dbs.base) {
        dbs.base.close();
    }
}

var app_key = process.argv[2] || 'all';
var file_user_id = process.argv[3] || null;

process.setMaxListeners(0);

var arrayAppUserId = [];
var collectionCount = 0;
var collectionNameList = [];
var baseTimeOut = 60000;

var instream = fs.createReadStream(file_user_id);
var rl = readline.createInterface(instream, false);
var prevOne = null;

var readlineCount = 0;
var app_information = null;

rl.on('line', function(line) {
    if(prevOne) {
        if(prevOne == line)
            console.log('line is same as last one before assign.');
        
        var records = JSON.parse(prevOne);
        if(records.length) {
            handleOneSession(records, false);
        }
        else
            console.log('There is empty records.');
    }
    
    if(line)
        prevOne = line;
    
    readlineCount ++;
});

rl.on('close', function() {
    if(prevOne) { // final one
        var records = JSON.parse(prevOne);
        if(records.length) {
            console.log('Final one: ' + prevOne[0].app_user_id);
            handleOneSession(records, true);
        }
    }
    console.log('End of file.');
    console.log('read line count: '+ readlineCount);
});

var handleOneSession = function(records, isFinal) {
    if(!app_information) {
        dbs.base.collection('apps').findOne({key:app_key},
            function(err, res) {
                app_information = res;
                processSessions(dbs, records, isFinal, res);
            });
    }
    else
        processSessions(dbs, records, isFinal, app_information);
};

if (app_key == "895ef49612e79d93c462c6d34abd8949b4c849af" ||
    app_key == "ecc26ef108c821f3aadc5e283c512ee68be7d43e" ||
    app_key == "488fea5101de4a8226718db0611c2ff2daeca06a" ||
    app_key == "7cd568771523a0621abff9ae3f95daf3a8694392") {
    wait_cnt = 10;
}

wait_cnt = 40;
baseTimeOut = 60000;
var cnt=0;
var repeat_times = 0;
setInterval(function() {
    if (collectionCount <= 0) {
        var new_cnt = dbonoff.getCnt('raw');
        if (new_cnt == cnt) {
                repeat_times++;
                console.log('repeat wait = ' + repeat_times);
            } else {
                cnt = new_cnt;
                repeat_times = 0;
            }
    if (repeat_times == (wait_cnt-2)) {
        var date1 = new Date();
        console.log(date.toString());
        console.log(date1.toString());
    }
        if (repeat_times > wait_cnt) {
            console.log("Leave sessionNewBatch_Test.js");
            dbClose(dbs);
            process.exit(0);
        }
    }
}, baseTimeOut);


