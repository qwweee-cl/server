var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
    exec = require('child_process').exec,
    jsonQuery = require('json-query'),
    workerEnv = {},
    oemMaps = [],
    oemCount = 0,
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
    },
    appKey = require('./appKey.js');

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

function logDbError(err, res) {
    if (err) {
	console.log('DB operation error');
        console.log(err);
    } else {
        console.log("Everything is OK");
    }
}

function insertRawColl(coll, eventp, params) {
    var dealNumber = "";
    var oem = false;
    var currDate = new Date();
    //console.log('insert collection name:'+coll);
    eventp.app_key = params.qstring.app_key;
    //eventp.app_id = params.app_id;
    //eventp.appTimezone = params.appTimezone;
    //eventp.app_cc = params.app_cc;
    eventp.app_user_id = params.app_user_id;
    eventp.device_id = params.qstring.device_id;
    eventp.timestamp = params.qstring.timestamp;
    if (eventp.timestamp < 0) {
        eventp.timestamp = (currDate / 1000 | 0);
    }
    eventp.tz = params.qstring.tz;
    eventp.ip_address = params.ip_address;
    common.computeGeoInfo(eventp);
    if (params.qstring.vendor_info) {
        //console.log(JSON.stringify(params.qstring.vendor_info, null, 2));
        eventp.vendor = params.qstring.vendor_info;
        oem = true;
        //dealNumber = eventp.vendor.deal_no;
        srNumber = eventp.vendor.sr_no_ori;
        if (srNumber) {
            var checkOEM = jsonQuery(['[sr_no=?]',srNumber], {data: oemMaps}).value;
            if (!checkOEM) {
                oem = false;
                //console.log("not in oem table :"+dealNumber);
            } else {
                //console.log("in oem table :"+dealNumber);
                // check start and end (timestamp per sec)
                dealNumber = checkOEM.deal_no;
                if (eventp.timestamp) {
                    if (checkOEM.start && checkOEM.start > eventp.timestamp) {
                        //console.log("before start oem false");
                        oem = false;
                    } else {
                        if (checkOEM.end && checkOEM.end < eventp.timestamp) {
                            //console.log("after end oem false");
                            oem = false;
                        } else {
                            //console.log("before end oem true");
                        }
                    }
                } else {
                    //console.log("no timestamp oem false");
                    oem = false;
                }
                if (!dealNumber) {
                    oem = false;
                }
            }
        } else {
            oem = false;
        }
    }
    //console.log('[db insert]:%j', eventp);
    if (!eventp.app_key) {
        console.log('Null app_key: '+eventp.ip_address);
        return;
    }
    if (!eventp.device_id) {
        console.log('Null device_id: '+eventp.ip_address+' app key: '+eventp.app_key);
        return;
    }
    if (oem) {
        if (0) {
            var oemdb = common.getOEMRawDB(dealNumber);
            if (oemdb) {
                oemdb.collection(coll).insert(eventp, function(err, res) {
                    if (err) {
                        console.log('DB operation error');
                        console.log(err);
                    }
                });
            } else {
                console.log("can not get OEM database : ("+dealNumber+")");
                oemdb = common.getErrorDB();
                oemdb.collection(coll).insert(eventp, function(err, res) {
                    if (err) {
                        console.log('DB operation error');
                        console.log(err);
                    }
                });
            }
        }

        var shardoemdb = common.getShardOEMRawDB(eventp.app_key, dealNumber, currDate);
        if (shardoemdb) {
            shardoemdb.collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
        } else {
            console.log("can not get OEM database : ("+dealNumber+")");
            shardoemdb = common.getErrorDB();
            shardoemdb.collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
        }
        var newShardoemdb = common.getNewShardOEMRawDB(eventp.app_key, dealNumber, currDate);
        if (newShardoemdb) {
            newShardoemdb.collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
        } else {
            console.log("can not get OEM database : ("+dealNumber+")");
            newShardoemdb = common.getErrorDB();
            newShardoemdb.collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
        }
    } else {
        //common.db_raw.collection(coll).insert(eventp, function(err, res) {
/*
        common.getRawDB(eventp.app_key).collection(coll).insert(eventp, function(err, res) {
            if (err) {
                console.log('DB operation error');
                console.log(err);
            }
        });
*/
        if (0) {
            common.getHourlyRawDB(eventp.app_key).collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
        }
    }
    //if (0)
    {
        common.getShardRawDB(eventp.app_key, currDate).collection(coll).insert(eventp, function(err, res) {
            if (err) {
                console.log('DB Shard operation error');
                console.log(err);
            }
        });
    }
    //if (0)
    {
        common.getNewShardRawDB(eventp.app_key, currDate).collection(coll).insert(eventp, function(err, res) {
            if (err) {
                console.log('DB Shard operation error');
                console.log(err);
            }
        });
    }
}

