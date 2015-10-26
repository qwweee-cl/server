var mongo = require('mongoskin'),
	moment = require('moment'),
	momentz = require('moment-timezone'),
    mysql = require('mysql'),
    ObjectID = require('mongodb').ObjectID,
    common = require('./utils/common.js'),
	print = console.log;

var countryList = ['US','GB','CA','FR','DE','CN','TW','HK','JP',
                   'IN','RU','BR','MX','TR','IT','ES','ID','AU',
                   'SG','KR'];
var processArray = [];
var intRegex = /^\d+$/;

var timeZone = "America/Denver";
var db = common.db;

var YCP_iOS_Oid = new ObjectID("543f8693a9e5b7ed76000012");
var YCP_And_Oid = new ObjectID("543f37d0a62268c51e16d053");

var YMK_iOS_Oid = new ObjectID("543f866fa9e5b7ed76000011");
var YMK_And_Oid = new ObjectID("543f37eaa62268c51e16d0c3");

var YCN_iOS_Oid = new ObjectID("55d69ff33b254f9535d6059a");
var YCN_And_Oid = new ObjectID("55d6a0123b254f9535d6142d");

var PF_iOS_Oid = new ObjectID("5552bf53acdd571e2e00044e");
var PF_And_Oid = new ObjectID("5551e55cacdd571e2e000443");

var collectionName = "UU_locations";
var collectionName2 = "locations";
var collectionName3 = "sessions";

var saveYearly = true;

var dbCount = 0;
var date = new Date();
var nowMoment = momentz(date).tz(timeZone);
var nowYear = nowMoment.format("YYYY");
var nowMonth = nowMoment.format("M");
var nowDate = nowMoment.format("D");
var nowWeekOfYear = nowMoment.format("w");
print(date);
date = nowMoment.toDate();
print(date);

var beginMoment = nowMoment.add(-7, "months");
var beginYear = beginMoment.format("YYYY");
var beginMonth = beginMoment.format("M");
var beginDate = beginMoment.format("D");
var beginWeekOfYear = beginMoment.format("w");
var oldDate = new Date(beginYear, beginMonth-1, beginDate);
print(oldDate);
/*
print(nowYear);
print(nowMonth);
print(nowDate);
print(nowWeekOfYear);

print(beginYear);
print(beginMonth);
print(beginDate);
print(beginWeekOfYear);
*/
var mysqlHostName = "localhost";
var mysqlUser = 'root';
var mysqlPassword = 'cyberlink#1'

var connection = mysql.createConnection({
	host: mysqlHostName,
	user: mysqlUser,
	password: mysqlPassword,
});

var tmpMoment = beginMoment;
var fetchFields = {};

var yearArray = [];
var monthArray = [];
var dayArray = [];
var weekArray = [];

var insertArray = [];

while(!tmpMoment.isAfter(date)) {
	var tmpYear = tmpMoment.format("YYYY");
	var tmpMonth = tmpMoment.format("M");
	var tmpDate = tmpMoment.format("D");
	var tmpWeekOfYear = tmpMoment.format("w");
	var tmpObj = {year: tmpYear, month: tmpMonth, day: tmpDate, week: tmpWeekOfYear};
	print(tmpObj);
	/*
	print(tmpYear);
	print(tmpMonth);
	print(tmpDate);
	print(tmpWeekOfYear);
	*/
	var str = tmpYear;
	if (processArray.indexOf(str) == -1) {
		processArray.push(str);
		yearArray.push(tmpObj);
		/*
		fetchFields[tmpYear+".t"] = 1;
		fetchFields[tmpYear+".u"] = 1;
		fetchFields[tmpYear+".n"] = 1;
		*/
	}
	str = tmpYear+".w"+tmpWeekOfYear;
	if (processArray.indexOf(str) == -1) {
		processArray.push(str);
		weekArray.push(tmpObj);
		/*
		fetchFields[tmpYear+".w"+tmpWeekOfYear+".t"] = 1;
		fetchFields[tmpYear+".w"+tmpWeekOfYear+".u"] = 1;
		fetchFields[tmpYear+".w"+tmpWeekOfYear+".n"] = 1;
		*/
	}
	str = tmpYear+"."+tmpMonth;
	if (processArray.indexOf(str) == -1) {
		processArray.push(str);
		monthArray.push(tmpObj);
		/*
		fetchFields[tmpYear+"."+tmpMonth+".t"] = 1;
		fetchFields[tmpYear+"."+tmpMonth+".u"] = 1;
		fetchFields[tmpYear+"."+tmpMonth+".n"] = 1;
		*/
	}
	str = tmpYear+"."+tmpMonth+"."+tmpDate;
	if (processArray.indexOf(str) == -1) {
		processArray.push(str);
		dayArray.push(tmpObj);
		/*
		fetchFields[tmpYear+"."+tmpMonth+"."+tmpDate+".t"] = 1;
		fetchFields[tmpYear+"."+tmpMonth+"."+tmpDate+".u"] = 1;
		fetchFields[tmpYear+"."+tmpMonth+"."+tmpDate+".n"] = 1;
		*/
	}
	tmpMoment = tmpMoment.add(1, "days");
}
processArray.sort();

