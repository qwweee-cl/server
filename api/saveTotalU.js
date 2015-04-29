var mongo = require('mongoskin'),
	moment = require('moment'),
	momentz = require('moment-timezone'),
    mysql = require('mysql'),
    ObjectID = require('mongodb').ObjectID,
    common = require('./utils/common.js'),
	print = console.log;

var countryList = ['US','GB','CA','FR','DE','CN','TW','HK','JP',
                   'IN','RU','BR','MX','TR','IT','ES','ID','AU',
                   'SG'];
var insertArray = [];
var intRegex = /^\d+$/;

var timeZone = "America/Denver";
var db = common.db;

var YCP_iOS_Oid = new ObjectID("543f8693a9e5b7ed76000012");
var YCP_And_Oid = new ObjectID("543f37d0a62268c51e16d053");

var YMK_iOS_Oid = new ObjectID("543f866fa9e5b7ed76000011");
var YMK_And_Oid = new ObjectID("543f37eaa62268c51e16d0c3");

var AndAppList = [YCP_And_Oid,YMK_And_Oid];
var iOSAppList = [YCP_iOS_Oid,YMK_iOS_Oid];
var collectionName = "app_users";

var mysqlHostName = "localhost";
var mysqlUser = 'root';
var mysqlPassword = 'cyberlink#1'

var connection = mysql.createConnection({
	host: mysqlHostName,
	user: mysqlUser,
	password: mysqlPassword,
});

var dbCount = 0;
if (process.argv.length != 3) {
	print("error params");
	return;
}
var nowMoment = momentz.tz(process.argv[2], "YYYY-MM-DD", timeZone);
var nowYear = nowMoment.format("YYYY");
var nowMonth = nowMoment.format("M");
var nowDay = nowMoment.format("D");
var nowWeek = nowMoment.format("w");
print(nowYear+" "+nowMonth+" "+nowDay+" "+nowWeek);
var dayStr = nowMoment.format("YYYY-MM-DD");
var tmpObjDate = new Date(nowYear, nowMonth-1, nowDay);
var sunday = getSunday(tmpObjDate);
var sunMoment = moment(sunday).add(1, "days");
var weekStr = sunMoment.format("YYYY-MM-DD");
var monthStr = sunMoment.format("YYYY-MM-01");
var yearStr = sunMoment.format("YYYY-01-01");
print(dayStr);
print(weekStr);
print(monthStr);
print(yearStr);

//upsetTotalU(eventDay, duration, appName, os, country, totalU)

var b_coll = db.collection(collectionName+YMK_And_Oid);

b_coll.count({country: {$nin: countryList}}, function (err, result) {
	dbCount++;
	if (!result) {
    	print("YMK_And no data");
    	return;
    }
    upsetTotalU(yearStr, "Y", "YMK", "And", "Others", result);
    upsetTotalU(monthStr, "M", "YMK", "And", "Others", result);
    upsetTotalU(weekStr, "W", "YMK", "And", "Others", result);
    upsetTotalU(dayStr, "D", "YMK", "And", "Others", result);
});
for (var index in countryList) {
	getCountyCount(yearStr, monthStr, weekStr, dayStr,
		"YMK", "And", countryList[index], b_coll);
}

b_coll = db.collection(collectionName+YMK_iOS_Oid);
b_coll.count({country: {$nin: countryList}}, function (err, result) {
	dbCount++;
	if (!result) {
    	print("YMK_iOS no data");
    	return;
    }
    upsetTotalU(yearStr, "Y", "YMK", "iOS", "Others", result);
    upsetTotalU(monthStr, "M", "YMK", "iOS", "Others", result);
    upsetTotalU(weekStr, "W", "YMK", "iOS", "Others", result);
    upsetTotalU(dayStr, "D", "YMK", "iOS", "Others", result);
});
for (var index in countryList) {
	getCountyCount(yearStr, monthStr, weekStr, dayStr
		, "YMK", "iOS", countryList[index], b_coll);
}

b_coll = db.collection(collectionName+YCP_And_Oid);
b_coll.count({country: {$nin: countryList}}, function (err, result) {
	if (!result) {
    	print("YCP_And no data");
    	return;
    }
    upsetTotalU(yearStr, "Y", "YCP", "And", "Others", result);
    upsetTotalU(monthStr, "M", "YCP", "And", "Others", result);
    upsetTotalU(weekStr, "W", "YCP", "And", "Others", result);
    upsetTotalU(dayStr, "D", "YCP", "And", "Others", result);
});
for (var index in countryList) {
	getCountyCount(yearStr, monthStr, weekStr, dayStr,
		"YCP", "And", countryList[index], b_coll);
}

