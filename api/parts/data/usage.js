var usage = {},
    common = require('./../../utils/common.js'),
    dbonoff = require('./../../utils/dbonoff.js'),
    geoip = require('geoip-lite'),
    time = require('time')(Date);

(function (usage) {

    var predefinedMetrics = [
        { db: "devices", metrics: [{ name: "_device", set: "devices"}] },
        { db: "carriers", metrics: [{ name: "_carrier", set: "carriers"}] },
        { db: "device_details", metrics: [{ name: "_os", set: "os"}, 
            { name: "_os_version", set: "os_versions"}, 
            { name: "_resolution", set: "resolutions" }] },
        { db: "app_versions", metrics: [{ name: "_app_version", set: "app_versions"}] }
    ];
    var OP_DECREASE=0;
    var OP_FILL=1;
    var OP_INCREASE=2;


    var updateSessions = {};
    var updateLocations = {};
    var updateUsers = {};
    var updateCities = {};
    var userRanges = {};
    var sessionRanges = {};
    var countryArray = {};
    var cityArray = {};
    var userProps = {};
    var updateMetrics = {};
    var MetricMetaSet = {};

    //query user data and execute processUserSession
    usage.processSession = function (logListforSingleUser) {

        common.db.collection('app_users' + logListforSingleUser[0].app_id).findOne({'_id': logListforSingleUser[0].app_user_id }, 
            function (err, dbAppUser){
    		updateSessions = {};
		updateLocations = {};
		updateUsers = {};
		updateCities = {};
		userRanges = {};
		sessionRanges = {};
		countryArray = {};
		cityArray = {};
		userProps = {};
		updateMetrics = {};
		MetricMetaSet = {};
		userRanges['meta.f-ranges'] = {};
		userRanges['meta.l-ranges'] = {};
		sessionRanges['meta.d-ranges'] = {};
		userRanges['meta.f-ranges']['$each'] = [];
		userRanges['meta.l-ranges']['$each'] = [];
		sessionRanges['meta.d-ranges']['$each'] = [];
		countryArray['meta.countries'] = {};
		cityArray['meta.cities'] = {};
		countryArray['meta.countries']['$each'] = [];
		cityArray['meta.cities']['$each'] = [];
                processUserSession(dbAppUser, logListforSingleUser);
        });
    };


    function dbCallback(err, object) {
	dbonoff.off('sessions');
        if (err){
            console.log(errHeader+':'+err);  
       }
    }

    function durationRange(totalSessionDuration) {
        var durationRanges = [
            [0,10],
            [11,30],
            [31,60],
            [61,180],
            [181,600],
            [601,1800],
            [1801,3600]
        ];
        var durationMax = 3601;
        var calculatedDurationRange;

        if (totalSessionDuration >= durationMax) {
            //calculatedDurationRange = (durationRanges.length) + '';
            calculatedDurationRange = durationRanges.length;
        } else {
            for (var i=0; i < durationRanges.length; i++) {
                if (totalSessionDuration <= durationRanges[i][1] && totalSessionDuration >= durationRanges[i][0]) {
                    //calculatedDurationRange = i + '';
                    calculatedDurationRange = i;
                    break;
                }
            }
        }

        return calculatedDurationRange;
    }

    function updateSessionDuration(sessionObj, toFill) {
        var session_duration = sessionObj.acc_duration;
        var updateTimeObject = getTimeFunction(toFill);
	var thisDurationRange = durationRange(session_duration);
        updateTimeObject(sessionObj, updateSessions, common.dbMap['durations'] + '.' + thisDurationRange);
        if (common.config.api.session_duration_limit && session_duration > common.config.api.session_duration_limit) {
                session_duration = common.config.api.session_duration_limit;
        }
        updateTimeObject(sessionObj, updateSessions, common.dbMap['duration'], session_duration);
	if (toFill != OP_DECREASE) {
	    common.arrayAddUniq(sessionRanges['meta.d-ranges']['$each'],parseInt(thisDurationRange));
	}
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
                if ((userTime - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                    (userTime - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                    return i + '';
                }
            }
        }
        return '';
    }

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


    function updateRangeMeta(ranges, coll, id, app_cnt) {
        common.db.collection(coll).update({'_id': id}, {'$addToSet': ranges}, {'upsert': true}, dbCallback); 
    }

    function updateCollection(collName, id, data, op, errHeader) {
	var opSet = {};
	opSet[op] = data;
        common.db.collection(collName).update({'_id': id}, opSet, {'upsert': true}, dbCallback); 
    }

    function reallyUpdateAll(params, app_cnt) {

	dbonoff.on('sessions',7+predefinedMetrics.length*2);
	dbonoff.off('all_sessions', app_cnt);
        updateRangeMeta(userRanges, 'users', params.app_id);
        updateCollection('users', params.app_id, updateUsers, '$inc', '[updateUsers]');

        updateRangeMeta(countryArray, 'locations', params.app_id);
        updateCollection('locations', params.app_id, updateLocations, '$inc', '[updateLocations]');
 
        updateRangeMeta(sessionRanges, 'sessions', params.app_id);
        updateCollection('sessions', params.app_id, updateSessions, '$inc', '[updateSessions]');

        if (common.config.api.city_data !== false) {
	    dbonoff.on('sessions',2);
            updateRangeMeta(cityArray, 'cities', params.app_id);
            updateCollection('cities', params.app_id, updateCities, '$inc', '[updateCities]');
        }

        updateCollection('app_users'+params.app_id, params.app_user_id, userProps, '$set', '[userProps]'); 

        for (var i=0; i < predefinedMetrics.length; i++) {
            updateRangeMeta(MetricMetaSet[predefinedMetrics[i].db], predefinedMetrics[i].db, params.app_id);
            updateCollection(predefinedMetrics[i].db, params.app_id, updateMetrics[predefinedMetrics[i].db], '$inc', '[updateMetrics:'+predefinedMetrics[i].db+']');
	}
    }

    function updateFreqRange(sessionObj, dbAppUser) {
        // Calculate the frequency range of the user
	//console.log('updateFreqRange:%j', sessionObj);
	//console.log(dbAppUser);
        var calculatedFrequency;
	if (!dbAppUser || !dbAppUser.timestamp) { //new user
            return;
	} else {
            calculatedFrequency = computeFreqRange(sessionObj.timestamp, dbAppUser.timestamp);
	}
        common.fillTimeObject(sessionObj, updateUsers, common.dbMap['frequency'] + '.' + calculatedFrequency);
        common.arrayAddUniq(userRanges['meta.f-ranges']['$each'],parseInt(calculatedFrequency));
    } 

    function updateLoyaltyRange(sessionObj, session_count) {
        // Calculate the loyalty range of the user
        var calculatedLoyaltyRange = computeLoyaltyRange(session_count);
        common.fillTimeObject(sessionObj, updateUsers, common.dbMap['loyalty'] + '.' + calculatedLoyaltyRange);
	common.arrayAddUniq(userRanges['meta.l-ranges']['$each'], parseInt(calculatedLoyaltyRange));
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
	    var metricDb = predefinedMetrics[i].db;
            for (var j=0; j<predefinedMetrics[i].metrics.length; j++) {
                var tmpMetric = predefinedMetrics[i].metrics[j];
                var recvMetricValue = sessionObject.metrics[tmpMetric.name];

                if (recvMetricValue) {
                    var escapedMetricVal = recvMetricValue.replace(/^\$/, "").replace(/\./g, ":");
                    var metricMeta = 'meta.' + tmpMetric.set;
		    if (!MetricMetaSet[metricDb]) {
			MetricMetaSet[metricDb] = {};
		    }
		    if (!MetricMetaSet[metricDb][metricMeta]) {
			MetricMetaSet[metricDb][metricMeta] = {};
		    }
		    if (!MetricMetaSet[metricDb][metricMeta]['$each'] || 
			!MetricMetaSet[metricDb][metricMeta]['$each'].length) {
			MetricMetaSet[metricDb][metricMeta]['$each'] = [];
		    }
                    common.arrayAddUniq(MetricMetaSet[metricDb][metricMeta]['$each'], escapedMetricVal);

		    if (!updateMetrics[metricDb]) {
			updateMetrics[metricDb] = {};
	            }	
                    updateTimeObject(sessionObject, updateMetrics[metricDb], escapedMetricVal + '.' + prop);
                }
            }
        }
    }

    function updateStatistics(sessionObject, prop, toFill, increase) {
        var incr = increase? increase : 1;
        var updateTimeObject = getTimeFunction(toFill);
        updateTimeObject(sessionObject, updateSessions, prop, incr);
        updateTimeObject(sessionObject, updateLocations, sessionObject.country + '.' + prop, incr);
        common.arrayAddUniq(countryArray['meta.countries']['$each'], sessionObject.country);
        if (common.config.api.city_data !== false) {
            updateTimeObject(sessionObject, updateCities, sessionObject.city + '.' + prop, incr);
            common.arrayAddUniq(cityArray['meta.cities']['$each'], sessionObject.city);
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
                        userProps[tmpMetric.name] = escapedMetricVal;
                    }
                }
            }
        }
    }

    function updateUserProfile(sessionObject, finalUserObject) {
        //updateUserMetric(sessionObject);
        userProps[common.dbUserMap['device_id']] = sessionObject.device_id;
        userProps[common.dbUserMap['session_duration']] = parseInt(sessionObject.acc_duration);
        userProps[common.dbUserMap['total_session_duration']] = parseInt(finalUserObject[common.dbUserMap['total_session_duration']]);
        userProps[common.dbUserMap['session_count']] = finalUserObject[common.dbUserMap['session_count']];
        userProps[common.dbUserMap['last_end_session_timestamp']] = finalUserObject[common.dbUserMap['last_end_session_timestamp']];
        userProps.metrics = sessionObject.metrics;
        userProps.appTimezone = sessionObject.appTimezone;
        userProps.timestamp = sessionObject.timestamp;
        userProps.tz = sessionObject.tz;
        userProps.time = sessionObject.time;
        userProps.country = sessionObject.country;
        userProps.city = sessionObject.city;
        userProps.app_id = sessionObject.app_id;
        userProps.app_user_id = sessionObject.app_user_id;
    }

    //Param: dbAppUser-user data in app_user_XXX, apps:all logs for a Single User
    function processUserSession(dbAppUser, apps) {
        var sessionObj = [];
        var last_end_session_timestamp = 0;
        var total_duration = 0;
	var i = 0;

        if (dbAppUser) { //set sessionObj[0] = dbAppUser to compute on-going session
            dbAppUser.acc_duration = parseInt(dbAppUser[common.dbUserMap['session_duration']]);
            sessionObj[0] = common.clone(dbAppUser);
            last_end_session_timestamp = dbAppUser[common.dbUserMap['last_end_session_timestamp']];
        } else { //new user
            sessionObj[0] = {};
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
        var currObjIdx = 0;
        for (i=0; i<apps.length; i++) {
            apps[i].time = common.initTimeObj(apps[i].appTimezone, apps[i].timestamp, apps[i].tz);
            //set event(request) count for every request
            common.incrTimeObject(apps[i], updateSessions, common.dbMap['events']); 
            if (apps[i].begin_session) {
                if ((apps[i].timestamp - last_end_session_timestamp) <= common.config.api.cl_endsession_ongoing_timeout) { //ongoing session
                    last_end_session_timestamp = 0;
                    continue;
                }
                last_end_session_timestamp = 0;
                //init a new sessionObj to keep the session with this begin_session
                sessionObj[++currObjIdx] = apps[i];
                sessionObj[currObjIdx].acc_duration = 0;
            }
            if (apps[i].end_session) { 
                //used to judge if there will be ongoing session
                last_end_session_timestamp = apps[i].timestamp;
            }
            if (apps[i].session_duration) {
                sessionObj[currObjIdx].acc_duration += parseInt(apps[i].session_duration);
                total_duration += parseInt(apps[i].session_duration);
            }
        }

        //Prepare final Session info to update
        var finalUserObject = {};
        finalUserObject[common.dbUserMap['last_end_session_timestamp']] = last_end_session_timestamp;
        finalUserObject[common.dbUserMap['session_count']] = (dbAppUser?dbAppUser[common.dbUserMap['session_count']]:0) + currObjIdx;
        finalUserObject[common.dbUserMap['total_session_duration']] 
            = total_duration + (dbAppUser?parseInt(dbAppUser[common.dbUserMap['total_session_duration']]):0);

        var sessionObjByDay = [];
        var sessionDay = null;
        var sessionDayIdx = -1;
        var startIdx = dbAppUser? 0 : 1;
        var calculatedDurationRange = 0;

        for (i=startIdx; i<=currObjIdx; i++) { 
            if (sessionDay != sessionObj[i].time.daily) { //sort sessions by day
                sessionDay = sessionObj[i].time.daily;
                sessionObjByDay[++sessionDayIdx]= [];                
            }
            sessionObjByDay[sessionDayIdx].push(sessionObj[i]);

	    if (sessionObj[i].acc_duration > 0) { //ignore partial session which has no end_session or session_duration info
                updateSessionDuration(sessionObj[i], OP_INCREASE);
	    }

            //set total user/unique user count in necessary collections   
            common.computeGeoInfo(sessionObj[i]);
            updateStatistics(sessionObj[i], common.dbMap['total'], OP_INCREASE); //will increase for every session
            updateStatistics(sessionObj[i], common.dbMap['unique'], OP_FILL); // only set once
        }
	    console.log('sessionObj');
	    console.log(sessionObj);

	//For frequency computation, no need to do with sessions in the same day as old sessions(dbAppUser)
	//The 1st session will be dealt with in new user block
        for (i=1; i<sessionObjByDay.length; i++) { 
            updateFreqRange(sessionObjByDay[i][0], sessionObjByDay[i-1][sessionObjByDay[i-1].length-1]);
	}

        //update loyalty from the 2nd day
        var session_count = dbAppUser?dbAppUser[common.dbUserMap['session_count']]:0;
        for (i=1; i<sessionObjByDay.length; i++) {
            session_count += sessionObjByDay[i-1].length;
            updateLoyaltyRange(sessionObjByDay[i][0], session_count);
        }

        //If there is on-going session coming in at first...
        if (dbAppUser) {
            //Update last session in DB to include new session duration sent after last processing, also update duration ranges
            if (dbAppUser.acc_duration>0) {
		updateSessionDuration(dbAppUser, OP_DECREASE);
	    }
            updateStatistics(dbAppUser, common.dbMap['total'], OP_DECREASE); 
            updateStatistics(dbAppUser, common.dbMap['unique'], OP_DECREASE); // reset previous add in sessionObj

        } else { //set new user count in necessary collections   
            updateStatistics(sessionObjByDay[0][0], common.dbMap['new']);
            updateLoyaltyRange(sessionObjByDay[0][0], 1); //session count = 1
	    updateFreqRange(sessionObjByDay[0][0], sessionObjByDay[0][0]); //set 1st session
        }

        //use last session object to update user profiles (metrics)
        updateUserProfile(sessionObj[currObjIdx], finalUserObject);

        //do the real update job in MongoDB
        reallyUpdateAll(sessionObj[startIdx], apps.length);
    }
}(usage));

module.exports = usage;