function insertRawEvent(coll,params) {
    var eventp = {};
    if (params.qstring.metrics) {
        eventp.metrics = params.qstring.metrics;
    }
    eventp.events = params.events;
    insertRawColl(coll, eventp, params);
}

function insertRawSession(coll,params) {
    var eventp = {};
    if (params.qstring.begin_session) {
        eventp.metrics = params.qstring.metrics;
    }
    eventp.begin_session = params.qstring.begin_session;
    eventp.end_session = params.qstring.end_session;        
    eventp.session_duration = params.qstring.session_duration;
    insertRawColl(coll, eventp, params);
}

var listAppKeyToPerfect_And = [appKey.key["YouCam_MakeUp_And"], appKey.key["YouCam_Perfect_And"], appKey.key["YouCam_Nail_And"], appKey.key["BeautyCircle_And"]],
    listAppKeyToPerfect_iOS = [appKey.key["YouCam_MakeUp_iOS"], appKey.key["YouCam_Perfect_iOS"], appKey.key["YouCam_Nail_iOS"], appKey.key["BeautyCircle_iOS"]];
// Checks app_key from the http request against "apps" collection.
// This is the first step of every write request to API.
function validateAppForWriteAPI(params) {
    if (params.qstring.app_key == '17a82958af48fdd76801a15991b2cafa1f0bcf92') {
        common.returnMessage(params, 200, 'Success');
        return;
    }

    if (params.events) {
        insertRawEvent(common.rawCollection['event']+params.qstring.app_key, params);
    }

    if (params.qstring.begin_session || params.qstring.end_session || params.qstring.session_duration) {
        insertRawSession(common.rawCollection['session']+params.qstring.app_key, params);

        // also insert to Perfect if app is YCP or YMK
        if(-1 != listAppKeyToPerfect_And.indexOf(params.qstring.app_key)) {
            var tmpParams = {
                'qstring': {'app_key':appKey.key["Perfect_And"]},
                'res':params.res,
                'app_user_id':params.app_user_id,
                'ip_address':params.ip_address
            };
            for(var key in params.qstring) { // copy all property in qstring except app_key
                if(key != 'app_key')
                    tmpParams.qstring[key] = params.qstring[key];
            }

            insertRawSession(common.rawCollection['session']+appKey.key["Perfect_And"], tmpParams);
        }

        if(-1 != listAppKeyToPerfect_iOS.indexOf(params.qstring.app_key)) {
            var tmpParams = {
                'qstring': {'app_key':appKey.key["Perfect_iOS"]},
                'res':params.res,
                'app_user_id':params.app_user_id,
                'ip_address':params.ip_address
            };
            for(var key in params.qstring) { // copy all property in qstring except app_key
                if(key != 'app_key')
                    tmpParams.qstring[key] = params.qstring[key];
            }
            insertRawSession(common.rawCollection['session']+appKey.key["Perfect_iOS"], tmpParams);
        }
            
    }

    common.returnMessage(params, 200, 'Success');
/*
    common.db.collection('apps').findOne({'key':params.qstring.app_key}, function(err,app) {
	if (err || !app) {
            common.returnMessage(params, 401, 'App does not exist');
	    if (err) console.log(err);
	    else console.log('app not found : '+params.qstring.app_key);
	    return;
	}

        //console.log(params);
        params.app_id = app['_id'];
	params.appTimezone = app['timezone'];
	params.app_cc = app['country'];
        if (params.events) {
            insertRawEvent(common.rawCollection['event']+app['_id'], params);
        } 

        if (params.qstring.begin_session || params.qstring.end_session || params.qstring.session_duration) {
            insertRawSession(common.rawCollection['session']+app['_id'], params);
        } 

        common.returnMessage(params, 200, 'Success');
    });
*/
}

function validateUserForWriteAPI(callback, params) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        params.member = member;
        callback(params);
    });
}

