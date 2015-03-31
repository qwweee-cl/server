var mongo = require('mongoskin'),
	moment = require('moment'),
    momentz = require('moment-timezone'),
    geoip = require('geoip-lite'),
    mysql = require('mysql'),
    ObjectID = require('mongodb').ObjectID,
    common = require('./utils/common.js'),
	print = console.log;

var mysqlHostName = "192.168.2.60";
var mysqlUser = 'ymk';
var mysqlPassword = 'cyberlink#1'

//mysqlHostName="localhost";
//mysqlUser="root";
//mysqlHostName="claddb";
mysqlHostName="54.248.118.203";
mysqlUser = 'ymk';
mysqlPassword = 'cyberlinkymk';
var DBName = 'YMKData';
var dbOptions = { safe:false, maxPoolSize: 1000 };
var dbName = ('cat:27017/countly_raw0?auto_reconnect=true');
//var db = mongo.db(dbName, dbOptions);
//var db = common.db_batch;
var db = common.getLocalBatchDB();
//db = common.db_raw;
var collectionList = ["raw_event_75edfca17dfbe875e63a66633ed6b00e30adcb92",
                      "raw_event_9219f32e8de29b826faf44eb9b619788e29041bb"];
var currMoment = moment();
var appTimezone = "America/Denver";
var allData = {};
var iapData = {};
var collectionCount = 0;
var dbCount = 0;
var iap = 'evt_iap';
var year = currMoment.year();
var month = (currMoment.month()+1);
iapData['currency'] = [];
// Create a new workbook file in current working-path

/*
var date = new Date();
console.log(date.toString());
var begin_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()-180);
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);
var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
//var bid = new ObjectID('542a50d9981a3d812e000006');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');

var b_coll = db.collection('raw_event_d10ca4b26d3022735f3c403fd3c91271eb3054b0');
b_coll.find({_id:{$lt:eid, $gte:bid}},{batchSize:1000}).each(
function(err, res) {
	if (err) {
    	print(err);
    	return;
    }
    if (!res) {
    	print("data end");
    	db.close();
    	return;
    }
    if (!res.device_id || res.device_id.length != 44) {
    	print("error device id");
    	return;
    }
    if (!res.timestamp || res.timestamp <= 0) {
    	print("error timestamp");
    	return;
    }
    if (!res.events || res.events.length == 0) {
    	print("error events");
    	return;
    }
    findAndRemoveKey(res.events, '_UMA_ID');
    //print(res);
});
*/
for (var key in collectionList) {
	print(collectionList[key]);
	save2Mysql(collectionList[key]);
}
var cnt=0;
var repeat_times = 0;
var wait_cnt = 10;
var baseTimeOut = 3000;
baseTimeOut = 1000;
wait_cnt = 10;
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

