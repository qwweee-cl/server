var excelbuilder = require('msexcel-builder'),
    mongo = require('mongoskin'),
    moment = require('moment'),
    momentz = require('moment-timezone'),
    common = require('./utils/common.js'),
    config = require('./config.js'),
    print = console.log;

var dbOptions = { safe:false, maxPoolSize: 1000 };
var dbName = config.mongodb.host+":"+config.mongodb.port+"/"+config.mongodb.db;
var db = mongo.db(dbName, dbOptions);
var allData = {};
var iapData = {};
var collectionCount = 0;
var dbCount = 0;
var iap = 'evt_iap';
var appUsers = 'app_users';
iapData['currency'] = [];

var now = new Date();
var appTimezone = "America/Denver";
var tmpMoment = momentz(now).tz(appTimezone);
var dateStr = tmpMoment.format("YYYYMM")+'01';
//var month = (tmpMoment.month());
//var year = tmpMoment.year();

// Create a new workbook file in current working-path
var workbook = excelbuilder.createWorkbook('./', 'OEM_report_'+tmpMoment.year()+pad2((tmpMoment.month()+1))+pad2((tmpMoment.day()))+'.xlsx');
if (0&&tmpMoment.format("D")!=1) {
    print("exit oemReport");
    return;
}
process.setMaxListeners(0);

db.collection('oems').findOne(function (err, res) {
    if (err) {
        print(err);
        dbCount++;
        return;
    }
    if (!res) {
        print("end data");
        dbCount++;
        return;
    }
    //getApps(res.name);
    getDuration(res);
    dbCount++;
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
            //print(allData);
            //print(iapData);
            //exportUserExcel();
            //exportIAPExcel();
            //saveExcel();
        }
        if (repeat_times > wait_cnt) {
            print("exit process");
            process.exit(0);
        }
    }
}, baseTimeOut);
return;

function getDuration(res) {
    if (!(res.end && res.end <= Math.floor(now.getTime() / 1000))) {
        res.end = Math.floor(now.getTime() / 1000);
    }
    var startMoment = momentz(res.start*1000).tz(appTimezone);
    var endMoment = momentz(res.end*1000).tz(appTimezone);
    var startStr = startMoment.year()+"-"+startMoment.month()+"-01";
    print(startStr);
    var tmpStartMoment = momentz().tz(appTimezone);
    tmpStartMoment.set('year', startMoment.year());
    tmpStartMoment.set('month', startMoment.month());

    tmpStartMoment.set('year', 2014);
    tmpStartMoment.set('month', 11);

    tmpStartMoment.set('date', 1);
    tmpStartMoment.set('hour', 0);
    tmpStartMoment.set('minute', 0);
    tmpStartMoment.set('second', 0);
    tmpStartMoment.set('millisecond', 0);
    var tmpEndMoment = momentz().tz(appTimezone);
    tmpEndMoment.set('year', endMoment.year());
    tmpEndMoment.set('month', endMoment.month());
    tmpEndMoment.set('date', 1);
    tmpEndMoment.set('hour', 0);
    tmpEndMoment.set('minute', 0);
    tmpEndMoment.set('second', 0);
    tmpEndMoment.set('millisecond', 0);
    var duration = moment.duration((tmpEndMoment.format('X') - tmpStartMoment.format('X')),'s');
    print(tmpStartMoment.toString());
    print(tmpEndMoment.toString());
    print(duration.months());
    print(tmpMoment.year()+pad2((tmpMoment.month()+1))+pad2((tmpMoment.day()))+" ");
    for (var i=1;i<=1;i++) {
        var tmp = tmpEndMoment.clone();
        tmp.add(-i,'months');
        var year = tmp.year();
        var month = tmp.month()+1;
        print(i+" "+year+"/"+month);
        getApps(res.name, year, month);
    }
}

function pad2(number) {
    return (number < 10 ? '0' : '') + number
}

function getApps(oemName, year, month) {
    var dbOemName = config.mongodb.host+':'+config.mongodb.port+'/countly_'+oemName;
    dbOemName = config.mongodb.host+':'+config.mongodb.port+'/'+dateStr;
    print(dbOemName);
    var dbOem = mongo.db(dbOemName, dbOptions);
    dbOem.collections(function(err,collection) {
        if (!collection.length) {
            print('no data');
            dbCount++;
            dbOem.close();
        }
        for (var i=0; i<collection.length; i++) {
            //print(collection[i].collectionName);
            var collectionName = collection[i].collectionName;
            if (collectionName.indexOf(appUsers)>=0) {
                var keys = collectionName.substr(appUsers.length).trim();
                //print(appUsers+": "+keys);
                allData[keys] = {};
                setAppsName(keys, allData, true, dbOem, year, month);
            }
            if (collectionName.indexOf(iap)>=0) {
                var keys = collectionName.substr(iap.length).trim();
                //print(iap+": "+keys);
                iapData[keys] = {};
                setAppsName(keys, iapData, false, dbOem, year, month);
            }
        }
        dbCount++;
        dbOem.close();
    });
}