function validateUserForDataReadAPI(params, callback, callbackParam) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
            common.returnMessage(params, 401, 'User does not have view right for this application');
            return false;
        }

        common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
            if (!app) {
                common.returnMessage(params, 401, 'App does not exist');
                return false;
            }

            params.app_id = app['_id'];
            params.appTimezone = app['timezone'];
            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp, params.qstring.tz);

            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    });
}

function validateUserForMgmtReadAPI(callback, params) {
    common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
        if (!member || err) {
            common.returnMessage(params, 401, 'User does not exist');
            return false;
        }

        params.member = member;
        callback(params);
    });
}

function getIpAddress(req) {
    var ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

    /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
    return ipAddress.split(',')[0];
}

function findAndRemoveKey(array, value) {
    //console.log('findAndRemoveKey');
    for (var index=0;index<array.length;) {
        if (array[index].key == value) {
            //Remove from array
            array.splice(index, 1);
            //console.log("remove");
        } else {
            //console.log("no remove");
            index++;
        }
    }
}

function updateOEMTable() {
    oemCount = 0;
    oemMaps.length = 0;
    common.db.collection('oems').find().toArray(function(err, data) {
        for (var i = 0 ; i < data.length ; i ++) {
            for (var j=0;j<data[i].sr_no.length;j++) {
                oemData = {};
                oemData.deal_no = data[i].deal_no;
                oemData.start = data[i].start;
                oemData.end = data[i].end;
                oemData.sr_no = data[i].sr_no[j];
                oemMaps[oemCount] = oemData;
                oemCount++;
            }
        }
        workerEnv["OEMS"] = JSON.stringify(oemMaps);
        console.log("update oem-length:"+data.length);
        var now = new Date();
        var oems = workerEnv["OEMS"];
        oemMaps = JSON.parse(oems);
        console.log('update OEM table =========================='+now+'= length:'+oemMaps.length+'=========================');
        //console.log(oemMaps);
    });
}