function findAndRemoveKey(array, value) {
    console.log('findAndRemoveKey');
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

function processEvents(basic, events, connection) {
	if (!events.segmentation || events.segmentation.length == 0) {
		return;
	}
	var data = JSON.parse(JSON.stringify(basic));
	//print(data);
	if (events.timestamp) {
		data.timestamp = events.timestamp;
		var currMoment = momentz(data.timestamp*1000).tz(appTimezone);
		var dateFormat = currMoment.format("YYYY-MM-DD");
		data.logDate = dateFormat;
	}
	if (events.count) {
		data.count = events.count;
	} else {
		data.count = 1;
	}
	if (events.sum) {
		data.sum = events.sum;
	} else {
		data.sum = 0;
	}
	var featureKey = '';
	var featureTable = ['foundation', 'eyeshadow', 'blush', 'eyeliner',
	                    'eyelashes', 'eyebrows', 'eyecolor', 'lipstick',
	                    'wig', 'looks'];

	var featureMap = {'foundation': ['_palette_guid', '_color_code', '_intensity', '_sku_guid', '_item_guid'],
	                  'eyeshadow': ['_palette_guid', '_color_code', '_pattern_guid', '_texture', '_sku_guid', '_item_guid'],
	                  'blush': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'eyeliner': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'eyelashes': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'eyebrows': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'eyecolor': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'lipstick': ['_palette_guid', '_color_code', '_intensity', '_texture', '_sku_guid', '_item_guid'],
	                  'wig': ['_palette_guid', '_color_code', '_pattern_guid', '_intensity', '_sku_guid', '_item_guid'],
	                  'looks': ['_pattern_guid', '_sku_guid', '_item_guid']};
	for (var key in events.segmentation) {
		featureKey = key.substring(0,key.indexOf('_'));
		if (!featureMap[featureKey]) {
			print("error key:"+featureKey);
			print(JSON.stringify(events.segmentation));
			return;
		}
		for (var i=0;i<featureMap[featureKey].length;i++) {
			var featureVal = featureMap[featureKey][i];
			if (featureVal.indexOf('color') != -1) {
				var str = featureKey+featureMap[featureKey][i];
				if (events.segmentation[str]) {
					if (!data.colorId) {
						data.colorId = events.segmentation[str].replace(/\s/g, '');
					}
				}
		    } else if (featureVal.indexOf('palette') != -1) {
				var str = featureKey+featureMap[featureKey][i];
				if (events.segmentation[str]) {
					data.colorId = events.segmentation[str].replace(/\s/g, '');
				}
		    } else if (featureVal.indexOf('pattern') != -1) {
		    	var str = featureKey+featureMap[featureKey][i];
		    	if (events.segmentation[str]) {
		    		data.patternId = events.segmentation[str].replace(/\s/g, '');
				}
		    } else if (featureVal.indexOf('intensity') != -1) {
		    	var str = featureKey+featureMap[featureKey][i];
		    	if (events.segmentation[str]) {
		    		data.intensity = events.segmentation[str];
				}
		    } else if (featureVal.indexOf('texture') != -1) {
		    	var str = featureKey+featureMap[featureKey][i];
		    	if (events.segmentation[str]) {
		    		data.texture = events.segmentation[str].replace(/\s/g, '');
				}
		    } else if (featureVal.indexOf('sku') != -1) {
		    	var str = featureKey+featureMap[featureKey][i];
		    	if (events.segmentation[str]) {
		    		data.skuId = events.segmentation[str];
				} else {
					data.skuId = 'Cyberlink';
				}
		    } else if (featureVal.indexOf('item') != -1) {
		    	var str = featureKey+featureMap[featureKey][i];
		    	if (events.segmentation[str]) {
		    		data.itemId = events.segmentation[str];
				} else {
					data.itemId = null;
				}
		    }
			if (events.segmentation[str]) {
				//print(events.segmentation[str]);
			} else {
				//print("==========");
			}
		}
	}
	//print(featureKey);
	//print(data);
	//print(data);

	var queryStr = 'INSERT INTO '+DBName+'.'+featureKey+'Log SET ?';
	var query = connection.query(queryStr, data, function(err, res) {
		// Neat!
		if (err) {
			print(err);
			return;
		}
		if (res) {
			dbCount++;
			//print(res);
		}
	});
}

function save2Mysql(collectionName) {
	var date = new Date();
	print(date.toString());
	var begin_date = new Date(date.getFullYear(),date.getMonth()-3, date.getDate());
	var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);
	var bdd = Math.floor(begin_date.getTime()/1000);
	var edd = Math.floor(end_date.getTime()/1000);
	var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
	//var bid = new ObjectID('542a50d9981a3d812e000006');
	var eid = new ObjectID(edd.toString(16)+'0000000000000000');
	print(begin_date);
	print(end_date);
	var beginTimestamp = begin_date.getTime()/1000;
	var endTimestmp = end_date.getTime()/1000;
	print(beginTimestamp);
	print(endTimestmp);
	var connection = mysql.createConnection({
		host: mysqlHostName,
		user: mysqlUser,
		password: mysqlPassword,
	});

	connection.connect(function(err) {
		if (err) {
			print(err);
			return false;
		}
	});
	try {
		var b_coll = db.collection(collectionName);
		b_coll.find({_id:{$lt:eid, $gte:bid}},{batchSize:1000}).each(
		function(err, res) {
	        if (err) {
	        	print(err);
	        	dbCount++;
	        	return;
	        }
	        if (!res) {
	        	print("data end");
	        	//db.close();
	        	return;
	        }
	        //print(res);
	        if (!res.country) {
	        	computeGeoInfo(res);
	        }
	        //print(res.country);
	        //print(res.city);
	        if (!res.device_id || res.device_id.length != 44) {
	        	print("error device id");
	        	return;
	        }
	        if (!res.timestamp || res.timestamp <= 0) {
	        	print("error timestamp");
	        	return;
	        }
	        if (!res.events || res.events.length == 0) {
	        	print("error events");
	        	return;
	        }
	        var basic = {};
	        basic.devId = res.device_id;
	        basic.timestamp = res.timestamp;
	        if (!res.metrics || res.metrics.length == 0) {
	        	basic.appVersion = 'Old';
	        	basic.os = 'O';
	        } else {
	        	if (!res.metrics._app_version) {
	        		basic.appVersion = 'Old';
	        	} else {
	        		basic.appVersion = res.metrics._app_version;
	        	}
	        	if (!res.metrics._os) {
	        		basic.os = 'O';
	        	} else {
	        		if (res.metrics._os.toUpperCase() == 'ANDROID') {
	        			basic.os = 'A';
	        		} else if (res.metrics._os.toUpperCase() == 'IOS') {
	        			basic.os = 'I';
	        		} else {
	        			basic.os= 'O';
	        		}
	        	}
	        }
	        if (res.ip_address) {
	        	basic.ip = res.ip_address;
	        }
	        basic.country = res.country;
	        for (var i=0;i<res.events.length;i++) {
	        	if (res.events[i].key == 'YMK_Apply') {
	        		processEvents(basic, res.events[i], connection);
	        	} 
	        	/*else if (res.events[i].key == '_UMA_ID') {
		        	var data = {};
		        	data.dev_id = res.device_id;
		        	if (!res.events[i].timestamp || res.events[i].timestamp <= 0) {
		        		data.timestamp = res.timestamp;
			        } else {
			        	data.timestamp = res.events[i].timestamp;
			        }
		        	data.ip = res.ip_address;
		        	data.country = res.country;
		        	if (res.events[i].segmentation && res.events[i].segmentation.android_id) {
		        		data.android_id = res.events[i].segmentation.android_id;
		        	} else {
		        		data.android_id = "";
		        	}
		        	if (res.events[i].segmentation.google_play_advertising_id) {
		        		data.google_id = res.events[i].segmentation.google_play_advertising_id;
		        	} else {
		        		data.google_id = "";
		        	}
		        	if (res.events[i].sum) {
		        		data.sum = res.events[i].sum;
		        	} else {
		        		data.sum = 0;
		        	}
		        	if (res.events[i].count) {
		        		data.count = res.events[i].count;
		        	} else {
		        		data.count = 0;
		        	}
		        	print(data);
		        	var query = connection.query('INSERT INTO '+DBName+'.eventLog SET ?', data, function(err, res) {
						// Neat!
						if (err) {
							print(err);
							return;
						}
						if (res) {
							dbCount++;
							print(res);
						}
					});
					//print(query.sql)
		        }*/
	        }
	        dbCount++;
		});
	} catch (e) {
	    print('[processRaw]'+e);
	}
	/*try {
		var b_coll = db.collection("raw_event_9219f32e8de29b826faf44eb9b619788e29041bb");
		b_coll.find({_id:{$lt:eid, $gte:bid}},{batchSize:1000}).each(
		function(err, res) {
	        if (err) {
	        	print(err);
	        	dbCount++;
	        	return;
	        }
	        if (!res) {
	        	print("data end");
	        	//db.close();
	        	return;
	        }
	        //print(res);
	        if (!res.country) {
	        	computeGeoInfo(res);
	        }
	        //print(res.country);
	        //print(res.city);
	        if (!res.device_id || res.device_id.length != 44) {
	        	print("error device id");
	        	return;
	        }
	        if (!res.timestamp || res.timestamp <= 0) {
	        	print("error timestamp");
	        	return;
	        }
	        if (!res.events || res.events.length == 0) {
	        	print("error events");
	        	return;
	        }
	        var basic = {};
	        basic.devId = res.device_id;
	        basic.timestamp = res.timestamp;
	        if (!res.metrics || res.metrics.length == 0) {
	        	basic.appVersion = 'Old';
	        	basic.os = 'O';
	        } else {
	        	if (!res.metrics._app_version) {
	        		basic.appVersion = 'Old';
	        	} else {
	        		basic.appVersion = res.metrics._app_version;
	        	}
	        	if (!res.metrics._os) {
	        		basic.os = 'O';
	        	} else {
	        		if (res.metrics._os.toUpperCase() == 'ANDROID') {
	        			basic.os = 'A';
	        		} else if (res.metrics._os.toUpperCase() == 'IOS') {
	        			basic.os = 'I';
	        		} else {
	        			basic.os= 'O';
	        		}
	        	}
	        }
	        if (res.ip_address) {
	        	basic.ip = res.ip_address;
	        }
	        basic.country = res.country;
	        for (var i=0;i<res.events.length;i++) {
	        	if (res.events[i].key == 'YMK_Apply') {
	        		processEvents(basic, res.events[i], connection);
	        	} else if (res.events[i].key == '_UMA_ID') {
	        		continue;
		        	var data = {};
		        	data.dev_id = res.device_id;
		        	if (!res.events[i].timestamp || res.events[i].timestamp <= 0) {
		        		data.timestamp = res.timestamp;
			        } else {
			        	data.timestamp = res.events[i].timestamp;
			        }
		        	data.ip = res.ip_address;
		        	data.country = res.country;
		        	if (res.events[i].segmentation && res.events[i].segmentation.android_id) {
		        		data.android_id = res.events[i].segmentation.android_id;
		        	} else {
		        		data.android_id = "";
		        	}
		        	if (res.events[i].segmentation.google_play_advertising_id) {
		        		data.google_id = res.events[i].segmentation.google_play_advertising_id;
		        	} else {
		        		data.google_id = "";
		        	}
		        	if (res.events[i].sum) {
		        		data.sum = res.events[i].sum;
		        	} else {
		        		data.sum = 0;
		        	}
		        	if (res.events[i].count) {
		        		data.count = res.events[i].count;
		        	} else {
		        		data.count = 0;
		        	}
		        	print(data);
		        	var query = connection.query('INSERT INTO '+DBName+'.eventLog SET ?', data, function(err, res) {
						// Neat!
						if (err) {
							print(err);
							return;
						}
						if (res) {
							dbCount++;
							print(res);
						}
					});
					//print(query.sql)
		        }
	        }
	        dbCount++;
		});
	} catch (e) {
	    print('[processRaw]'+e);
	}*/
}

