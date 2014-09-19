var usage = {},
    common = require('./../../utils/common.js'),
    geoip = require('geoip-lite'),
    time = require('time')(Date);

(function (usage) {

    var predefinedMetrics = [
        { db: "devices", metrics: [{ name: "_device", set: "devices", short_code: common.dbUserMap['device'] }] },
        { db: "carriers", metrics: [{ name: "_carrier", set: "carriers", short_code: common.dbUserMap['carrier'] }] },
        { db: "device_details", metrics: [{ name: "_os", set: "os", short_code: common.dbUserMap['platform'] }, 
            { name: "_os_version", set: "os_versions", short_code: common.dbUserMap['platform_version'] }, 
            { name: "_resolution", set: "resolutions" }] },
        { db: "app_versions", metrics: [{ name: "_app_version", set: "app_versions", short_code: common.dbUserMap['app_version'] }] }
    ];
    var OP_DECREASE=0;
    var OP_FILL=1;
    var OP_INCREASE=2;


    //query user data and execute processUserSession
    //
    usage.processSession = function (logListforSingleUser) {
	console.log('[processSession]:%j',logListforSingleUser[0]);
        common.db.collection('app_users' + logListforSingleUser[0].app_id).findOne({'_id': logListforSingleUser[0].app_user_id }, 
            function (err, dbAppUser){
                processUserSession(dbAppUser, logListforSingleUser);
        });
    };


    function durationRange(totalSessionDuration) {
        var durationRanges = [
            [0,10],
            [11,30],
            [31,60],
            [61,180],
            [181,600],
            [601,1800],
            [1801,3600]
        ],
        durationMax = 3601,
        calculatedDurationRange;

        if (totalSessionDuration >= durationMax) {
            calculatedDurationRange = (durationRanges.length) + '';
        } else {
            for (var i=0; i < durationRanges.length; i++) {
                if (totalSessionDuration <= durationRanges[i][1] && totalSessionDuration >= durationRanges[i][0]) {
                    calculatedDurationRange = i + '';
                    break;
                }
            }
        }

        return calculatedDurationRange;
    }

    function updateSessionDuration(sessionObj, toFill) {
        var session_duration = sessionObj.acc_duration;
        var updateTimeObject = getTimeFunction(toFill);
        updateTimeObject(sessionObj, updateSessions, common.dbMap['durations'] + '.' + durationRange(session_duration));
        if (common.config.api.session_duration_limit && session_duration > common.config.api.session_duration_limit) {
                session_duration = common.config.api.session_duration_limit;
        }
        updateTimeObject(sessionObj, updateSessions, common.dbMap['duration'], session_duration);
    }


    function computeFreqRange(userTime, userLastSeenTimestamp) {
        var sessionFrequency = [
            [0,1],
            [1,24],
            [24,48],
            [48,72],
            [72,96],
            [96,120],
            [120,144],
            [144,168],
            [168,192],
            [192,360],
            [360,744]
        ],
        sessionFrequencyMax = 744;

        if ((userTime - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
            return sessionFrequency.length + '';
        } else {
            for (var i=0; i < sessionFrequency.length; i++) {
                if ((params.time.timestamp - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                    (params.time.timestamp - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                    return i + '';
                }
            }
        }
        return '';
    };

    function computeLoyaltyRange(userSessionCount) {
        var loyaltyRanges = [
            [0,1],
            [2,2],
            [3,5],
            [6,9],
            [10,19],
            [20,49],
            [50,99],
            [100,499]
        ],
        loyaltyMax = 500;

        if (userSessionCount >= loyaltyMax) {
            return loyaltyRanges.length + '';
        } else {
            for (var i = 0; i < loyaltyRanges.length; i++) {
                if (userSessionCount <= loyaltyRanges[i][1] && userSessionCount >= loyaltyRanges[i][0]) {
                    return i + '';
                }
            }
        }
        return '';
    }

    var updateSessions = {};
    var updateLocations = {};
    var updateUsers = {};
    var updateCities = {};
    var userRanges = {};
    var sessionRanges = {};
    userRanges['meta.f-ranges'] = {};
    userRanges['meta.l-ranges'] = {};
    sessionRanges['meta.d-ranges'] = {};
    userRanges['meta.f-ranges']['$each'] = [];
    userRanges['meta.l-ranges']['$each'] = [];
    sessionRanges['meta.d-ranges']['$each'] = [];
    var countryArray = {};
    var cityArray = {};
    countryArray['$each'] = [];
    cityArray['$each'] = [];
    var userProps = {};
    var updateMetrics = {};
    var MetricMetaSet = {};

    function setRangeMeta(ranges, coll, id) {
        if (!ranges|| !ranges.length) return;

        common.db.collection(coll).update({'_id': id}, {'$addToSet': range}, 
            {'upsert': true}, function(err, object) {
                if (err){
                    console.log(err);  // returns error if no matching object found
                }
            });
    };

    function updateCollection(collName, id, data, op, errHeader) {
        common.db.collection(collName).update({'_id': id}, {op: data}, 
            {'upsert': true}, function(err, object) {
                if (err){
                    console.log(errHeader+':'+err);  
                }
            });
    }

    function reallyUpdateAll(params) {
        setRangeMeta(sessionRanges['meta.d-ranges'], 'sessions', params.app_id);
        updateCollection('sessions', params.app_id, updateSessions, '$inc', '[updateSessions]');

        setRangeMeta(userRanges['meta.f-ranges'], 'users', params.app_id);
        setRangeMeta(userRanges['meta.l-ranges'], 'users', params.app_id);
        updateCollection('users', params.app_id, updateUsers, '$inc', '[updateUsers]');

        setRangeMeta(countryArray, 'locations', params.app_id);
        updateCollection('locations', params.app_id, updateLocations, '$inc', '[updateLocations]');
 
        if (common.config.api.city_data !== false) {
            setRangeMeta(countryArray, 'cities', params.app_id);
            updateCollection('cities', params.app_id, updateCities, '$inc', '[updateCities]');
        }
        updateCollection('app_users'+params.app_id, params.app_user_id, userProps, '$set', '[userProps]'); 

        for (var i=0; i < predefinedMetrics.length; i++) {
            setRangeMeta(MetricMetaSet[predefinedMetrics[i].db], predefinedMetrics[i].db, params.app_id);
            updateCollection(predefinedMetrics[i].db, params.app_id, updateMetrics, '$inc', '[updateMetrics:'+predefinedMetrics[i].db+']');
        }
    }

    function updateFreqRange(sessionObj, dbAppUser) {
        // Calculate the frequency range of the user
        var calculatedFrequency = computeFreqRange(sessionObj.timestamp, dbAppUser.timestamp);
        fillTimeObject(sessionObj, updateUsers, common.dbMap['frequency'] + '.' + calculatedFrequency);
        common.arrayAddUniq(userRanges['meta.' + 'f-ranges']['$each'],calculatedFrequency);
    } 

    function updateLoyaltyRange(sessionObj, session_count, toFill) {
        // Calculate the loyalty range of the user
        var calculatedLoyaltyRange = computeLoyaltyRange(session_count);
        var updateTimeObject = getTimeFunction(toFill);
        updateTimeObject(sessionObj, updateUsers, common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange);
        common.arrayAddUniq(userRanges['meta.' + 'l-ranges']['$each'],calculatedFrequency);
    } 
   
    function updateLocationMeta(sessionObject) { 
        // add meta data for locations    
        common.arrayAddUniq(countryArray['$each'], sessionObject.country);
        common.arrayAddUniq(cityArray['$each'], sessionObject.city);
    }


    function getTimeFunction(toFill) {
        var updateTimeObject;
        switch (toFill) {
            case OP_INCREASE:
                updateTimeObject = common.incrTimeObject;
                break;
            case OP_DECREASE:
                updateTimeObject = common.decrTimeObject;
                break;
            default:
                updateTimeObject = common.fillTimeObject;
        }
        return updateTimeObject;
    }

    function updateMetricTimeObj(sessionObject, prop, toFill) {
	if (!sessionObject.metrics) return;

        var updateTimeObject = getTimeFunction(toFill);
        for (var i=0; i<predefinedMetrics.length; i++) {
            for (var j=0; j<predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = sessionObject.metrics[tmpMetric.name];

                if (recvMetricValue) {
                    var escapedMetricVal = recvMetricValue.replace(/^\$/, "").replace(/\./g, ":");
                    MetricMetaSet["meta." + tmpMetric.set] = escapedMetricVal;
                    updateTimeObject(sessionObject, updateMetrics[predefinedMetrics[i].db], escapedMetricVal + '.' + prop);
                }
            }
        }
    }

    function updateStatistics(sessionObject, prop, toFill, increase) {
        var incr = increase? increase : 1;
        var updateTimeObject = getTimeFunction(toFill);
        updateTimeObject(sessionObject, updateSessions, prop, incr);
        updateTimeObject(sessionObject, updateLocations, sessionObject.country + '.' + prop, incr);
        if (common.config.api.city_data !== false) {
            updateTimeObject(sessionObject, updateCities, sessionObject.city + '.' + prop, incr);
        }
	updateMetricTimeObj(sessionObject, prop, toFill);
    }

    function updateUserMetric(sessionObject) {
	if (!sessionObject.metrics) return;

        for (var i=0; i<predefinedMetrics.length; i++) {
            for (var j=0; j<predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = sessionObject.metrics[tmpMetric.name];

                if (recvMetricValue) {
                    var escapedMetricVal = recvMetricValue.replace(/^\$/, "").replace(/\./g, ":");
                    if (tmpMetric.short_code) {
                        userProps[tmpMetric.short_code] = escapedMetricVal;
                    }
                }
            }
        }
    }

    function updateUserProfile(sessionObject, finalUserObject) {
        updateUserMetric(sessionObject);
        userProps[common.dbUserMap['device_id']] = sessionObject.device_id;
        userProps[common.dbUserMap['country_code']] = sessionObject.country;
        if (common.config.api.city_data !== false) {
            userProps[common.dbUserMap['city']] = sessionObject.city;
        }
        userProps[common.dbUserMap['session_duration']] = sessionObject.acc_duration;
        userProps[common.dbUserMap['total_session_duration']] = finalUserObject[common.dbUserMap['total_session_duration']];
        userProps[common.dbUserMap['session_count']] = finalUserObject[common.dbUserMap['session_count']];
        userProps[common.dbUserMap['last_end_session_timestamp']] = finalUserObject[common.dbUserMap['last_end_session_timestamp']];
        userProps.appTimezone = sessionObject.appTimezone;
        userProps.timestamp = sessionObject.timestamp;
        userProps.time = sessionObject.time;
    }

    //Param: dbAppUser-user data in app_user_XXX, apps:all logs for a Single User
    function processUserSession(dbAppUser, apps) {
        var sessionObj = [];
        var last_end_session_timestamp = 0;

        var total_duration = 0;
        if (dbAppUser) { //set sessionObj[0] = dbAppUser to compute on-going session
            dbAppUser.acc_duration = dbAppUser[common.dbUserMap['session_duration']];
            sessionObj[0] = common.clone(dbAppUser);
            last_end_session_timestamp = dbAppUser[common.dbUserMap['last_end_session_timestamp']];
        } else { //new user
            sessionObj[0] = {};
        }
        var currObjIdx = 0;
        for (i=0; i<apps.length; i++) {
            apps[i].time = common.initTimeObj(apps[i].appTimezone, apps[i].timestamp, apps[i].tz);
            //set event(request) count for every request
            common.incrTimeObject(apps[i], updateSessions, common.dbMap['events']); 
            if (apps[i].begin_session) {
                if ((apps[i].timestamp - last_end_session_timestamp) <= 10) { //ongoing session
                    last_end_session_timestamp = 0;
                    continue;
                }
                //init a new sessionObj to keep the session with this begin_session
                sessionObj[++currObjIdx] = apps[i];
                sessionObj[currObjIdx].acc_duration = 0;
                last_end_session_timestamp = 0;
            }
            if (apps[i].end_session) { 
                //used to judge if there will be ongoing session
                last_end_session_timestamp = apps[i].timestamp;
                //keep last_end_session_timestamp for next batch process
                sessionObj[currObjIdx][common.dbUserMap['last_end_session_timestamp']] = last_end_session_timestamp;
            }
            if (apps[i].session_duration) {
                sessionObj[currObjIdx].acc_duration += apps[i].session_duration;
                total_duration += apps[i].session_duration;
            }
            /* for boundary condition:
                1. dbAppUser contains begin_session(last_end_session_timestamp=0): 
                    end_session will update last_end_session_timestamp, 
                    session duration will increase total durations; ongoing begin_session will just continue; 
                    new begin_session will init new sessionObj
                2. dbAppUser contains end_session: ongoing begin_session will just continue; 
                    new begin_session will init new sessionObj
                3. the last one is begin_session: last_end_session_timestamp = 0; acc_duration = current session_duration
                4. the last one is end_session: last_end_session_timestamp = current timestamp;
                    acc_duration = current session_duration
            */
        }

        //Prepare final Session info to update
        var finalUserObject = {};
        finalUserObject[common.dbUserMap['last_end_session_timestamp']] = last_end_session_timestamp;
        finalUserObject[common.dbUserMap['session_count']] = (dbAppUser?dbAppUser[common.dbUserMap['session_count']]:0) + currObjIdx;
        finalUserObject[common.dbUserMap['total_session_duration']] 
            = total_duration + (dbAppUser?dbAppUser[common.dbUserMap['total_session_duration']]:0);

        var sessionObjByDay = {};
        var sessionDay = null;
        var sessionDayIdx = -1;
        var startIdx = dbAppUser? 0 : 1;
        var calculatedDurationRange = 0;

        for (var i=startIdx; i<=currObjIdx; i++) { 
            if (sessionDay != sessionObj[i].time.daily) {
                sessionDay = sessionObj[i].time.daily;
                sessionObjByDay[++sessionDayIdx]= {};                
                sessionObjByDay[sessionDayIdx].sessions = [];                
            }
            common.computeGeoInfo(sessionObj[i]);
            updateLocationMeta(sessionObj[i]);
            sessionObjByDay[sessionDayIdx].sessions.push(sessionObj[i]);
            updateSessionDuration(sessionObj[i], OP_INCREASE);
            //set total user count in necessary collections   
            updateStatistics(sessionObj[i], common.dbMap['total'], OP_INCREASE); //will increase for every session
            updateStatistics(sessionObj[i], common.dbMap['unique'], OP_FILL); // only set once
        }

        var session_count = dbAppUser?dbAppUser[common.dbUserMap['session_count']]:0;
        for (var i=1; i<sessionObjByDay.length; i++) {
            session_count += sessionObjByDay[i].sessions.length;
            sessionObjByDay[i-1].sessions.length;
            updateFreqRange(sessionObjByDay[i].sessions[sessionObjByDay[i].sessions.length-1], 
                sessionObjByDay[i-1].sessions[sessionObjByDay[i-1].sessions.length-1]);
            updateLoyaltyRange(sessionObjByDay[i].sessions[sessionObjByDay[i].sessions.length-1],
                session_count, toFill);
        }

        //If there is on-going session coming in at first...
        if (dbAppUser) {
            //Update last session in DB to include new session duration sent after last processing, also update duration ranges
            updateSessionDuration(dbAppUser, OP_DECREASE);
            updateStatistics(dbAppUser, common.dbMap['unique'], OP_DECREASE); // only set once

            //update loyalty if there are more sessions in the same day as dbAppUser
            var ori_session_count = dbAppUser[common.dbUserMap['session_count']];
            var new_session_count = ori_session_count + sessionObjByDay[0].sessions.length
            if (computeLoyaltyRange(ori_session_count) != computeLoyaltyRange(new_session_count)) {
                updateLoyaltyRange(dbAppUser, ori_session_count, OP_DECREASE);
                updateLoyaltyRange(sessionObjByDay[0].sessions[sessionObjByDay[0].sessions.length-1], 
                    new_session_count, OP_INCREASE);
            }
        }

        //set new user count in necessary collections   
        if (!dbAppUser) {
            updateStatistics(sessionObjByDay[0].sessions[0], common.dbMap['new']);
        }

        //use last session object to update user profiles (metrics)
        updateUserProfile(sessionObj[currObjIdx], finalUserObject);

        //do the real update job in MongoDB
        reallyUpdateAll(sessionObj[1]);
    }
}(usage));

module.exports = usage;