//print(monthArray);
//print(dayArray);
//print(weekArray);
var b_coll = db.collection(collectionName);
var b_coll2 = db.collection(collectionName2);
var b_coll3 = db.collection(collectionName3);
/*
b_coll.findOne({_id:YMK_And_Oid}, function (err, result) {
    if (!result) {
    	print("BOTH_And no data");
    	return;
    }
    getData(result, "And", "BOTH");
});
b_coll.findOne({_id:YMK_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("BOTH_iOS no data");
    	return;
    }
    getData(result, "iOS", "BOTH");
});
*/

b_coll2.findOne({_id:YMK_And_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YMK_And no data");
	print(err);
    	return;
    }
    getData(result, "And", "YMK");
});
b_coll2.findOne({_id:YMK_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YMK_iOS no data");
	print(err);
    	return;
    }
    getData(result, "iOS", "YMK");
});
b_coll2.findOne({_id:YCP_And_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCP_And no data");
	print(err);
    	return;
    }
    getData(result, "And", "YCP");
});
b_coll2.findOne({_id:YCP_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCP_iOS no data");
	print(err);
    	return;
    }
    getData(result, "iOS", "YCP");
});
b_coll2.findOne({_id:YCN_And_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCN_And no data");
	print(err);
    	return;
    }
    getData(result, "And", "YCN");
});
b_coll2.findOne({_id:YCN_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCN_iOS no data");
	print(err);
    	return;
    }
    getData(result, "iOS", "YCN");
});
b_coll2.findOne({_id:PF_And_Oid}, function (err, result) {
	dbCount++;
	if (!result) {
		print("PF_And no data");
		print(err);
		return;
	}
	getData(result, "And", "BOTH");
});
b_coll2.findOne({_id:PF_iOS_Oid}, function (err, result) {
	dbCount++;
	if (!result) {
		print("PF_iOS no data");
		print(err);
		return;
	}
	getData(result, "iOS", "BOTH");
});
/*
b_coll3.findOne({_id:YMK_And_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YMK_And no data");
    	return;
    }
    getALLData(result, "And", "YMK");
});
b_coll3.findOne({_id:YMK_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YMK_iOS no data");
    	return;
    }
    getALLData(result, "iOS", "YMK");
});
b_coll3.findOne({_id:YCP_And_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCP_And no data");
    	return;
    }
    getALLData(result, "And", "YCP");
});
b_coll3.findOne({_id:YCP_iOS_Oid}, function (err, result) {
	dbCount++;
    if (!result) {
    	print("YCP_iOS no data");
    	return;
    }
    getALLData(result, "iOS", "YCP");
});
b_coll3.findOne({_id:PF_And_Oid}, function (err, result) {
	dbCount++;
	if (!result) {
		print("PF_And no data");
		return;
	}
	getALLData(result, "And", "BOTH");
});
b_coll3.findOne({_id:PF_iOS_Oid}, function (err, result) {
	dbCount++;
	if (!result) {
		print("PF_iOS no data");
		return;
	}
	getALLData(result, "iOS", "BOTH");
});
*/
var cnt=0;
var repeat_times = 0;
var wait_cnt = 10;
var baseTimeOut = 3000;
baseTimeOut = 3000;
wait_cnt = 20;
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
			realInser2Mysql();
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