if (currMoment.date() == 29) {
	process.setMaxListeners(0);
	db.collection('apps').find().each(function (err, res) {
		if (err || !res) {
			dbCount++;
			return;
		}
		//print(res);
		var app_id = res._id;
		var app_name = res.name;
		//print(app_id);
		//print(app_name);
		if (app_id == '53e48d94910640743c000001' || 
			app_id == '53e9c6cf9338e1dc09000001' || 
			app_id == '53f554ef847577512100130a' || 
			app_id == '542e4cce8f4fe9b04604eede') {
			dbCount++;
			return;
		}
		allData[app_id] = {};
		iapData[app_id] = {};
		allData[app_id]['name'] = app_name;
		iapData[app_id]['name'] = app_name;
        getData(app_id, allData);
        getEvent(app_id, iapData);
	    dbCount++;
		//print(currMoment.format());
	});
	var cnt=0;
    var repeat_times = 0;
    var wait_cnt = 10;
    var baseTimeOut = 200;
    setInterval(function() {
        if (dbCount > 0) {
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
			    exportUserExcel();
			    exportIAPExcel();
			    saveExcel();
			}
        	if (repeat_times > wait_cnt) {
        		print("exit process");
        	    process.exit(0);
        	}
        }
    }, baseTimeOut);
}
return;