if (cluster.isMaster) {
    var now = new Date();
    console.log('start api =========================='+now+'==========================');
    var workerCount = (common.config.api.workers)? common.config.api.workers : os.cpus().length;

    common.db.collection('oems').find().toArray(function(err, data) {
        for (var i = 0 ; i < data.length ; i ++) {
            //var oemdb1 = common.getOEMRawDB(data[i].deal_no);
            //var oemdb2 = common.getOEMDB(data[i].deal_no);
            //console.log(oemdb1.tag);
            //console.log(oemdb2.tag);
            for (var j=0;j<data[i].sr_no.length;j++) {
                oemData = {};
                oemData.deal_no = data[i].deal_no;
                oemData.start = data[i].start;
                oemData.end = data[i].end;
                oemData.sr_no = data[i].sr_no[j];
                oemMaps[oemCount] = oemData;
                oemCount++;
            }
        }
        workerEnv["OEMS"] = JSON.stringify(oemMaps);
        console.log("oem-length:"+data.length);

        for (var i = 0; i < workerCount; i++) {
            cluster.fork(workerEnv);
        }
    });

    cluster.on('exit', function(worker) {
        cluster.fork(workerEnv);
    });

} else {
    var oems = process.env['OEMS'];
    oemMaps = JSON.parse(oems);
    var baseTimeOut = 3600000;

    setInterval(function() {
        /** update workerEnv OEM tables data **/
        updateOEMTable();
    }, baseTimeOut);
    //console.log(oemMaps);

    http.Server(function (req, res) {

        var urlParts = url.parse(req.url, true),
            queryString = urlParts.query,
            paths = urlParts.pathname.split("/"),
            apiPath = "",
            params = {
                'qstring':queryString,
                'res':res
            };

        if (queryString.app_id && queryString.app_id.length != 24) {
            console.log('Invalid parameter "app_id"');
            console.log('===========================================================');
            console.log(JSON.stringify(params));
            console.log('===========================================================');
            common.returnMessage(params, 200, 'Success');
            return false;
        }

        if (queryString.user_id && queryString.user_id.length != 24) {
            console.log('Invalid parameter "user_id"');
            console.log('===========================================================');
            console.log(JSON.stringify(params));
            console.log('===========================================================');
            common.returnMessage(params, 200, 'Success');
            return false;
        }

        for (var i = 1; i < paths.length; i++) {
            if (i > 2) {
                break;
            }

            apiPath += "/" + paths[i];
        }

        switch (apiPath) {
            case '/batch':
            {
                //common.returnMessage(params, 401, 'Run Batch by app key is not support.');
                //return;
                var appkey = queryString.app_key;
                if (!appkey) {
                    common.returnMessage(params, 401, 'App does not exist :'+appkey);
                    console.log("app does not exist:"+appkey);
                    return false;
                }
                common.db.collection('apps').findOne({'key':params.qstring.app_key}, function(err,app) {
                    if (err || !app) {
                        common.returnMessage(params, 401, 'App does not exist :'+appkey);
                        if (err) console.log(err);
                        else console.log('app not found');
                        return false;
                    }
                    var appid = app['_id'];
                    try {
                        process.chdir('/usr/local/countly/api');
                        //console.log('New directory: ' + process.cwd());
                    } catch (err) {
                        console.log('chdir: ' + err);
                    }
                    var cmd="node newBatch.js "+appkey+" >> /usr/local/countly/log/"+appkey+"_gen.log 2>&1";
                    console.log("cmd:"+cmd);
                    common.returnMessage(params, 200, 'Success cmd:'+cmd);
                    exec(cmd,  function (error, stdout, stderr) {
                        //console.log('stdout: ' + stdout);
                        //console.log('stderr: ' + stderr);
                        if (error) {
                            console.log('exec error: ' + error);
                        }
                        console.log('process finished');
                        return true;
                    });
                    return true;
                });
                //console.log('batch command!');
                break;
            }
            case '/oembatch':
            {
                //common.returnMessage(params, 401, 'Run Batch by app key is not support.');
                //return;
                var appkey = queryString.app_key;
                if (!appkey) {
                    common.returnMessage(params, 401, 'App does not exist :'+appkey);
                    console.log("app does not exist:"+appkey);
                    return false;
                }
                common.db.collection('apps').findOne({'key':params.qstring.app_key}, function(err,app) {
                    if (err || !app) {
                        common.returnMessage(params, 401, 'App does not exist :'+appkey);
                        if (err) console.log(err);
                        else console.log('app not found');
                        return false;
                    }
                    var appid = app['_id'];
                    try {
                        process.chdir('/usr/local/countly/api');
                        //console.log('New directory: ' + process.cwd());
                    } catch (err) {
                        console.log('chdir: ' + err);
                    }
                    var cmd="node newBatchByOEM.js oem "+appkey+" >> /usr/local/countly/log/"+appkey+"_oem.log 2>&1";
                    console.log("cmd:"+cmd);
                    common.returnMessage(params, 200, 'Success cmd:'+cmd);
                    exec(cmd,  function (error, stdout, stderr) {
                        //console.log('stdout: ' + stdout);
                        //console.log('stderr: ' + stderr);
                        if (error) {
                            console.log('exec error: ' + error);
                        }
                        console.log('process finished');
                        return true;
                    });
                    return true;
                });
                //console.log('batch command!');
                break;
            }
            case '/i/bulk':
            {

                var requests = queryString.requests,
                    appKey = queryString.app_key;

                if (requests) {
                    try {
                        requests = JSON.parse(requests);
                    } catch (SyntaxError) {
                        console.log('Parse bulk JSON failed');
                        console.log('source:'+queryString);
                    }
                } else {
                    //common.returnMessage(params, 400, 'Missing parameter "requests"');
                    common.returnMessage(params, 200, 'Success');
                    console.log('Send 200 Success');
                    return false;
                }

                for (var i = 0; i < requests.length; i++) {

                    if (!requests[i].app_key && !appKey) {
                        continue;
                    }

                    var tmpParams = {
                        'app_id':'',
                        'app_cc':'',
                        'ip_address':requests[i].ip_address,
                        'country':requests[i].country_code || 'Unknown',
                        'city':requests[i].city || 'Unknown',
                        'app_key':requests[i].app_key || appKey,
                        'device_id':requests[i].device_id,
                        'metrics':requests[i].metrics,
                        'events':requests[i].events,
                        'session_duration':requests[i].session_duration,
                        'begin_session':requests[i].begin_session,
                        'end_session':requests[i].end_session,
                        'timestamp':requests[i].timestamp
                    };

                    if (!tmpParams.device_id) {
                        continue;
                    } else {
                        tmpParams.app_user_id = common.crypto.createHash('sha1').update(tmpParams.app_key + tmpParams.device_id + "").digest('hex');
                    }

                    if (tmpParams.metrics) {
                        if (tmpParams.metrics["_carrier"]) {
                            tmpParams.metrics["_carrier"] = tmpParams.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                            });
                        }

                        if (tmpParams.metrics["_os"] && tmpParams.metrics["_os_version"]) {
                            tmpParams.metrics["_os_version"] = tmpParams.metrics["_os"][0].toLowerCase() + tmpParams.metrics["_os_version"];
                        }
                    }

                    validateAppForWriteAPI(tmpParams);
                }

                common.returnMessage(params, 200, 'Success');
                break;
            }
            case '/i/users':
            {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    } catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed');
                        console.log('source:'+params.qstring.args);
                    }
                }

                if (!params.qstring.api_key) {
                    //common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    common.returnMessage(params, 200, 'Success');
                    console.log('Send 200 Success');
                    return false;
                }

                switch (paths[3]) {
                    case 'create':
                        validateUserForWriteAPI(countlyApi.mgmt.users.createUser, params);
                        break;
                    case 'update':
                        validateUserForWriteAPI(countlyApi.mgmt.users.updateUser, params);
                        break;
                    case 'delete':
                        validateUserForWriteAPI(countlyApi.mgmt.users.deleteUser, params);
                        break;
                    default:
                        //common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update or /delete');
                        common.returnMessage(params, 200, 'Success');
                        console.log('Send 200 Success');
                        break;
                }

                break;
            }
            case '/i/apps':
            {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    } catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed');
                        console.log('sources:'+params.qstring.args);
                    }
                }

                if (!params.qstring.api_key) {
                    //common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    common.returnMessage(params, 200, 'Success');
                    console.log('Send 200 Success');
                    return false;
                }

                switch (paths[3]) {
                    case 'create':
                        validateUserForWriteAPI(countlyApi.mgmt.apps.createApp, params);
                        break;
                    case 'update':
                        validateUserForWriteAPI(countlyApi.mgmt.apps.updateApp, params);
                        break;
                    case 'delete':
                        validateUserForWriteAPI(countlyApi.mgmt.apps.deleteApp, params);
                        break;
                    case 'reset':
                        validateUserForWriteAPI(countlyApi.mgmt.apps.resetApp, params);
                        break;
                    default:
                        //common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
                        common.returnMessage(params, 200, 'Success');
                        console.log('Send 200 Success');
                        break;
                }

                break;
            }
            case '/i':
            {
                params.ip_address =  getIpAddress(req);
                var tmp_str = "";
                if (params.qstring) {
                    try {
                        tmp_str = JSON.parse(JSON.stringify(params.qstring));
                    } catch (SyntaxError) {
                        var now = new Date();
                        console.log('Parse qstring JSON failed'+'=========='+now+'==========');
                        console.log('source:'+tmp_str);
                        common.returnMessage(params, 400, 'Parse qstring JSON failed');
                        console.log('Send 400 Success');
                        return false;
                    }
                }
                if (params.qstring.app_key == '17a82958af48fdd76801a15991b2cafa1f0bcf92') {
                    common.returnMessage(params, 200, 'Success');
                    return;
                }
                if (params.qstring.app_key == 'ipsentry') {
                    common.returnHtml(params, 200, 'Success');
                    return;
                }

                if (!params.qstring.app_key || !params.qstring.device_id) {
                    var now = new Date();
                    console.log('Missing parameter "app_key" or "device_id"'+'=========='+now+'==========');
                    console.log(params.qstring);
                    common.returnMessage(params, 200, 'Success');
                    console.log("Send 200 Success");
                    return false;
                }
                params.qstring.app_key = params.qstring.app_key.replace('"','');
                params.qstring.app_key = params.qstring.app_key.replace('{','');
                params.qstring.app_key = params.qstring.app_key.replace(':','');
                params.qstring.app_key = params.qstring.app_key.replace('}','');
                // Set app_user_id that is unique for each user of an application.
                params.app_user_id = common.crypto.createHash('sha1').update(params.app_key + params.qstring.device_id + "").digest('hex');

                if (params.qstring.metrics) {
                    try {
                        params.qstring.metrics = JSON.parse(params.qstring.metrics);

                        if (params.qstring.metrics["_carrier"]) {
                            params.qstring.metrics["_carrier"] = params.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                            });
                        }

                        if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
                            params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
                        }

                    } catch (SyntaxError) {
                        var now = new Date();
                        console.log('Parse metrics JSON failed'+'=========='+now+'==========');
                        console.log(JSON.stringify(params.qstring));
                        common.returnMessage(params, 200, 'Success');
                        console.log('Send 200 Success');
                        return false;
                    }
                }

                if (params.qstring.vendor_info) {
                    try {
                        params.qstring.vendor_info = JSON.parse(params.qstring.vendor_info);
                    } catch (SyntaxError) {
                        var now = new Date();
                        console.log('Parse vendor_info JSON failed'+'=========='+now+'==========');
                        console.log(JSON.stringify(params.qstring));
                        common.returnMessage(params, 200, 'Success');
                        console.log('Send 200 Success');
                        return false;
                    }
                }

                if (params.qstring.events) {
                    try {
                        var jsonData = JSON.parse(params.qstring.events);
                        /*
                        if (jsonData) {
                            if (jsonData.length == 1 && jsonData[0].key &&
                                jsonData[0].key == '_UMA_ID') {
                                common.returnMessage(params, 200, 'Success');
                                //console.log('Send 200 Success');
                                return true;
                            }
                            findAndRemoveKey(jsonData, '_UMA_ID');
                            if (jsonData.length == 0) {
                                //console.log("be removed, so no events");
                                common.returnMessage(params, 200, 'Success');
                                //console.log('Send 200 Success');
                                return true;
                            }
                        }
                        */
                        params.events = jsonData;
                    } catch (SyntaxError) {
                        var now = new Date();
                        console.log('Parse events JSON failed'+'=========='+now+'==========');
                        console.log('source:'+JSON.stringify(params.qstring));
                        common.returnMessage(params, 200, 'Success');
                        console.log('Send 200 Success');
                        return false;
                    }
                }

                validateAppForWriteAPI(params);
                break;
            }
            case '/o/users':
            {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                switch (paths[3]) {
                    case 'all':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.users.getAllUsers, params);
                        break;
                    case 'me':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
                        break;
                    default:
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                        //common.returnMessage(params, 200, 'Success');
                        console.log('Send 400');
                        break;
                }

                break;
            }
            case '/o/apps':
            {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                switch (paths[3]) {
                    case 'all':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getAllApps, params);
                        break;
                    case 'mine':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getCurrentUserApps, params);
                        break;
                    default:
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /mine');
                        //common.returnMessage(params, 200, 'Success');
                        console.log('Send 400');
                        break;
                }

                break;
            }
            case '/o':
            {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                if (!params.qstring.app_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_id"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                switch (params.qstring.method) {
                    case 'locations':
                    case 'sessions':
                    case 'users':
                    case 'devices':
                    case 'device_details':
                    case 'carriers':
                    case 'app_versions':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
                        break;
                    case 'cities':
                        if (common.config.api.city_data !== false) {
                            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
                        } else {
                            common.returnOutput(params, {});
                        }
                        break;
                    case 'events':
                        if (params.qstring.events) {
                            try {
                                params.qstring.events = JSON.parse(params.qstring.events);
                            } catch (SyntaxError) {
                                console.log('Parse events array failed');
                                console.log('source:'+params.qstring.events);
                                common.returnMessage(params, 400, 'events JSON is not properly formed');
                                console.log('Send 400 Failed');
                                break;
                            }

                            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
                        } else {
                            validateUserForDataReadAPI(params, countlyApi.data.fetch.prefetchEventData, params.qstring.method);
                        }
                        break;
                    case 'get_events':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCollection, 'events');
                        break;
                    default:
                        common.returnMessage(params, 400, 'Invalid method');
                        //common.returnMessage(params, 200, 'Success');
                        console.log('Send 400');
                        break;
                }

                break;
            }
            case '/o/analytics':
            {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                if (!params.qstring.app_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_id"');
                    //common.returnMessage(params, 200, 'Success');
                    console.log('Send 400');
                    return false;
                }

                switch (paths[3]) {
                    case 'dashboard':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDashboard);
                        break;
                    case 'countries':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCountries);
                        break;
                    default:
                        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                        //common.returnMessage(params, 200, 'Success');
                        console.log('Send 400');
                        break;
                }

                break;
            }
        }

    }).listen(common.config.api.port, common.config.api.host || '');
}
