var common = {},
    moment = require('moment'),
    momentz = require('moment-timezone'),
    time = require('time')(Date),
    crypto = require('crypto'),
    mongo = require('mongoskin'),
    debug = require('./cl/debug.js'),
    geoip = require('geoip-lite'),
    countlyConfig = require('./../config'),
    print = console.log;
/*var Mongo = require('mongodb').Db;
var Server = require('mongodb').Server;
*/
(function (common) {

    common.dbMap = {
        'events': 'e',
        'total': 't',
        'new': 'n',
        'unique': 'u',
        'duration': 'd',
        'durations': 'ds',
        'frequency': 'f',
        'loyalty': 'l',
        'sum': 's',
        'count': 'c'
    };

    common.dbUserMap = {
        'device_id': 'did',
        'first_seen': 'fs',
        'session_duration': 'sd',
        'total_session_duration': 'tsd',
        'session_count': 'sc',
        'device': 'd',
        'carrier': 'c',
        'city': 'cty',
        'country_code': 'cc',
        'platform': 'p',
        'platform_version': 'pv',
        'app_version': 'av',
        'last_begin_session_timestamp': 'lbst',
        'last_end_session_timestamp': 'lest',
        'has_ongoing_session': 'hos'
    };

    common.rawCollection = {
        'raw': 'raw_',
        'session': 'raw_session_',
        'event': 'raw_event_'
    };

    var dbName;
    var dbOptions = { safe:false, maxPoolSize: countlyConfig.mongodb.max_pool_size || 1000 };
    var dbBatchOptions = { safe:false, maxPoolSize: 1};

    if (typeof countlyConfig.mongodb === "string") {
        dbName = countlyConfig.mongodb;
    } else if ( typeof countlyConfig.mongodb.replSetServers === 'object'){
        dbName = countlyConfig.mongodb.replSetServers;
        dbOptions.database = countlyConfig.mongodb.db || 'countly';
    } else {
        dbName = (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db + '?auto_reconnect=true');
    }

    dbRawName = (countlyConfig.mongodb.hostbatch + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_raw + '?auto_reconnect=true');
    dbBatchName = (countlyConfig.mongodb.hostbatch + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_batch + '?auto_reconnect=true');
    dbIbbName = (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db_ibb + '?auto_reconnect=true');

    common.db = mongo.db(dbName, dbOptions);
    common.db_raw = mongo.db(dbRawName, dbOptions);
    common.db_batch = mongo.db(dbBatchName, dbBatchOptions);
    common.db_ibb = mongo.db(dbIbbName, dbOptions);
    //common.db_ibb = new Mongo(countlyConfig.mongodb.db_ibb, new Server(countlyConfig.mongodb.host, countlyConfig.mongodb.port));
    
    common.config = countlyConfig;

    common.time = time;

    common.moment = moment;
    common.momentz = momentz;

    common.crypto = crypto;

    common.computeGeoInfo = function (params) {
        // Location of the user is retrieved using geoip-lite module from her IP address.
        params.country = 'Unknown';
        params.city = 'Unknown';
        var locationData = geoip.lookup(params.ip_address);

        if (locationData) {
            if (locationData.country) {
                params.country = locationData.country;
            }

            if (locationData.city) {
                params.city = locationData.city;
            } else {
                params.city = 'Unknown';
            }

            // Coordinate values of the user location has no use for now
            if (locationData.ll) {
                params.lat = locationData.ll[0];
                params.lng = locationData.ll[1];
           }
        }
    }

    common.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

    common.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    common.zeroFill = function(number, width) {
        width -= number.toString().length;

        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }

        return number + ""; // always return a string
    };

    common.arrayAddUniq = function (arr, item) {
        if (arr && arr.length) {
            if (arr.indexOf(item) === -1) {
                arr[arr.length] = item;
            }
        } else {
            arr[0] = item;
        }
	return arr;
    };

    common.sha1Hash = function (str, addSalt) {
        var salt = (addSalt) ? new Date().getTime() : '';
        return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
    };

    common.md5Hash = function (str) {
        return crypto.createHash('md5').update(str + '').digest('hex');
    };

    // Creates a time object in the format object["2012.7.20.property"] = increment.
    common.fillTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? +increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly || !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            return false;
        }

        object[timeObj.yearly + '.' + property] = increment;
        object[timeObj.monthly + '.' + property] = increment;
        object[timeObj.daily + '.' + property] = increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            object[timeObj.hourly + '.' + property] = increment;
        }

        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

    function empty(e) {
        if (typeof e == 'undefined')
            return true;
        switch(e) {
            case "":
            case 0:
            case "0":
            case null:
            case false:
            case typeof e == "undefined":
                return true;
            default :
                return false;
        }
        return true;
    };
    function pad2(number) {
        return (number < 10 ? '0' : '') + number
    }
    function tzFormat(tz, reqTimestamp) {
        var regex = /^(?:[+-\s]{1})(?:\d{4})$/;
	var path = '/home/hadoop/countly_snow/log/'
        if (tz) {
            if (!tz.match(regex)) {
                debug.writeLog(path+'re.log', "not match data=>"+tz+" Typeof:"+(typeof tz)+" empty:"+empty(tz)+" "+reqTimestamp);
                console.log("not match data=>"+tz+" Typeof:"+(typeof tz)+" empty:"+empty(tz));
                return "";
            }
            debug.writeLog(path+'tz.log', "Typeof:"+(typeof tz)+" empty:"+empty(tz)+" length:"+tz.length+"["+tz+"]");
            debug.writeLog(path+'tz.log', "substrig(0,1):",tz.substring(0,1));
            debug.writeLog(path+'g', (typeof tz)+" tz:["+tz+"] "+(tz>=0));
            var absTZ = Math.abs(tz);
            var timezone = (tz>=0?"+":"-")+pad2(Math.floor(absTZ/100))+":"+pad2(absTZ%100);
            debug.writeLog(path+'ne.log', tz+" "+timezone+"("+timezone.length+") "+empty(tz)+" "+(typeof tz));
            return timezone;
        } else {
            debug.writeLog(path+'ne.log', "empty data=>"+tz+" Typeof:"+(typeof tz)+" empty:"+empty(tz));
            return "";
        }
    }

   // increase/add a time object in the format object["2012.7.20.property"] = increment.
    common.incrTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? +increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly || !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            return false;
        }

        if (object[timeObj.yearly + '.' + property]) object[timeObj.yearly + '.' + property] += increment;
        else object[timeObj.yearly + '.' + property] = increment;

        if (object[timeObj.monthly + '.' + property]) object[timeObj.monthly + '.' + property] += increment;
        else object[timeObj.monthly + '.' + property] = increment;
        
        if (object[timeObj.daily + '.' + property]) object[timeObj.daily + '.' + property] += increment;
        else object[timeObj.daily + '.' + property] = increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            if (object[timeObj.hourly + '.' + property]) object[timeObj.hourly + '.' + property] += increment;
            else object[timeObj.hourly + '.' + property] = increment;
        }

        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            if (object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property]) 
                object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] += increment;
            else 
                object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = increment;
        }
    };

   // decrease/add a time object in the format object["2012.7.20.property"] = -increment, and removed if zero.
    common.decrTimeObject = function (params, object, property, increment) {
        var increment = (increment) ? increment : 1,
            timeObj = params.time;

        if (!timeObj || !timeObj.yearly || !timeObj.monthly || !timeObj.weekly || !timeObj.daily || !timeObj.hourly) {
            return false;
        }

        if (object[timeObj.yearly + '.' + property]) {
            object[timeObj.yearly + '.' + property] -= increment;
            if (object[timeObj.yearly + '.' + property] == 0) 
                delete(object[timeObj.yearly + '.' + property]);
        } else object[timeObj.yearly + '.' + property] = 0 - increment;

        if (object[timeObj.monthly + '.' + property]) {
            object[timeObj.monthly + '.' + property] -= increment;
            if (object[timeObj.monthly + '.' + property] == 0) 
                delete(object[timeObj.monthly + '.' + property]);
        } else object[timeObj.monthly + '.' + property] = 0 - increment;
        
        if (object[timeObj.daily + '.' + property]) {
            object[timeObj.daily + '.' + property] -= increment;
            if (object[timeObj.daily + '.' + property] == 0) 
                delete(object[timeObj.daily + '.' + property]);
        } else object[timeObj.daily + '.' + property] = 0 - increment;

        // If the property parameter contains a dot, hourly data is not saved in
        // order to prevent two level data (such as 2012.7.20.TR.u) to get out of control.
        if (property.indexOf('.') === -1) {
            if (object[timeObj.hourly + '.' + property]) {
                object[timeObj.hourly + '.' + property] -= increment;
                if (object[timeObj.hourly + '.' + property] == 0) 
                    delete(object[timeObj.hourly + '.' + property]);
            } else object[timeObj.hourly + '.' + property] = increment;
        }


        // For properties that hold the unique visitor count we store weekly data as well.
        if (property.substr(-2) == ("." + common.dbMap["unique"]) ||
            property == common.dbMap["unique"] ||
            property.substr(0,2) == (common.dbMap["frequency"] + ".") ||
            property.substr(0,2) == (common.dbMap["loyalty"] + ".") ||
            property.substr(0,3) == (common.dbMap["durations"] + "."))
        {
            if (object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property]) {
                object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] -= increment;
                if (object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] == 0) 
                    delete(object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property]);
            } else 
                object[timeObj.yearly + ".w" + timeObj.weekly + '.' + property] = 0 - increment;
        }
    };

    // Adjusts the time to current app's configured timezone appTimezone and returns a time object.
    common.initTimeObj = function (appTimezone, reqTimestamp, reqTZ) {
        var currTimestamp,
            currDate,
            currDateWithoutTimestamp = new Date();
        appTimezone = "America/Denver";

        // Check if the timestamp parameter exists in the request and is a 10 digit integer
        if (reqTimestamp && (reqTimestamp + "").length === 10 && common.isNumber(reqTimestamp)) {
            // If the received timestamp is greater than current time use the current time as timestamp
            currTimestamp = (reqTimestamp > time.time()) ? time.time() : parseInt(reqTimestamp, 10);
            currDate = new Date(currTimestamp * 1000);
        } else {
            currTimestamp = time.time(); // UTC
            currDate = new Date();
        }

	try {
            currDate.setTimezone(appTimezone);
	} catch (err) {
	    console.log('[appTimezone]:'+appTimezone+']');
	    console.log(err);
	}
        //currDateWithoutTimestamp.setTimezone(appTimezone);

        var tmpMoment = momentz(currDate).tz(appTimezone);
        //var withoutMoment = momentz(currDateWithoutTimestamp).tz(appTimezone);

/*
        var TZ = tzFormat(reqTZ, reqTimestamp);
        if (0 && !empty(TZ)) {
            tmpMoment = tmpMoment.zone(TZ);
            //withoutMoment = withoutMoment.zone(TZ);
            //console.log("timezone:"+reqTZ+" "+TZ);
        } else {
            tmpMoment = momentz(currDate).tz(appTimezone);
        }
*/
        return {
            yearly: tmpMoment.format("YYYY"),
            monthly: tmpMoment.format("YYYY.M"),
            daily: tmpMoment.format("YYYY.M.D"),
            hourly: tmpMoment.format("YYYY.M.D.H"),
            weekly: Math.ceil(tmpMoment.format("DDD") / 7)
        };
    };

    // Returns an extended Date object that has setTimezone function
    common.getDate = function (timestamp, timezone) {
        var tmpDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            tmpDate.setTimezone(timezone);
        }

        return tmpDate;
    };

    common.getDOY = function (timestamp, timezone) {
        var endDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            endDate.setTimezone(timezone);
        }

        var startDate = (timestamp)? new Date(timestamp * 1000) : new Date();

        if (timezone) {
            startDate.setTimezone(timezone);
        }

        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);

        var diff = endDate - startDate;
        var oneDay = 1000 * 60 * 60 * 24;
        var currDay = Math.ceil(diff / oneDay);

        return currDay;
    };

    /*
     argProperties = { argName: { required: true, type: 'String', max-length: 25, min-length: 25, exclude-from-ret-obj: false }};
     */
    common.validateArgs = function (args, argProperties) {

        var returnObj = {};

        if (!args) {
            return false;
        }

        for (var arg in argProperties) {
            if (argProperties[arg].required) {
                if (args[arg] === void 0) {
                    return false;
                }
            }

            if (args[arg] !== void 0) {
                if (argProperties[arg].type) {
                    if (argProperties[arg].type === 'Number' || argProperties[arg].type === 'String') {
                        if (toString.call(args[arg]) !== '[object ' + argProperties[arg].type + ']') {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Boolean') {
                        if (!(args[arg] !== true || args[arg] !== false || toString.call(args[arg]) !== '[object Boolean]')) {
                            return false;
                        }
                    } else if (argProperties[arg].type === 'Array') {
                        if (!Array.isArray(args[arg])) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                } else {
                    if (toString.call(args[arg]) !== '[object String]') {
                        return false;
                    }
                }

                /*
                if (toString.call(args[arg]) === '[object String]') {
                    args[arg] = args[arg].replace(/([.$])/mg, '');
                }
                */

                if (argProperties[arg]['max-length']) {
                    if (args[arg].length > argProperties[arg]['max-length']) {
                        return false;
                    }
                }

                if (argProperties[arg]['min-length']) {
                    if (args[arg].length < argProperties[arg]['min-length']) {
                        return false;
                    }
                }

                if (!argProperties[arg]['exclude-from-ret-obj']) {
                    returnObj[arg] = args[arg];
                }
            }
        }

        return returnObj;
    };

    common.returnMessage = function (params, returnCode, message) {
        params.res.writeHead(returnCode, {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + JSON.stringify({result: message}) + ')');
        } else {
            params.res.write(JSON.stringify({result: message}));
        }
        params.res.end();
    };

    common.returnOutput = function (params, output) {
        params.res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        if (params.qstring.callback) {
            params.res.write(params.qstring.callback + '(' + JSON.stringify(output) + ')');
        } else {
            params.res.write(JSON.stringify(output));
        }

        params.res.end();
    };

    common.clone = function(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    };

}(common));

module.exports = common;
