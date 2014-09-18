var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
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

var date = new Date();
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate());
var begin_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()-1);
console.log("proc_date = "+proc_date);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');
console.log("bid = "+bid+" eid = "+eid);

function processEvents(err, app) {
    //console.log(app);
    if (!app) {
        console.log('[no app]'+err);
        return;
    }
    countlyApi.data.events.processEvents(app);
}

function processSessions(err, app) {
    //console.log(app);
    if (!app) {
        console.log(err);
        return;
    }

    var cur_idx = 0;
    for (i=0; i<app.length; i++) {
        //msg = util.inspect(app[i],{depth:null});
        //console.log(msg); 
        if (app[i].app_user_id != curr_app_user) { //save last session data, initialize a new one
            countlyApi.data.usage.processSession(app.slice(cur_idx, i));
            cur_idx = i;
            curr_app_user = app[i].app_user_id;
        }
    }
    countlyApi.data.usage.processSession(app.slice(cur_idx));
}

function processRaw(collectionName, processData, sortOrder) {
    console.log('in processRaw:'+collectionName+":"+bid+":"+eid);
    try {
        db.collection(item).find({_id:{$lt:eid, $gte:bid}}).sort(sortOrder).toArray(processData);
    } catch (e) {
        console.log(e);
    }
}

db.collections(function(err,collection) {
    for (i=0; i<collection.length; i++) {
        var collectionName = collection[i].collectionName;
        if (collectionName.indexOf(common.rawCollection['event'])>=0) {
            //console.log("In :"+collectionName);
            processRaw(collectionName, processEvents,{app_user_id:1});
        } else if (collectionName.indexOf(common.rawCollection['session'])>=0) {
            //console.log("In :"+collectionName);
            processRaw(collectionName, processSessions, {app_user_id:1, timestamp:1});
        }
    }
});

setInterval(function() {
    console.log('Exit');
}, 3600000);





