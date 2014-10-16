var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    dbonoff = require('./utils/dbonoff.js'),
    debug = require('./utils/cl/debug.js'),
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
var eFin = false;
var sFin = false;

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

var date = new Date();
var begin_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()-30);
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);
//console.log('proc_date = '+begin_date+':'+end_date);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
//var bid = new ObjectID('542a50d9981a3d812e000006');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');
//var eid = new ObjectID('542a50e0981a3d812e000007');
var log_id = '000000000000000000000000';
var hasOidFile = false;

console.log("raw:"+common.db_raw._dbconn.databaseName);
console.log("batch:"+common.db_batch._dbconn.databaseName);

function processEvents(app, isFinal) {
    console.log('entering events');
    var apps = app;
    var final = isFinal;
    process.nextTick(function() {
	console.log('isFinale='+final);
	countlyApi.data.events.processEvents(apps, final);
    });
}

function processSessions(app, isFinal) {
    console.log('entering sessions');
    var apps = app;
    var final = isFinal;
    process.nextTick(function() {
	console.log('isFinale='+final);
   	countlyApi.data.usage.processSession(apps, final);
    });
}

function processRaw(collectionName, processData, sortOrder) {
    debug.writeLog('../log/batch.log', collectionName+":bid = "+bid+" eid = "+eid+" date:"+date.toString());
    console.log(collectionName+":bid = "+bid+" eid = "+eid);
    try {
	var curr_app_user = null;
        var isFirst = true;
	var apps = [];
	var b_coll = common.db_batch.collection(collectionName);
	b_coll.find({_id:{$lt:eid, $gte:bid}},{batchSize:1000}).sort(sortOrder).each(function(err, res) {
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
                console.log('loglist='+cnt);
            	processData(apps, true);

		//_next_oid logging
	        if (hasOidFile && apps[cnt]._id > log_id) {
		    log_id = apps[cnt]._id;
		    fs.writeFile("./_next_oid", log_id, function(err){});
    		}
		return true;
       	    }

	    if (isFirst) {
		curr_app_user = res.app_user_id;
		isFirst = false;
	    } else {
        	if (res.app_user_id != curr_app_user) {
                    console.log('loglist='+apps.length);
                    processData(apps, false);
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

process.setMaxListeners(0);
fs.readFile('./_next_oid', 'utf8', function (err,data) {
    if (!err && data.length>=24) {
    	hasOidFile = true;
    	console.log('data:'+data+':'+data.length);
    	bid = new ObjectID(data.substr(0,24));
    	if (data.length >= 48) {
    	    eid = new ObjectID(data.substr(25,24));
    	}
    }

    if (process.argv.length < 3) {
	console.log('no app id parameter');
        debug.writeLog('/usr/local/countly/log/batch.log', "no app id parameter");
	process.exit(1);
    }

    var wait_cnt = common.config.api.cl_wait_time;
    if (process.argv[2] == 'all') {
     	wait_cnt = wait_cnt * 5; // wait 5 times for all logs
	common.db_batch.collections(function(err,collection) {
            if (!collection.length) {
            	console.log('no data');
            	dbClose();
            	process.exit(1);
            }

            for (var i=0; i<collection.length; i++) {
                var collectionName = collection[i].collectionName;
                //exclude IPSentry
                if (collectionName == 'raw_session_53f554ef847577512100130a') continue;
                if (collectionName.indexOf(common.rawCollection['event'])>=0) {
                    console.log("Entering event :"+collectionName);
                    processRaw(collectionName, processEvents,{app_user_id:1});
                } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
                    console.log("Entering sessions :"+collectionName);
                    processRaw(collectionName, processSessions, {app_user_id:1, timestamp:1});
                }
            }
	});
    } else {
        var app_id = process.argv[2];
    	processRaw('raw_session_'+app_id, processSessions, {app_user_id:1, timestamp:1});
    	processRaw('raw_event_'+app_id, processEvents,{app_user_id:1});
    }
    var cnt=0;
    var repeat_times = 0;
    setInterval(function() {
	var new_cnt = dbonoff.getCnt('raw');
	if (new_cnt == cnt) {
	    repeat_times++;
	    console.log('repeat wait = ' + repeat_times);
	} else cnt = new_cnt;
	if (repeat_times > wait_cnt) {
	    dbClose();
	    process.exit(0);
	}
    }, 60000);
});


