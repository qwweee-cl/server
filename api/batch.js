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

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

var date = new Date();
var begin_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()-7);
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

function processEvents(err, app) {
    //console.log(app);
    if (!app || !app.length) {
        console.log('[processEvents no app]');
        console.log(err);
        return;
    }
    console.log('entering event');
    countlyApi.data.events.processEvents(app);
}

function processSessions(err, app) {
    //console.log(app);
    if (!app || !app.length) {
        console.log('[processSessions no app]');
        console.log(err);
        return;
    }

    var len = app.length-1;
    if (hasOidFile && app[len]._id > log_id) {
	log_id = app[len]._id;
	fs.writeFile("./_next_oid", log_id, function(err){});
    }
    console.log('entering sessions');
    countlyApi.data.usage.processSession(app);
}

function processRaw(collectionName, processData, sortOrder) {
    //console.log('in processRaw:'+collectionName+":"+bid+":"+eid);
    //console.log('sortOrder=%j',sortOrder);
    //console.log('processData type:'+typeof processData);
    debug.writeLog('/usr/local/countly/log/batch.log', "bid = "+bid+" eid = "+eid+" date:"+date.toString());
    console.log("bid = "+bid+" eid = "+eid);
    try {
        common.db_batch.collection(collectionName).find({_id:{$lt:eid, $gte:bid}}).sort(sortOrder).toArray(processData);
    } catch (e) {
        console.log('[processRaw]'+e);
    }
}

function dbClose() {
    common.db.close();
    common.db_batch.close();
}

    function makeSleep(collectionName, processFun, sortOrder, sleepCnt) {
	var cnt=0;
	var repeat_times = 0;
	var int_id = setInterval(function() {
	    var new_cnt = dbonoff.getCnt('raw');
	    if (new_cnt == cnt) {
		repeat_times++;
		console.log('repeat wait = ' + repeat_times);
	    } else cnt = new_cnt;
	    if (repeat_times >= 3*sleepCnt) {
                processRaw(collectionName, processFun, sortOrder);
		dbonoff.setZero('raw');
		clearInterval(int_id);
		return;
	    }
	}, 60000);
    }

fs.readFile('./_next_oid', 'utf8', function (err,data) {
    if (!err && data.length>=24) {
    	hasOidFile = true;
    	console.log('data:'+data+':'+data.length);
    	bid = new ObjectID(data.substr(0,24));
    	if (data.length >= 48) {
    	    eid = new ObjectID(data.substr(25,24));
    	}
    }

/*    common.db_batch.collections(function(err,collection) {
        if (!collection.length) {
    	    console.log('no data');
	    dbClose();
    	    return;
        }

	//processRaw('raw_event_542ccb93f46a86dc3503ad02', processEvents,{app_user_id:1});


        for (var i=0; i<collection.length; i++) {
            var collectionName = collection[i].collectionName;
	    //exclude IPSentry
	    if (collectionName == 'raw_session_53f554ef847577512100130a') continue;
            if (collectionName.indexOf(common.rawCollection['event'])>=0) {
                console.log("Entering event :"+collectionName);
                //processRaw(collectionName, processEvents,{app_user_id:1});
                makeSleep(collectionName, processEvents,{app_user_id:1}, i);
            } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
                console.log("Entering sessions :"+collectionName);
                makeSleep(collectionName, processSessions, {app_user_id:1, timestamp:1}, i);
                //processRaw(collectionName, processSessions, {app_user_id:1, timestamp:1});
            }
        }
*/
	if (process.argv.length < 3) {
	    console.log('no app id parameter');
        debug.writeLog('/usr/local/countly/log/batch.log', "no app id parameter");
	    process.kill();
	}
	var app_id = process.argv[2];
        processRaw('raw_session_'+app_id, processSessions, {app_user_id:1, timestamp:1});
        processRaw('raw_event_'+app_id, processEvents,{app_user_id:1});
	var cnt=0;
	var repeat_times = 0;
	var wait_cnt = common.config.api.cl_wait_time;
	setInterval(function() {
	    var new_cnt = dbonoff.getCnt('raw');
	    if (new_cnt == cnt) {
		repeat_times++;
		console.log('repeat wait = ' + repeat_times);
	    } else cnt = new_cnt;
	    if (repeat_times > wait_cnt) {
		dbClose();
		process.kill();
	    }
	}, 60000);
//    });
});


