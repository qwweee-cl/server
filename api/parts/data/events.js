var events = {},
    dbonoff = require('./../../utils/dbonoff.js'),
    common = require('./../../utils/common.js');
//var emitter = require('events').prototype._maxListeners = 100;
//var emitter = require('events');

(function (events) {

    var updateSessions = {};
	var bag = {};
    	bag.eventCollections = {};
    	bag.eventSegments = {};
    	bag.eventArray = [];            

    events.processEvents = function(app, isFinal) {
        bag.app_id = app[0].app_id;

        for (var i=0; i<app.length; i++) {
            app[i].time = common.initTimeObj(app[i].appTimezone, app[i].timestamp, app[i].tz);
            //update requests count
            common.incrTimeObject(app[i], updateSessions, common.dbMap['events']); 
            eventAddup(bag,app[i]); //will be computed in old user, that's ok
	}
        logCurrUserEvents(app);

	if (isFinal) {
            updateEvents(bag);
    	    updateEventMeta(bag);
	    updateReqSessions(updateSessions,bag.app_id);
	}
    }

    function updateReqSessions(updateSessions, app_id) {
        common.db.collection('sessions').update({'_id':app_id}, {'$inc':updateSessions},  
	    {'upsert': true}, function (err, data) {
        	if (err){
            	    console.log('[processEvent]user req log error:' + err);  
        	}
		dbonoff.on('raw');
	});
    }

    function eventAddup(bag, params) {
        var tmpEventObj = {},
            tmpEventColl = {},
            shortCollectionName = "",
            eventCollectionName = "";

        for (var i=0; i < params.events.length; i++) {

            var currEvent = params.events[i];
            tmpEventObj = {};
            tmpEventColl = {};
            
            //console.log('current event:%j', currEvent);

            // Key and count fields are required
            if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count)) {
                console.log('No key or count:%j', currEvent);
                continue;
            }

            // Mongodb collection names can not contain system. or $
            shortCollectionName = currEvent.key.replace(/system\.|\.\.|\$/g, "");
            eventCollectionName = shortCollectionName + params.app_id;

            // Mongodb collection names can not be longer than 128 characters
            if (eventCollectionName.length > 128) {
                console.log('[Error]:Event name too long!');
                continue;
            }

            // If present use timestamp inside each event while recording
            if (params.events[i].timestamp) {
                params.time = common.initTimeObj(params.appTimezone, params.events[i].timestamp, params.events[i].tz);
            }

            common.arrayAddUniq(bag.eventArray, shortCollectionName);

            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                common.fillTimeObject(params, tmpEventObj, common.dbMap['sum'], currEvent.sum);
            }
            common.fillTimeObject(params, tmpEventObj, common.dbMap['count'], currEvent.count);

            tmpEventColl["no-segment"] = tmpEventObj;

            if (currEvent.segmentation) {
                for (var segKey in currEvent.segmentation) {

                    if (!currEvent.segmentation[segKey]) {
                        continue;
                    }

                    tmpEventObj = {};
                    var tmpSegVal = currEvent.segmentation[segKey] + "";

                    // Mongodb field names can't start with $ or contain .
                    tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");

                    if (currEvent.sum && common.isNumber(currEvent.sum)) {
                        common.fillTimeObject(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['sum'], currEvent.sum);
                    }
                    common.fillTimeObject(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['count'], currEvent.count);

                    if (!bag.eventSegments[eventCollectionName]) {
                        bag.eventSegments[eventCollectionName] = {};
                    }

                    if (!bag.eventSegments[eventCollectionName]['meta.' + segKey]) {
                        bag.eventSegments[eventCollectionName]['meta.' + segKey] = {};
                        bag.eventSegments[eventCollectionName]['meta.' + segKey]['$each'] = [];
                    }

                    common.arrayAddUniq(bag.eventSegments[eventCollectionName]['meta.' + segKey]["$each"], tmpSegVal);

                    if (!bag.eventSegments[eventCollectionName]["meta.segments"]) {
                        bag.eventSegments[eventCollectionName]["meta.segments"] = {};
                        bag.eventSegments[eventCollectionName]["meta.segments"]["$each"] = [];
                    }

                    common.arrayAddUniq(bag.eventSegments[eventCollectionName]["meta.segments"]["$each"], segKey);
                    tmpEventColl[segKey] = tmpEventObj;
                }
            } else if (currEvent.seg_val && currEvent.seg_key) {
                tmpEventObj = {};

                // Mongodb field names can't start with $ or contain .
                currEvent.seg_val = currEvent.seg_val.replace(/^\$/, "").replace(/\./g, ":");

                if (currEvent.sum && common.isNumber(currEvent.sum)) {
                    common.fillTimeObject(params, tmpEventObj, currEvent.seg_val + '.' + common.dbMap['sum'], currEvent.sum);
                }
                common.fillTimeObject(params, tmpEventObj, currEvent.seg_val + '.' + common.dbMap['count'], currEvent.count);

                if (!bag.eventSegments[eventCollectionName]) {
                    bag.eventSegments[eventCollectionName] = {};
                }

                if (!bag.eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]) {
                    bag.eventSegments[eventCollectionName]['meta.' + currEvent.seg_key] = {};
                }

                common.arrayAddUniq(bag.eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]["$each"], currEvent.seg_val);

                if (!bag.eventSegments[eventCollectionName]["meta.segments"]) {
                    bag.eventSegments[eventCollectionName]["meta.segments"] = {};
                    bag.eventSegments[eventCollectionName]["meta.segments"]["$each"] = [];
                }

                common.arrayAddUniq(bag.eventSegments[eventCollectionName]["meta.segments"]["$each"], currEvent.seg_key);
                tmpEventColl[currEvent.seg_key] = tmpEventObj;
            }

            if (!bag.eventCollections[eventCollectionName]) {
                bag.eventCollections[eventCollectionName] = {};
            }

            mergeEvents(bag.eventCollections[eventCollectionName], tmpEventColl);
            return bag.eventCollections;
        }

        function mergeEvents(firstObj, secondObj) {
            for (var firstLevel in secondObj) {

                if (!secondObj.hasOwnProperty(firstLevel)) {
                    continue;
                }

                if (!firstObj[firstLevel]) {
                    firstObj[firstLevel] = secondObj[firstLevel];
                    continue;
                }

                for (var secondLevel in secondObj[firstLevel]) {

                    if (!secondObj[firstLevel].hasOwnProperty(secondLevel)) {
                        continue;
                    }

                    if (firstObj[firstLevel][secondLevel]) {
                        firstObj[firstLevel][secondLevel] += secondObj[firstLevel][secondLevel];
                    } else {
                        firstObj[firstLevel][secondLevel] = secondObj[firstLevel][secondLevel];
                    }
                }
            }
        }
    }


    function updateEvents(bag) {
        // update Segmentation_key+App_id collections
	console.log('event collections add:'+Object.keys(bag.eventCollections).length); 
        for (var collection in bag.eventCollections) {
            for (var segment in bag.eventCollections[collection]) {
                if (segment == "no-segment" && bag.eventSegments[collection]) {
                    common.db.collection(collection).update({'_id': segment}, 
			{'$inc': bag.eventCollections[collection][segment], 
			'$addToSet': bag.eventSegments[collection]}, {'upsert': true}, eventCallback);
                } else {
                    common.db.collection(collection).update({'_id': segment}, 
			{'$inc': bag.eventCollections[collection][segment]}, 
			{'upsert': true}, eventCallback);
                }
            }
        }
    }

    function eventCallback(err, res) {
	if (err){
	    console.log('userEvent log error:' + err);  
	}
	dbonoff.on('raw');
    }

    function updateEventMeta(bag) {
        // update events collection
        if (bag.eventArray.length) {
            var eventSegmentList = {'$addToSet': {'list': {'$each': bag.eventArray}}};

            for (var event in bag.eventSegments) {
                if (!eventSegmentList['$addToSet']["segments." + event.replace(bag.app_id, "")]) {
                    eventSegmentList['$addToSet']["segments." + event.replace(bag.app_id, "")] = {};
                }

                if (bag.eventSegments[event]['meta.segments']) {
                    eventSegmentList['$addToSet']["segments." + event.replace(bag.app_id, "")] = bag.eventSegments[event]['meta.segments'];
                }
            }

            common.db.collection('events').update({'_id': bag.app_id}, eventSegmentList, {'upsert': true}, 
		function(err, data) {
        	    if (err){
            	    	console.log('Event Meta log error:' + err);  
		    }
	            dbonoff.on('raw');
		});

        } 
    };

    function logCurrUserEvents(apps) {
	console.log('user evnet # = '+apps.length);
        var user = {};
        var action = {};
        for (j=0; j<apps.length; j++) {
            if (apps[j].events) {
                var eventList = apps[j].events;
                //console.log('events:%j', events);
                for ( i=0; i<eventList.length; i++) {
                    var e = eventList[i];
                    var key = e.key;
                    if (key == '_UMA_ID') {
                        if (e.segmentation.google_play_advertising_id) 
                            user.google_play_advertising_id = e.segmentation.google_play_advertising_id;
                        if (e.segmentation.android_id) 
                            user.android_id = e.segmentation.android_id;
                        if (e.segmentation.identifier_for_vendor) 
                            user.identifier_for_vendor = e.segmentation.identifier_for_vendor;
                    } else {
                        //console.log(e);            
                        computeCnt(e, key, action);
                        if (e.segmentation) {
                            for (var prop in e.segmentation) {
                                var prop_key = key+'.'+prop;
                                //console.log(prop_key);
                                computeCnt(e, prop_key, action);
                                //console.log("value:"+e.segmentation[prop]);
                                computeCnt(e, prop_key+'.'+e.segmentation[prop], action);                    
                            }
                        }
                    }

                }
            }
            //console.log('user:%j', user);
            //console.log('action:%j', action);
        }
        user.device_id = apps[apps.length-1].device_id;
        user.timestamp = apps[apps.length-1].timestamp;
        user.tz = apps[apps.length-1].tz;
	common.computeGeoInfo(apps[apps.length-1]);
        user.country = apps[apps.length-1].country;

        common.db_ibb.collection('ibb_'+bag.app_id).update({device_id:user.device_id}, {$set:user, $inc:action}
            , {upsert:true}, function (err, res) {
	    if (err) {
		console.log('[ibb error]:'+err);
	    }
	    dbonoff.on('raw');
            //process.emit('updateEvent');
	});

        function computeCnt(e, key, action) {
            var cnt = e.count||1;
            //console.log('add key:'+key);
            if (typeof action[key+'.cnt'] != 'undefined') {
                action[key+'.cnt'] += cnt;
            } else {
                action[key+'.cnt'] = cnt;
            }
            if (e.sum) {
                if (action.hasOwnProperty(key+'.sum')) {
                    action[key+'.sum'] += e.sum;
                } else {
                    action[key+'.sum'] = e.sum;
                }
            }
        }
    }

} (events));

module.exports = events;