function getSunday(d) {
  d = new Date(d);
  var day = d.getDay(),
      diff = d.getDate() - day; // adjust when day is sunday
  return new Date(d.setDate(diff));
}
function pad2(number) {
    return (number < 10 ? '0' : '') + number
}
function getALLData(result, os, appName) {
	var all = {eventDay: '', duration: '', appName: appName,
                  os: os, country: 'ALL', aU: 0, tU: 0,
                  nU: 0, sU: 0};
    if (saveYearly) {
    	for (var tmp in yearArray) {
			var startDate = yearArray[tmp].year+"-01-01";
			var duration = "Y";

			if (result[yearArray[tmp].year]) {
				//print(result[yearArray[tmp].year]);
				all.eventDay = startDate;
				all.duration = duration;
				all.appName = appName;
				all.os = os;
				all.aU = checkNull(result[yearArray[tmp].year]['u']);
				all.tU = 0;
				all.nU = checkNull(result[yearArray[tmp].year]['n']);
				all.sU = checkNull(result[yearArray[tmp].year]['t']);
				insertMysql(all);
			}
		}
    }

    all = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

    for (var tmp in monthArray) {
		var startDate = monthArray[tmp].year+"-"+pad2(monthArray[tmp].month)+"-01";
		var duration = "M";
		if (result[monthArray[tmp].year] &&
			result[monthArray[tmp].year][monthArray[tmp].month]) {
			//print(result[monthArray[tmp].year][monthArray[tmp].month]);
			all.eventDay = startDate;
			all.duration = duration;
			all.appName = appName;
			all.os = os;
			all.aU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month]['u']);
			all.tU = 0;
			all.nU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month]['n']);
			all.sU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month]['t']);
			insertMysql(all);
		}
	}

	all = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

	for (var tmp in dayArray) {
		var startDate = dayArray[tmp].year+"-"+pad2(dayArray[tmp].month)+"-"+pad2(dayArray[tmp].day);
		var duration = "D";
		if (result[dayArray[tmp].year] &&
			result[dayArray[tmp].year][dayArray[tmp].month] &&
			result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]) {
			//print(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]);
			all.eventDay = startDate;
			all.duration = duration;
			all.appName = appName;
			all.os = os;
			all.aU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]['u']);
			all.tU = 0;
			all.nU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]['n']);
			all.sU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]['t']);
			insertMysql(all);
		}
	}

	all = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

	for (var tmp in weekArray) {
		var tmpObjDate = new Date(weekArray[tmp].year, weekArray[tmp].month-1, weekArray[tmp].day);
		var sunday = getSunday(tmpObjDate);
		var sunMoment = moment(sunday).add(2, "days");
		var nextMoment = sunMoment.add(6, "days");
		var startDate = sunMoment.format("YYYY-MM-DD");
		startDate = moment(sunday).add(1, "days").format("YYYY-MM-DD");
		var duration = "W";
		if (result[weekArray[tmp].year] &&
			result[weekArray[tmp].year]["w"+weekArray[tmp].week] &&
			result[weekArray[tmp].year]["w"+weekArray[tmp].week]) {
			//print(result[weekArray[tmp].year]);
			all.eventDay = startDate;
			all.duration = duration;
			all.appName = appName;
			all.os = os;
			all.aU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week]['u']);
			all.tU = 0;
			all.nU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week]['n']);
			all.sU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week]['t']);
			insertMysql(all);
		}
	}
}
function getData(result, os, appName) {
	var meta = result['meta']['countries'];
	var data = {eventDay: '', duration: '', appName: appName,
                  os: os, country: '', aU: 0, tU: 0,
                  nU: 0, sU: 0};

	var others = {eventDay: '', duration: '', appName: appName,
                  os: os, country: 'ALL', aU: 0, tU: 0,
                  nU: 0, sU: 0};

if (saveYearly) {
	for (var tmp in yearArray) {
		var startDate = yearArray[tmp].year+"-01-01";
		var duration = "Y";

		others = {eventDay: '', duration: '', appName: appName,
                  os: os, country: 'ALL', aU: 0, tU: 0,
                  nU: 0, sU: 0};

/*
		print(yearArray[tmp].year);
		print(startDate);
*/
		//print(result[yearArray[tmp].year]);
		if (result[yearArray[tmp].year]) {
			for (var country in meta) {
				//print(meta[country]);
				if (result[yearArray[tmp].year] &&
					result[yearArray[tmp].year][meta[country]]) {
					//print(meta[country]+":");
					//print(result[yearArray[tmp].year][meta[country]]);
					if (countryList.indexOf(meta[country])>=0) {
/*
						print(startDate+", "+duration+", "+appName+", "+os+", "+
							meta[country]+", "+
							checkNull(result[yearArray[tmp].year][meta[country]]['u'])+", ?, "+
							checkNull(result[yearArray[tmp].year][meta[country]]['n'])+", "+
							checkNull(result[yearArray[tmp].year][meta[country]]['t']));
*/
						data.eventDay = startDate;
						data.duration = duration;
						data.appName = appName;
						data.os = os;
						data.country = meta[country];
						data.aU = checkNull(result[yearArray[tmp].year][meta[country]]['u']);
						data.tU = 0;
						data.nU = checkNull(result[yearArray[tmp].year][meta[country]]['n']);
						data.sU = checkNull(result[yearArray[tmp].year][meta[country]]['t']);
						insertMysql(data);
					}

					others.eventDay = startDate;
					others.duration = duration;
					others.appName = appName;
					others.os = os;
					others.aU += checkNull(result[yearArray[tmp].year][meta[country]]['u']);
					others.tU += 0;
					others.nU += checkNull(result[yearArray[tmp].year][meta[country]]['n']);
					others.sU += checkNull(result[yearArray[tmp].year][meta[country]]['t']);

				}
			}
/*
			print(others.eventDay+", "+others.duration+", "+others.appName+", "+others.os+", "+
					others.country+", "+
					others.aU+", "+
					others.tU+", "+
					others.nU+", "+
					others.sU);
*/
		}
		others.eventDay = startDate;
		others.duration = duration;
		others.appName = appName;
		others.os = os;
		insertMysql(others);

		for (var country in countryList) {
			if (result[yearArray[tmp].year] &&
				result[yearArray[tmp].year][countryList[country]]) {
			} else {
				data.eventDay = startDate;
				data.duration = duration;
				data.appName = appName;
				data.os = os;
				data.country = countryList[country];
				data.aU = 0;
				data.tU = 0;
				data.nU = 0;
				data.sU = 0;
				insertMysql(data);
			}
		}
	}
}

	others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

	for (var tmp in monthArray) {
		var startDate = monthArray[tmp].year+"-"+pad2(monthArray[tmp].month)+"-01";
		var duration = "M";

		others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

/*
		print(monthArray[tmp].year+" "+monthArray[tmp].month);
		print(startDate);
*/
		if (result[monthArray[tmp].year] &&
				result[monthArray[tmp].year][monthArray[tmp].month]) {
			for (var country in meta) {
				//print(meta[country]);
				if (result[monthArray[tmp].year] &&
					result[monthArray[tmp].year][monthArray[tmp].month] &&
					result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]) {
					//print(meta[country]+":");
					//print(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]);
					if (countryList.indexOf(meta[country])>=0) {
/*
						print(startDate+", "+duration+", "+appName+", "+os+", "+
							meta[country]+", "+
							checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['u'])+", ?, "+
							checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['n'])+", "+
							checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['t']));
*/
						data.eventDay = startDate;
						data.duration = duration;
						data.appName = appName;
						data.os = os;
						data.country = meta[country];
						data.aU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['u']);
						data.tU = 0;
						data.nU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['n']);
						data.sU = checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['t']);
						insertMysql(data);
					}

					others.eventDay = startDate;
					others.duration = duration;
					others.appName = appName;
					others.os = os;
					others.aU += checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['u']);
					others.tU += 0;
					others.nU += checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['n']);
					others.sU += checkNull(result[monthArray[tmp].year][monthArray[tmp].month][meta[country]]['t']);

				}
			}