function setAppsName(app_id_in, dataSet, isUser, dbOem, year, month) {
    //print(app_id_in);
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
        if (app_id == app_id_in) {
            dataSet[app_id]['name'] = app_name;
            if (isUser) {
                getData(app_id, dataSet, dbOem, year, month);
            } else {
                getEvent(app_id, dataSet, dbOem, year, month);
            }
            dbCount++;
            return;
        }
        if (app_id == '53e48d94910640743c000001' || 
            app_id == '53e9c6cf9338e1dc09000001' || 
            app_id == '53f554ef847577512100130a' || 
            app_id == '542e4cce8f4fe9b04604eede') {
            dbCount++;
            return;
        }
        
        /*
        allData[app_id] = {};
        iapData[app_id] = {};
        allData[app_id]['name'] = app_name;
        iapData[app_id]['name'] = app_name;
        getData(app_id, allData);
        getEvent(app_id, iapData);
        */
        dbCount++;
        //print(tmpMoment.format());
    });
    /*db.collection('apps').findOne({'_id':app_id_in}, function (err, res) {
        print("res "+res);
        if (err || !res) {
            dbCount++;
            return;
        }
        print(res); 
    });*/
    /*db.collection('apps').find({"key":'d10ca4b26d3022735f3c403fd3c91271eb3054b0'}).each(function (err, res) {
        print(res);
    });*/
    /*db.collection('apps').find().each(function (err, res) {
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
        //print(tmpMoment.format());
    });*/
}

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
        if (str == 'currency') {
            print(str);
            continue;
        }
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
    print(workbook);
    return;
    // Save it
    workbook.save(function(ok){
    if (!ok) 
        workbook.cancel();
    else
        console.log('congratulations, your workbook created');
    });
}

function getData(app_id, allData, dbOem, year, month) {
    dbOem.collection('sessions').findOne({"_id":app_id}, function (err, res) {
        if (err) {
            print(err);
            dbCount++;
            return;
        }
        if (res) {
            //year = 2014;
            //month = 12;
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
        dbOem.collection('app_users'+app_id).count(function (err, res) {
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

function getEvent(app_id, iapData, dbOem, year, month) {
    //iap = 'PHD_Feature';
    dbOem.collection('events').findOne({"_id":app_id}, function (err, res) {
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
                    setMeta(app_id, iapData, dbOem, year, month);
                }
            }
            dbCount++;
            return;
        }
    });
}

function setMeta(appid, iapData, dbOem, year, month) {
    var app_id = appid;
    dbOem.collection(iap+app_id).findOne({'_id':'no-segment'}, function (err, res) {
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
            //year = 2014;
            //month = 12;
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
                    getEventData(app_id, iapData, key, dbOem, year, month);
                }
            }
            dbCount++;
            return;
        }
    });
}

function getEventData(appid, iapData, key, dbOem, year, month) {
    var app_id = appid;
    //print("key==>"+key);
    //print("collName==>"+iap+app_id);
    dbOem.collection(iap+app_id).findOne({'_id':key}, function (err, res) {
        if (err) {
            print(err);
            dbCount++;
            return;
        }
        if (res) {
            for (var i=0;i<iapData[app_id][iap][key].length;i++) {
                //print(iapData[app_id][iap][key][i]);
                //year = 2014;
                //month = 12;
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
                        if (!iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c']) {
                            iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c'] = 0;
                        }
                        iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c'] += res[year][month][iapData[app_id][iap][key][i]]['c'];
                    } else {
                        iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['c'] = 0;
                    }
                    if (res[year][month][iapData[app_id][iap][key][i]]['s']) {
                        //print("s==>"+iapData[app_id][iap][key][i]);
                        //print(res[year][month][iapData[app_id][iap][key][i]]['s']);
                        if (!iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['s']) {
                            iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['s'] = 0;
                        }
                        iapData[app_id]['detail'][key][iapData[app_id][iap][key][i]]['s'] += res[year][month][iapData[app_id][iap][key][i]]['s'];
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