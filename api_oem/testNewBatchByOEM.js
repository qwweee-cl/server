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

//dbs.batch = common.db_batch; // batch raw log
//dbs.save = common.getGenericDB(); // dashboard
//dbs.base = common.db; // apps
//dbs.raw = common.db_raw // live raw log

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
//console.log("raw:"+dbs.raw._dbconn.databaseName);
//console.log("batch:"+dbs.batch._dbconn.databaseName);

var isDebug = common.config.api.cl_is_debug || false;
var oidFileName = '_oem_next_oid';
var hasOidFile = false;

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

function processSessions(dbs, app, isFinal, appinfo) {
    //console.log('entering sessions');
    process.nextTick(function() {
        var apps = app;
        var final = isFinal;
        var appinfos = appinfo;
    	//console.log(appinfos);
       	countlyApi.data.usage.processSession(dbs, apps, final, appinfos);
    });
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


var app_key;
var oem_app_key;
var caseValue = 0;
if (process.argv.length < 3) {
    console.log('no app key parameter');
    process.exit(0);
} else if (process.argv.length == 4) { //process only one OEM DB
    app_key = process.argv[2];
    oem_app_key = process.argv[3];
    app_key = app_key.replace(/system\.|\.\.|\$/g, "");
    oem_app_key = oem_app_key.replace(/system\.|\.\.|\$/g, "");
    caseValue = 2;
} else if (process.argv.length == 3) {
    app_key = process.argv[2];
    app_key = app_key.replace(/system\.|\.\.|\$/g, "");
    caseValue = 1;
}

process.setMaxListeners(0);
if (isDebug) {
    oidFileName = oidFileName + process.argv[2];
}

var collectionCount = 0;
var collectionNameList = [];
var baseTimeOut = 5000;

fs.readFile(oidFileName, 'utf8', function (err,data) {
    if (!err && data.length>=24) {
    	hasOidFile = true;
    	console.log('data:'+data+':'+data.length);
    	bid = new ObjectID(data.substr(0,24));
    	if (data.length >= 48) {
    	    eid = new ObjectID(data.substr(25,24));
    	}
    }
    var wait_cnt = 15;
    if (caseValue == 1) {
        console.log("process oem all apps");
        dbs.batch = common.getOEMBatchDB(app_key); // batch raw log
        dbs.save = common.getOEMDB(app_key); // dashboard
        dbs.base = common.db; // apps
        dbs.raw = common.getLocalRawDB(); // live raw log
        console.log("raw:"+dbs.raw.tag);
        console.log("batch:"+dbs.batch.tag);
        process.on("hi_mongo", callRaw);
     	//wait_cnt = wait_cnt * 5; // wait 5 times for all logs
        dbs.batch.collections(function(err,collection) {
            if (!collection.length) {
            	console.log('no data');
            	dbClose(dbs);
            	process.exit(0);
            }
            for (var i=0; i<collection.length; i++) {
                if (collection[i].collectionName == 'raw_session_53f554ef847577512100130a') continue;
                if (collection[i].collectionName.indexOf(common.rawCollection['raw'])>=0) {
                    collectionNameList[collectionCount++] = collection[i].collectionName;
                }
            }
            collectionNameList.sort();
            console.log(collectionNameList);
            callRaw();
        });
    } else if (caseValue == 2) {
        wait_cnt = 10;
        baseTimeOut = 5000;
        dbs.batch = common.getOEMBatchDB(app_key); // batch raw log
        dbs.save = common.getOEMDB(app_key); // dashboard
        dbs.base = common.db; // apps
        dbs.raw = common.getLocalRawDB(); // live raw log
        console.log("raw:"+dbs.raw.tag);
        console.log("batch:"+dbs.batch.tag);
        console.log("save:"+dbs.save.tag);
        console.log("process oem "+app_key+" apps "+oem_app_key);
        dbs.base.collection('apps').findOne({key:oem_app_key},
            function(err, res) {
                console.log(res);
                console.log('here'+common.rawCollection['session']+oem_app_key);
                processRaw(dbs, common.rawCollection['event']+oem_app_key, processEvents,{app_user_id:1}, res);
                processRaw(dbs, common.rawCollection['session']+oem_app_key, processSessions, {app_user_id:1, timestamp:1}, res);
             }
        );
    }

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
});