function exportUserExcel() {
	// Create a new workbook file in current working-path
	//var workbook = excelbuilder.createWorkbook('./', 'sample.xlsx');

	// Create a new worksheet with 10 columns and 12 rows
	var sheet1 = workbook.createSheet('User', 10, 50);
	var title = ['APP Name', 'New User', 'Active User', 'Total User(until now)', 'Sessions Count'];
	var width = [30,15,15,20,15];
	// set title
	for (var i=0;i<title.length;i++) {
		//print(i+" "+title[i]);
		sheet1.set((i+1), 1, title[i]);
		sheet1.width((i+1), width[i]);
	}
	var i=0;
	for (var str in allData) {
    	//print(allData[str]);
    	var col = 2+i;
    	/*print(col);
    	print(allData[str]['name']?allData[str]['name']:0);
    	print(allData[str]['newUser']?allData[str]['newUser']:0);
    	print(allData[str]['activeUser']?allData[str]['activeUser']:0);
    	print(allData[str]['totalUser']?allData[str]['totalUser']:0);
    	print(allData[str]['totalSession']?allData[str]['totalSession']:0);*/
    	sheet1.set(1, (col), allData[str]['name']);
    	sheet1.set(2, (col), allData[str]['newUser']?allData[str]['newUser']:0);
    	sheet1.set(3, (col), allData[str]['activeUser']?allData[str]['activeUser']:0);
    	sheet1.set(4, (col), allData[str]['totalUser']?allData[str]['totalUser']:0);
    	sheet1.set(5, (col), allData[str]['totalSession']?allData[str]['totalSession']:0);
    	i++;
    }
}

