var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    ObjectID = require('mongodb').ObjectID,
    countlyApi = {
        data:{
            usage:require('./parts/data/usage.js'),
            fetch:require('./parts/data/fetch.js'),
            events:require('./parts/data/events.js')
        },
        mgmt:{
            users:require('./parts/mgmt/users.js'),
            apps:require('./parts/mgmt/apps.js')
        }
    };

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

var begin_date = new Date('2014-09-27');
var date = new Date();
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate());
//console.log('proc_date = '+begin_date+':'+end_date);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
//var bid = new ObjectID('542a50d9981a3d812e000006');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');
//var eid = new ObjectID('542a50e0981a3d812e000007');
console.log("bid = "+bid+" eid = "+eid);

function processEvents(err, app) {
    //console.log(app);
    if (!app || !app.length) {
        console.log('[processEvents no app]');
        console.log(err);
        return;
    }
    countlyApi.data.events.processEvents(app);
}

function processSessions(err, app) {
    //console.log(app);
    if (!app || !app.length) {
        console.log('[processSessions no app]');
        console.log(err);
        return;
    }

    var cur_idx = 0;
    var curr_app_user = app[0].app_user_id;
    for (var i=0; i<app.length; i++) {
        //msg = util.inspect(app[i],{depth:null});
        console.log('processSession:cur_idx='+cur_idx+';i='+i); 
        if (app[i].app_user_id != curr_app_user) { //save last session data, initialize a new one
	console.log('Call processSession');
            countlyApi.data.usage.processSession(app.slice(cur_idx, i));
            cur_idx = i;
            curr_app_user = app[i].app_user_id;
        }
    }
	console.log('Call last processSession:'+cur_idx);
    countlyApi.data.usage.processSession(app.slice(cur_idx));
}

function processRaw(collectionName, processData, sortOrder) {
    //console.log('in processRaw:'+collectionName+":"+bid+":"+eid);
    //console.log('sortOrder=%j',sortOrder);
    //console.log('processData type:'+typeof processData);
    try {
        common.db.collection(collectionName).find({_id:{$lt:eid, $gte:bid}}).sort(sortOrder).toArray(processData);
    } catch (e) {
        console.log('[processRaw]'+e);
    }
}

function batchProcess() {
    common.db.collections(function(err,collection) {
        for (var i=0; i<collection.length; i++) {
            var collectionName = collection[i].collectionName;
            if (collectionName.indexOf(common.rawCollection['event'])>=0) {
                console.log("Entering event :"+collectionName);
                processRaw(collectionName, processEvents,{app_user_id:1});
            } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
                console.log("Entering sessions :"+collectionName);
                processRaw(collectionName, processSessions, {app_user_id:1, timestamp:1});
            }
        }
    });
}

setInterval(function() {
var date = new Date();
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate());
//console.log('proc_date = '+begin_date+':'+end_date);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
//var bid = new ObjectID('542a50d9981a3d812e000006');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');
//var eid = new ObjectID('542a50e0981a3d812e000007');
console.log("bid = "+bid+" eid = "+eid);
    console.log('Exit');
}, 3600000);