/*
			print(others.eventDay+", "+others.duration+", "+others.appName+", "+others.os+", "+
					others.country+", "+
					others.aU+", "+
					others.tU+", "+
					others.nU+", "+
					others.sU);
*/
		}
		others.eventDay = startDate;
		others.duration = duration;
		others.appName = appName;
		others.os = os;
		insertMysql(others);

		for (var country in countryList) {
			if (result[monthArray[tmp].year] &&
				result[monthArray[tmp].year][monthArray[tmp].month] &&
				result[monthArray[tmp].year][monthArray[tmp].month][countryList[country]]) {
			} else {
				data.eventDay = startDate;
				data.duration = duration;
				data.appName = appName;
				data.os = os;
				data.country = countryList[country];
				data.aU = 0;
				data.tU = 0;
				data.nU = 0;
				data.sU = 0;
				insertMysql(data);
			}
		}
	}

	others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

	for (var tmp in dayArray) {
		var startDate = dayArray[tmp].year+"-"+pad2(dayArray[tmp].month)+"-"+pad2(dayArray[tmp].day);
		var duration = "D";

		others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

/*
		print(dayArray[tmp].year+" "+dayArray[tmp].month+" "+dayArray[tmp].day);
		print(startDate);
*/
		if (result[dayArray[tmp].year] &&
				result[dayArray[tmp].year][dayArray[tmp].month] &&
				result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day]) {
			for (var country in meta) {
				//print(meta[country]);
				if (result[dayArray[tmp].year] &&
					result[dayArray[tmp].year][dayArray[tmp].month] &&
					result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day] &&
					result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]) {
					//print(meta[country]+":");
					//print(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]);
					
					if (countryList.indexOf(meta[country])>=0) {
/*
						print(startDate+", "+duration+", "+appName+", "+os+", "+
							meta[country]+", "+
							checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['u'])+", ?, "+
							checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['n'])+", "+
							checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['t']));
*/
						data.eventDay = startDate;
						data.duration = duration;
						data.appName = appName;
						data.os = os;
						data.country = meta[country];
						data.aU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['u']);
						data.tU = 0;
						data.nU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['n']);
						data.sU = checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['t']);
						insertMysql(data);
					}

					others.eventDay = startDate;
					others.duration = duration;
					others.appName = appName;
					others.os = os;
					others.aU += checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['u']);
					others.tU += 0;
					others.nU += checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['n']);
					others.sU += checkNull(result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][meta[country]]['t']);

				}
			}