function exportIAPExcel() {
	// Create a new workbook file in current working-path
	//var workbook = excelbuilder.createWorkbook('./', 'sample.xlsx');

	// Create a new worksheet with 10 columns and 12 rows
	var sheet1 = workbook.createSheet('IAP', 50, 50);
	var sheet2 = workbook.createSheet('IAPCount', 50, 50);
	var sheet3 = workbook.createSheet('IAPSum', 50, 50);
	var title = ['APP Name', 'Count', 'Sum'];
	var width = [30,15,15];

	// set title
	for (var i=0;i<title.length;i++) {
		//print(i+" "+title[i]);
		sheet1.set((i+1), 1, title[i]);
		sheet1.width((i+1), width[i]);
	}
	sheet2.set(1, 1, "Currency");
    sheet2.width(1, 20);
    sheet3.set(1, 1, "Currency");
    sheet3.width(1, 20);

	var currency = 1;
	for (var index in iapData['currency']) {
    	sheet2.set(1, (1+currency), iapData['currency'][index]+"(C)");
    	sheet3.set(1, (1+currency), iapData['currency'][index]+"(S)");
    	currency++;
    }
	var col = 0;

	for (var str in iapData) {
		if (str == 'currency') {
			continue;
		}
		sheet1.set(1, (2+col), iapData[str]['name']);
		sheet2.set((2+col), 1, iapData[str]['name']);
		sheet3.set((2+col), 1, iapData[str]['name']);
		if (iapData[str]['name'].length >= 25) {
			sheet2.width((2+col), iapData[str]['name'].length);
			sheet3.width((2+col), iapData[str]['name'].length);
		} else {
			sheet2.width((2+col), iapData[str]['name'].length+2);
			sheet3.width((2+col), iapData[str]['name'].length+2);
		}
		if (!iapData[str]['data']) {
			//print(str+" | "+0+" | "+0);
	    	sheet1.set(2, (2+col), 0);
	    	sheet1.set(3, (2+col), 0);
		} else {
    		//print(str+" | "+iapData[str]['data']['c']+" | "+iapData[str]['data']['s']);
    		sheet1.set(1, (2+col), iapData[str]['name']);
	    	sheet1.set(2, (2+col), iapData[str]['data']['c']);
	    	sheet1.set(3, (2+col), iapData[str]['data']['s']);
    	}
    	//print(iapData['currency']);
    	if (iapData[str]['detail']) {
	    	for (var key in iapData[str]['detail']) {
	    		var printStr = str;
	    		currency = 1;
	    		for (var index in iapData['currency']) {
	    			if (!iapData[str]['detail'][key][iapData['currency'][index]]) {
	    				printStr += " |c: "+0+" |s: "+0;
			    		sheet2.set((2+col), (1+currency), 0);
				    	sheet3.set((2+col), (1+currency), 0);
	    			} else {
	    				printStr += " |c: "+iapData[str]['detail'][key][iapData['currency'][index]]['c']
	    							+" |s: "+iapData[str]['detail'][key][iapData['currency'][index]]['s'];
	    				sheet2.set((2+col), (1+currency), iapData[str]['detail'][key][iapData['currency'][index]]['c']);
		    			sheet3.set((2+col), (1+currency), iapData[str]['detail'][key][iapData['currency'][index]]['s']);
	    			}
	    			/*if (!iapData[str]['detail'][key][iapData['currency']]) {
	    				printStr += " |c: "+0+" |s: "+0;
	    			} else {
	    				printStr += " |c: "+iapData[str]['detail'][key][iapData['currency']]['c']
	    							+" |s: "+iapData[str]['detail'][key][iapData['currency']]['s'];
	    			}*/
	    			currency++;
	    		}
	    		//print(printStr);
	    	}
	    } else {
	    	currency = 1;
    		for (var index in iapData['currency']) {
    			sheet2.set((2+col), (1+currency), 0);
			    sheet3.set((2+col), (1+currency), 0);
    			currency++;
    		}
	    }
    	col++;
    	/*
    	for (var index in iapData['currency']) {
    		printStr = " | "+iapData[str]['detail']
    	}*/
    }
	// set title
	/*
	for (var i=0;i<title.length;i++) {
		//print(i+" "+title[i]);
		sheet1.set((i+1), 1, title[i]);
		sheet1.width((i+1), width[i]);
	}
	var i=0;
	for (var str in allData) {
    	//print(allData[str]);
    	var col = 2+i;
    	sheet1.set(1, (col), allData[str]['name']);
    	sheet1.set(2, (col), allData[str]['newUser']?allData[str]['newUser']:0);
    	sheet1.set(3, (col), allData[str]['activeUser']?allData[str]['activeUser']:0);
    	sheet1.set(4, (col), allData[str]['totalUser']?allData[str]['totalUser']:0);
    	sheet1.set(5, (col), allData[str]['totalSession']?allData[str]['totalSession']:0);
    	i++;
    }*/
}

