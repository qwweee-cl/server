var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    dbonoff = require('./utils/dbonoff.js'),
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
console.log("raw:"+common.db_raw._dbconn.databaseName);
console.log("batch:"+common.db_batch._dbconn.databaseName);

var isDebug = common.config.api.cl_is_debug || false;
var oidFileName = '_next_oid';
var hasOidFile = false;

function processEvents(app, isFinal, appinfo) {
    //console.log('entering events');
    process.nextTick(function() {
        var apps = app;
        var final = isFinal;
        var appinfos = appinfo;
    	//console.log('isFinale='+final);
    	countlyApi.data.events.processEvents(apps, final, appinfos);
    });
}

function processSessions(app, isFinal, appinfo) {
    //console.log('entering sessions');
    process.nextTick(function() {
        var apps = app;
        var final = isFinal;
        var appinfos = appinfo;
    	//console.log(appinfos);
       	countlyApi.data.usage.processSession(apps, final, appinfos);
    });
}

function processRaw(collectionName, processData, sortOrder, appinfo) {
    //debug.writeLog('/usr/local/countly/log/batch.log', collectionName+":bid = "+bid+" eid = "+eid+" date:"+date.toString());
    console.log(collectionName+":bid = "+bid+" eid = "+eid);
    try {
    	var b_coll = common.db_batch.collection(collectionName);
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
            		var cnt = apps.length - 1;
                    /*if (collectionName == 'raw_session_54002336f036d1673f003768') {
                        console.log(apps);
                    }*/

                    //console.log(apps);
                	processData(apps, true, appinfos);

                    //_next_oid logging
        	        if (isDebug || (hasOidFile && apps[cnt]._id > log_id)) {
            		    log_id = apps[cnt]._id;
            		    fs.writeFile(oidFileName, log_id, function(err){});
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
                        processData(apps, false, appinfos);
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

function dbClose() {
    common.db.close();
    common.db_batch.close();
}

function callRaw() {
    collectionCount--;
    console.log("hi mongo:" + collectionCount);
    if (collectionCount < 0) //last one is finished
        return;
    var collectionName = collectionNameList[collectionCount];
    if (collectionName.indexOf(common.rawCollection['event'])>=0) {
        var keys = collectionName.substr(common.rawCollection['event'].length).trim();
            common.db.collection('apps').findOne({key:keys}, function(err, res) {
                    //console.log('collName:'+collName);
                    processRaw(collectionName, processEvents, {app_user_id:1}, res);
                }
            );
    } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
        var keys = collectionName.substr(common.rawCollection['session'].length).trim();
        common.db.collection('apps').findOne({key:keys}, function(err, res) {
                processRaw(collectionName, processSessions, {app_user_id:1, timestamp:1}, res);
            }
        );
    }
}


var app_key;
if (process.argv.length < 3) {
    if (isDebug) {
        console.log('no app key parameter');
        //debug.writeLog('/usr/local/countly/log/batch.log', "no app id parameter");
        process.exit(1);
    } else { //batch processing all
        app_key = 'all';
    }
} else { //process only one APP
    app_key = process.argv[2];
}

process.setMaxListeners(0);
if (isDebug) {
    oidFileName = oidFileName + process.argv[2];
}

var collectionCount = 0;
var collectionNameList = [];

fs.readFile(oidFileName, 'utf8', function (err,data) {
    if (!err && data.length>=24) {
    	hasOidFile = true;
    	console.log('data:'+data+':'+data.length);
    	bid = new ObjectID(data.substr(0,24));
    	if (data.length >= 48) {
    	    eid = new ObjectID(data.substr(25,24));
    	}
    }

    var wait_cnt = common.config.api.cl_wait_time;
    if (app_key == 'all') {
        process.on("hi_mongo", callRaw);
     	//wait_cnt = wait_cnt * 5; // wait 5 times for all logs
        common.db_batch.collections(function(err,collection) {
            if (!collection.length) {
            	console.log('no data');
            	dbClose();
            	process.exit(1);
            }
            for (var i=0; i<collection.length; i++) {
                if (collection[i].collectionName == 'raw_session_53f554ef847577512100130a') continue;
                if (collection[i].collectionName.indexOf(common.rawCollection['raw'])>=0) {
                    collectionNameList[collectionCount++] = collection[i].collectionName;
                }
            }
            callRaw();
        });
    } else {
        common.db.collection('apps').findOne({key:app_key},
            function(err, res) {
                console.log(res);
                console.log('here'+common.rawCollection['session']+app_key);
                processRaw(common.rawCollection['event']+app_key, processEvents,{app_user_id:1}, res);
                processRaw(common.rawCollection['session']+app_key, processSessions, {app_user_id:1, timestamp:1}, res);
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
		    console.log(date1.toString());
		}
        	if (repeat_times > wait_cnt) {
        	    dbClose();
        	    process.exit(0);
        	}
        }
    }, 60000);
});