/*			
			print(others.eventDay+", "+others.duration+", "+others.appName+", "+others.os+", "+
					others.country+", "+
					others.aU+", "+
					others.tU+", "+
					others.nU+", "+
					others.sU);
*/
		}
		others.eventDay = startDate;
		others.duration = duration;
		others.appName = appName;
		others.os = os;
		insertMysql(others);

		for (var country in countryList) {
			if (result[dayArray[tmp].year] &&
				result[dayArray[tmp].year][dayArray[tmp].month] &&
				result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day] &&
				result[dayArray[tmp].year][dayArray[tmp].month][dayArray[tmp].day][countryList[country]]) {
			} else {
				data.eventDay = startDate;
				data.duration = duration;
				data.appName = appName;
				data.os = os;
				data.country = countryList[country];
				data.aU = 0;
				data.tU = 0;
				data.nU = 0;
				data.sU = 0;
				insertMysql(data);
			}
		}
	}

	others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

	for (var tmp in weekArray) {
		var tmpObjDate = new Date(weekArray[tmp].year, weekArray[tmp].month-1, weekArray[tmp].day);
		var sunday = getSunday(tmpObjDate);
		var sunMoment = moment(sunday).add(2, "days");
		var nextMoment = sunMoment.add(6, "days");
		var startDate = sunMoment.format("YYYY-MM-DD");
		startDate = moment(sunday).add(1, "days").format("YYYY-MM-DD");
		var duration = "W";

		others = {eventDay: '', duration: '', appName: appName,
              os: os, country: 'ALL', aU: 0, tU: 0,
              nU: 0, sU: 0};

/*
		print(weekArray[tmp].year+" w"+weekArray[tmp].week);
		print(startDate);
*/
		print(startDate+" "+sunday);
		if (result[weekArray[tmp].year] &&
				result[weekArray[tmp].year]["w"+weekArray[tmp].week] &&
				result[weekArray[tmp].year]["w"+weekArray[tmp].week]) {
			for (var country in meta) {
				//print(meta[country]);
				if (result[weekArray[tmp].year] &&
					result[weekArray[tmp].year]["w"+weekArray[tmp].week] &&
					result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]) {
					//print(meta[country]+":");
					//print(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]);
					if (countryList.indexOf(meta[country])>=0) {
/*
						print(startDate+", "+duration+", "+appName+", "+os+", "+
							meta[country]+", "+
							checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['u'])+", ?, "+
							checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['n'])+", "+
							checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['t']));
*/
						data.eventDay = startDate;
						data.duration = duration;
						data.appName = appName;
						data.os = os;
						data.country = meta[country];
						data.aU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['u']);
						data.tU = 0;
						data.nU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['n']);
						data.sU = checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['t']);
						insertMysql(data);
					}

					others.eventDay = startDate;
					others.duration = duration;
					others.appName = appName;
					others.os = os;
					others.aU += checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['u']);
					others.tU += 0;
					others.nU += checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['n']);
					others.sU += checkNull(result[weekArray[tmp].year]["w"+weekArray[tmp].week][meta[country]]['t']);

				}
			}