function saveExcel() {
	// Save it
	workbook.save(function(ok){
	if (!ok) 
		workbook.cancel();
	else
		console.log('congratulations, your workbook created');
	});
}

function getData(app_id, allData) {
	db.collection('sessions').findOne({"_id":app_id}, function (err, res) {
		if (err) {
			print(err);
			dbCount++;
			return;
		}
		if (res) {
			year = 2014;
			month = 12;
			if (res[year] && res[year][month]) {
				var newUser = res[year][month]['n'];
				var activeUser = res[year][month]['u'];
				var totalSession = res[year][month]['t'];
				//print(app_id);
				//print("new:"+newUser+",active:"+activeUser+",session:"+totalSession);
				allData[app_id]['newUser'] = newUser;
				allData[app_id]['activeUser'] = activeUser;
				allData[app_id]['totalSession'] = totalSession;
			}
			dbCount++;
		}
		db.collection('app_users'+app_id).count(function (err, res) {
			//print('app_users'+app_id);
			if (err) {
				print(err);
				dbCount++;
				return;
			}
			if (res) {
				var totalUser = res;
				//print(app_id);
				//print('total:'+totalUser);
				allData[app_id]['totalUser'] = totalUser;
				dbCount++;
				return;
			}
		});
	});
}

function getEvent(app_id, iapData) {
	iap = 'PHD_Feature';
	db.collection('events').findOne({"_id":app_id}, function (err, res) {
		if (err) {
			print(err);
			dbCount++;
			return;
		}
		if (res) {
			for (var key in res['segments']) {
				if (key == iap) {
					//print(key);
					//print(res['segments'][key]);
					iapData[app_id][iap] = res['segments'][key];
					setMeta(app_id, iapData);
				}
			}
			dbCount++;
			return;
		}
	});
}