b_coll = db.collection(collectionName+YCP_iOS_Oid);
b_coll.count({country: {$nin: countryList}}, function (err, result) {
	if (!result) {
    	print("YCP_iOS no data");
    	return;
    }
    upsetTotalU(dayStr, "Y", "YCP", "iOS", "Others", result);
    upsetTotalU(dayStr, "M", "YCP", "iOS", "Others", result);
    upsetTotalU(dayStr, "W", "YCP", "iOS", "Others", result);
    upsetTotalU(dayStr, "D", "YCP", "iOS", "Others", result);
});
for (var index in countryList) {
	getCountyCount(yearStr, monthStr, weekStr, dayStr,
		"YCP", "iOS", countryList[index], b_coll);
}

// BOTH Android
b_coll = db.collection("uma");
b_coll.count({
	$and: [
	{country: 
		{$nin: countryList}},
	{my_apps: 
		{$all: AndAppList}}
	]
}, function (err, result) {
	if (!result) {
    	print("BOTH_And no data");
    	return;
    }
    print(result);
    upsetTotalU(dayStr, "Y", "BOTH", "And", "Others", result);
    upsetTotalU(dayStr, "M", "BOTH", "And", "Others", result);
    upsetTotalU(dayStr, "W", "BOTH", "And", "Others", result);
    upsetTotalU(dayStr, "D", "BOTH", "And", "Others", result);
});

for (var index in countryList) {
	getUUCountyCount(yearStr, monthStr, weekStr, dayStr,
		"BOTH", "And", countryList[index], b_coll, AndAppList);
}

// BOTH iOS
b_coll.count({
	$and: [
	{country: 
		{$nin: countryList}},
	{my_apps: 
		{$all: iOSAppList}}
	]
}, function (err, result) {
	if (!result) {
    	print("BOTH_iOS no data");
    	return;
    }
    print(result);
    upsetTotalU(dayStr, "Y", "BOTH", "iOS", "Others", result);
    upsetTotalU(dayStr, "M", "BOTH", "iOS", "Others", result);
    upsetTotalU(dayStr, "W", "BOTH", "iOS", "Others", result);
    upsetTotalU(dayStr, "D", "BOTH", "iOS", "Others", result);
});

for (var index in countryList) {
	getUUCountyCount(yearStr, monthStr, weekStr, dayStr,
		"BOTH", "iOS", countryList[index], b_coll, iOSAppList);
}

var cnt=0;
var repeat_times = 0;
var wait_cnt = 10;
var baseTimeOut = 3000;
baseTimeOut = 10000;
wait_cnt = 30;
setInterval(function() {
    if (dbCount > 0) {
    	print(dbCount);
    	var new_cnt = dbCount;
    	if (new_cnt == cnt) {
            repeat_times++;
            print('repeat wait = ' + repeat_times);
        } else {
            cnt = new_cnt;
            repeat_times = 0;
        }
		if (repeat_times == (wait_cnt-2)) {
		    //print(iapData);
		    print("dbCount: "+dbCount);
		}
    	if (repeat_times > wait_cnt) {
    		print("exit process");
    	    process.exit(0);
    	}
    } else {
    	dbCount++;
    }
}, baseTimeOut);
return;

function pad2(number) {
    return (number < 10 ? '0' : '') + number
}
function callSP(sql) {
	connection.query(sql, function(err, results, fields) {
		dbCount++;
		if (err) throw err;
		if (results.affectedRows == 0) {
			print(sql);
		}
	});
}
function upsetTotalU(eventDay, duration, appName, os, country, totalU) {
	print(eventDay+" "+duration+" "+appName+" "+os+" "+country+" "+totalU);
	var sql = "call BcTest.countlyIn_upset_totalU('"+eventDay+
		"', '"+duration+"', '"+appName+"', '"+os+"', '"+country+"', "+totalU+");";
	//print(sql);
	callSP(sql);
}
function getCountyCount(yearStr, monthStr, weekStr, dayStr,
	appName, os, countryName, b_coll) {
	b_coll.count({country: countryName}, function (err, result) {
		dbCount++;
		if (!result) {
	    	//print(appName+"_"+os+" no data");
	    	return;
	    }
	    upsetTotalU(yearStr, "Y", appName, os, countryName, result);
	    upsetTotalU(monthStr, "M", appName, os, countryName, result);
	    upsetTotalU(weekStr, "W", appName, os, countryName, result);
	    upsetTotalU(dayStr, "D", appName, os, countryName, result);
	});
}
function getUUCountyCount(yearStr, monthStr, weekStr, dayStr,
	appName, os, countryName, b_coll, appList) {
	b_coll.count({$and: [
	{country: countryName},
	{my_apps: 
		{$all: appList}}
	]}, function (err, result) {
		dbCount++;
		if (!result) {
	    	//print(appName+"_"+os+" no data");
	    	return;
	    }
	    upsetTotalU(yearStr, "Y", appName, os, countryName, result);
	    upsetTotalU(monthStr, "M", appName, os, countryName, result);
	    upsetTotalU(weekStr, "W", appName, os, countryName, result);
	    upsetTotalU(dayStr, "D", appName, os, countryName, result);
	});
}
function getSunday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day; // adjust when day is sunday
  return new Date(d.setDate(diff));
}