/*
			print(others.eventDay+", "+others.duration+", "+others.appName+", "+others.os+", "+
					others.country+", "+
					others.aU+", "+
					others.tU+", "+
					others.nU+", "+
					others.sU);
*/
		}
		others.eventDay = startDate;
		others.duration = duration;
		others.appName = appName;
		others.os = os;
		insertMysql(others);

		for (var country in countryList) {
			if (result[weekArray[tmp].year] &&
				result[weekArray[tmp].year]["w"+weekArray[tmp].week] &&
				result[weekArray[tmp].year]["w"+weekArray[tmp].week][countryList[country]]) {
			} else {
				data.eventDay = startDate;
				data.duration = duration;
				data.appName = appName;
				data.os = os;
				data.country = countryList[country];
				data.aU = 0;
				data.tU = 0;
				data.nU = 0;
				data.sU = 0;
				insertMysql(data);
			}
		}
	}
}
function checkNull(count) {
	return (count?count:0);
}
function insertMysql(data) {
	var cloneData = JSON.parse(JSON.stringify(data));
	insertArray.push(cloneData);
}
function realInser2Mysql() {
	//print(JSON.stringify(insertArray));
/*
	var sql = "INSERT INTO BcTest.countlyIn (eventDay, duration, appName, os, "+
		"country, activeU, totalU, newU, session) VALUES ?";
*/
	var values = [];
	for (var row in insertArray) {
		//print(insertArray[row]);
/*
		values.push([insertArray[row].eventDay, insertArray[row].duration, 
			insertArray[row].appName, insertArray[row].os, insertArray[row].country,
			insertArray[row].aU, insertArray[row].tU, insertArray[row].nU,
			insertArray[row].sU]);
*/
		// upsetCountlyIn(eventDay, duration, appName, os, country, newU, activeU, session)
		upsetCountlyIn(insertArray[row].eventDay, insertArray[row].duration,
			insertArray[row].appName, insertArray[row].os, insertArray[row].country,
			insertArray[row].aU, insertArray[row].nU, insertArray[row].sU);
	}
	print(insertArray.length);
	insertArray.length = 0;
/*
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
*/
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
function upsetCountlyIn(eventDay, duration, appName, os, country, activeU, newU, session) {
	print(eventDay+" "+duration+" "+appName+" "+os+" "+
		country+" "+newU+" "+activeU+" "+session);
	var sql = "call Test.countlyIn_upset_UU('"+eventDay+
		"', '"+duration+"', '"+appName+"', '"+os+"', '"+country+"', "+
		activeU+", "+newU+", "+session+");";
	//print(sql);
	callSP(sql);
}