function setMeta(appid, iapData) {
	var app_id = appid;
	db.collection(iap+app_id).findOne({'_id':'no-segment'}, function (err, res) {
		if (err) {
			print(err);
			dbCount++;
			return;
		}
		if (res) {
			//print(res['meta']);
			var tmp = {};
			for (var i=0;i<iapData[app_id][iap].length;i++) {
				//print(app_id+" "+iapData[app_id][iap][i]);
				tmp[iapData[app_id][iap][i]] = res['meta'][iapData[app_id][iap][i]];
				//print(res['meta'][iapData[app_id][iap][i]]);
			}
			//print("tmp====>");
			//print(tmp);
			delete(iapData[app_id][iap][i]);
			iapData[app_id][iap] = tmp;
			//print(iapData[app_id][iap]);
			year = 2014;
			month = 12;
			if (res[year] && res[year][month]) {
				iapData[app_id]['data'] = {};
				if (res[year][month]['c']) {
					//print(res[year][month]['c']);
					iapData[app_id]['data']['c'] = res[year][month]['c'];
				} else {
					iapData[app_id]['data']['c'] = 0;
				}
				if (res[year][month]['s']) {
					//print(res[year][month]['s']);
					iapData[app_id]['data']['s'] = res[year][month]['s'];
				} else {
					iapData[app_id]['data']['s'] = 0;
				}
			}
			if (iapData[app_id][iap]) {
				for (var key in iapData[app_id][iap]) {
					//print(iapData[app_id][iap][key]);
					getEventData(app_id, iapData, key);
				}
			}
			dbCount++;
			return;
		}
	});
}

function getEventData(appid, iapData, key) {
	var app_id = appid;
	print("key==>"+key);
	db.collection(iap+app_id).findOne({'_id':key}, function (err, res) {
		if (err) {
			print(err);
			dbCount++;
			return;
		}
		if (res) {
			for (var i=0;i<iapData[app_id][iap][key].length;i++) {
				//print(iapData[app_id][iap][key][i]);
				year = 2014;
				month = 12;
				if (res[year] && res[year][month] && res[year][month][iapData[app_id][iap][key][i]]) {
					if (!iapData[app_id]['detail']) {
						iapData[app_id]['detail'] = {};
					}
					if (!iapData[app_id]['detail'][key]) {
						iapData[app_id]['detail'][key] = {};
					}
					if (!iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]) {
						iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]] = {};
					}
					if (iapData['currency'].indexOf(iapData[app_id][iap][key][i]) == -1) {
						iapData['currency'][iapData['currency'].length] = iapData[app_id][iap][key][i];
					}
					if (res[year][month][iapData[app_id][iap][key][i]]['c']) {
						//print("c==>"+iapData[app_id][iap][key][i]);
						//print(res[year][month][iapData[app_id][iap][key][i]]['c']);
						iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c'] = res[year][month][iapData[app_id][iap][key][i]]['c'];
					} else {
						iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c'] = 0;
					}
					if (res[year][month][iapData[app_id][iap][key][i]]['s']) {
						//print("s==>"+iapData[app_id][iap][key][i]);
						//print(res[year][month][iapData[app_id][iap][key][i]]['s']);
						iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['s'] = res[year][month][iapData[app_id][iap][key][i]]['s'];
					} else {
						iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['s'] = 0;
					}
					//print(iapData[app_id]['detail'][key]);
				}
			}
			dbCount++;
			return;
		}
	});
}

function computeGeoInfo(params) {
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
        } 

        // Coordinate values of the user location has no use for now
        if (locationData.ll) {
            params.lat = locationData.ll[0];
            params.lng = locationData.ll[1];
       }
    }
}
