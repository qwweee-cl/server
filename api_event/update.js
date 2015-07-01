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

var collectionName = "app_users";

var mysqlHostName = "localhost";
var mysqlUser = 'root';
var mysqlPassword = 'cyberlink#1'

var connection = mysql.createConnection({
	host: mysqlHostName,
	user: mysqlUser,
	password: mysqlPassword,
});

b_coll = db.collection("test_test");


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
function insertMysql(data) {
	if ((JSON.stringify(insertArray).length+JSON.stringify(data).length)>100000) {
		realInser2Mysql();
		while (insertArray.length) {
			insertArray.pop();
		}
	}
	insertArray.push(data);
}
function realInser2Mysql() {
	//print(JSON.stringify(insertArray));
	var sql = "INSERT INTO BcTest.countlyIn (eventDay, duration, appName, os, "+
		"country, activeU, totalU, newU, session) VALUES ?";
	var values = [];
	for (var row in insertArray) {
		//print(insertArray[row]);
		values.push([insertArray[row].eventDay, insertArray[row].duration, 
			insertArray[row].appName, insertArray[row].os, insertArray[row].country,
			insertArray[row].aU, insertArray[row].tU, insertArray[row].nU,
			insertArray[row].sU]);
	}
	if (values.length) {
		print(values);
		connection.query(sql, [values], function(err) {
			if (err) throw err;
			if (insertArray.length) {
				dbCount++;
			}
			insertArray.length = 0;
		});
	}
}
function callSP(sql) {
	connection.query(sql, function(err, results, fields) {
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
function getSunday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day; // adjust when day is sunday
  return new Date(d.setDate(diff));
}


coll_wrong.update({'_id':obj_id_t}, {$set: {'2015.1.3.A1':{'m':14}}}, {upsert: true},
   //coll_wrong.update({'_id':obj_id_t}, {$set: {keyProp:{'m':14}}}, {upsert: true},
        function(errU, numberUpdated, status){
            if(errU) {
                console.log("UpdateSingle with error: " + errU);
            }
            console.log("UpdateSingle, key: " + keyProp + ", value: " + JSON.stringify(data[country]));
            if( ++idxCountry < keys.length)
                process.emit("UpdateOne")
    });

