var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    dbonoff = require('./utils/dbonoff.js'),
	dbs = {},
    //debug = require('./utils/cl/debug.js'),
    ObjectID = require('mongodb').ObjectID,
    print = console.log,
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

var isDebug = common.config.api.cl_is_debug || false;
var oidFileName = '_next_oid';
var hasOidFile = false;

var YCPDB = common.getYCPBatchDB();
var CountlyDB = common.db;

var app_key;

if (process.argv.length < 3) {
    print("no parameter");
    print('Please alow "node hourlySessionNewBatch.js dbName"');
    return false;
}
var db_batch;
if (process.argv.length < 4) {
    if (isDebug) {
        console.log('no app key parameter');
        //debug.writeLog('/usr/local/countly/log/batch.log', "no app id parameter");
        process.exit(1);
    } else { //batch processing all
        app_key = 'all';
        db_batch = process.argv[2];
    }
} else { //process only one APP
    app_key = process.argv[2];
    db_batch = process.argv[3];
}



dbs.batch = common.getDBByName(db_batch); // batch raw log
dbs.save = common.getGenericDB(); // dashboard
dbs.base = common.db; // apps
dbs.raw = common.getLocalRawDB(); // live raw log

console.log("raw:"+dbs.raw.tag);
console.log("batch:"+dbs.batch.tag);

process.setMaxListeners(0);
if (isDebug) {
    oidFileName = oidFileName + process.argv[2];
}

var collectionCount = 0;
var collectionNameList = [];
var baseTimeOut = 60000;
var wait_cnt = common.config.api.cl_wait_time;

fs.readFile(oidFileName, 'utf8', function (err,data) {
    if (!err && data.length>=24) {
    	hasOidFile = true;
    	console.log('data:'+data+':'+data.length);
    	bid = new ObjectID(data.substr(0,24));
    	if (data.length >= 48) {
    	    eid = new ObjectID(data.substr(25,24));
    	}
    }

    if (app_key == 'all') {
        process.on("hi_mongo", callRaw);
     	//wait_cnt = wait_cnt * 5; // wait 5 times for all logs
        dbs.batch.collections(function(err,collection) {
            if (!collection.length) {
                console.log('no data');
                //dbClose(dbs);
                //process.exit(1);
                process.emit('hi_mongo');
            }
            for (var i=0; i<collection.length; i++) {
                if (collection[i].collectionName == 'raw_session_53f554ef847577512100130a') continue;
/*
                if (collection[i].collectionName.indexOf("e315c111663af26a53e5fe4c82cc1baeecf50599")>=0 ||
                    collection[i].collectionName.indexOf("c277de0546df31757ff26a723907bc150add4254")>=0 ||
                    collection[i].collectionName.indexOf("75edfca17dfbe875e63a66633ed6b00e30adcb92")>=0 ||
                    collection[i].collectionName.indexOf("9219f32e8de29b826faf44eb9b619788e29041bb")>=0) 
                    continue;
*/
                //if (collection[i].collectionName.indexOf("9219f32e8de29b826faf44eb9b619788e29041bb")>=0 ||
                //    collection[i].collectionName.indexOf("75edfca17dfbe875e63a66633ed6b00e30adcb92")>=0) {
                    if (collection[i].collectionName.indexOf(common.rawCollection['event'])>=0) {
                        collectionNameList[collectionCount++] = collection[i].collectionName;
                    }
                //}
            }
            collectionNameList.sort();
            console.log(collectionNameList);
            callRaw();
        });
    } else {
        wait_cnt = 10;
        baseTimeOut = 5000;
        dbs.base.collection('apps').findOne({key:app_key},
            function(err, res) {
                console.log(res);
                console.log('here'+common.rawCollection['event']+app_key);
                processRaw(dbs, common.rawCollection['event']+app_key, processEvents,{app_user_id:1}, res);
                //processRaw(dbs, common.rawCollection['session']+app_key, processSessions, {app_user_id:1, timestamp:1}, res);
             }
        );
    }
});
baseTimeOut = 30000;
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
            dbClose(dbs);
            process.exit(0);
        }
    }
}, baseTimeOut);


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
    if (isFinal) {
        //process.emit('hi_mongo');
        console.log('Count1:'+userCount1);
        console.log(android);
        console.log('Count2:'+userCount2);
        console.log(ios);
    }
    var appUserId = app[0].app_user_id;
    /*if (appinfo.key=="75edfca17dfbe875e63a66633ed6b00e30adcb92") { // Android
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
            //console.log(appinfos);
            countlyApi.data.usage.processSession(dbs, apps, final, appinfos, true);
            dbonoff.on('raw');
        });
    }
}

function processRaw(dbs, collectionName, processData, sortOrder, appinfo) {
    //debug.writeLog('/usr/local/countly/log/batch.log', collectionName+":bid = "+bid+" eid = "+eid+" date:"+date.toString());
    console.log(collectionName+":bid = "+bid+" eid = "+eid);
    try {
        var b_coll = dbs.batch.collection(collectionName);
        var curr_app_user = null;
        var isFirst = true;
        var apps = [];
        b_coll.find({_id:{$lt:eid, $gte:bid}},{batchSize:1000}).sort(sortOrder).each(
            function(err, res) {
                var appinfos = appinfo;
                if (err) {
                    console.log(collectionName+'[process error:]'+err);
                    return false;
                }
                if (!res) { //end of collection
                    if (isFirst) { //no data
                        console.log('No data');
                        return false;
                    }
                    /*if (collectionName == 'raw_session_54002336f036d1673f003768') {
                        console.log(apps);
                    }*/

                    //console.log(apps);
                    processData(dbs, apps, true, appinfos);

                    //_next_oid logging
                    if (isDebug) {
                        var cnt = apps.length - 1;
                        console.log(apps[cnt]._id+" : "+log_id);
                        if (apps[cnt]._id > log_id) {
                            log_id = apps[cnt]._id;
                            console.log("change "+log_id);
                        } else {
                            console.log("no change "+log_id);
                        }
                        fs.writeFile(oidFileName, log_id, function(err){});
                        console.log(oidFileName+" write finished "+log_id);
                    }
                    return true;
                }

                if (isFirst) {
                    curr_app_user = res.app_user_id;
                    isFirst = false;
                } else {
                    if (res.app_user_id != curr_app_user) {
                        //console.log('loglist='+apps.length);
                        //console.log(apps);
                        /*if (collectionName == 'raw_session_54002336f036d1673f003768') {
                            console.log(apps);
                        }*/
                        processData(dbs, apps, false, appinfos);
                        if (isDebug) {
                            var cnt = apps.length - 1;
                            console.log(apps[cnt]._id+" : "+log_id);
                            if (apps[cnt]._id > log_id) {
                                log_id = apps[cnt]._id;
                                console.log("change "+log_id);
                            } else {
                                console.log("no change "+log_id);
                            }
                        }
                        curr_app_user = res.app_user_id;
                        apps = [];
                    }
                }
                apps[apps.length] = res;
        });
    } catch (e) {
        console.log('[processRaw]'+e);
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

function callRaw() {
    collectionCount--;
    console.log("hi mongo:" + collectionCount);
    console.log("Start Date: "+(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')));
    if (collectionCount < 0) //last one is finished
        return;
    var collectionName = collectionNameList[collectionCount];
    if (collectionName.indexOf(common.rawCollection['event'])>=0) {
        var keys = collectionName.substr(common.rawCollection['event'].length).trim();
            dbs.base.collection('apps').findOne({key:keys}, function(err, res) {
                    //console.log('collName:'+collName);
                    if (res) {
                        processRaw(dbs, collectionName, processEvents, {app_user_id:1}, res);
                    } else {
                        console.log("[event] "+keys+" can't found a appinfo");
                        process.emit('hi_mongo');
                    }
                }
            );
    } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
        var keys = collectionName.substr(common.rawCollection['session'].length).trim();
        dbs.base.collection('apps').findOne({key:keys}, function(err, res) {
                if (res) {
                    processRaw(dbs, collectionName, processSessions, {app_user_id:1, timestamp:1}, res);
                } else {
                    console.log("[session] "+keys+" can't found a appinfo");
                    process.emit('hi_mongo');
                }
            }
        );
    }
}
