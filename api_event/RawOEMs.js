var mongo = require('mongoskin'),
	mongodb = require("mongodb"),
    util = require('util'),
    moment = require('moment'),
    time = require('time')(Date),
    events = require('events'),
    eventEmitter = new events.EventEmitter(),
    ObjectID = mongodb.ObjectID,
    print = console.log;

var start = process.argv[2],
    end = process.argv[3],
    dbOptions = { safe:false, maxPoolSize: 10000 },
    dbOemOptions = { safe:false, maxPoolSize: 10000 },
    dbName = ('mongodb://localhost:27017/clad_raw0?auto_reconnect=true'),
    dbOemName = ('mongodb://localhost:27017/oem_abc_raw0?auto_reconnect=true'),
    dbOemName2 = ('mongodb://localhost:27017/oem_zxc_raw0?auto_reconnect=true'),
    db = mongo.db(dbName, dbOptions),
    dbOem = mongo.db(dbOemName, dbOemOptions),
    dbOem2 = mongo.db(dbOemName2, dbOemOptions),
    rawName = 'raw_session_5bdd437648c2d067c3dce506f8c22fe5421ed5a9';
    rawName1 = 'raw_session_3c0d51e6ebd543345390297e77186287f3cfb43d';
    rawName2 = 'raw_session_e4f1ebacd105643ae331ef2f0e909b00694aefd5';
var mydb = {}; // initialize the helper object.

var opt1 = { "metrics._device": { $in: [
        "GT-I9300",
        "SM-N9005", 
        "GT-N7100", 
        "SM-G900F", 
        "Nexus 5", 
        "GT-I9500", 
        "SM-N900",
        "GT-I9505"] } };

var opt2 = { "metrics._device": { $in: [
        "GT-I9300",
        "Nexus 7", 
        "ME173X", 
        "SM-P600", 
        "SM-T211", 
        "SM-T800", 
        "A1-810",
        "B1-710"] } };

var opt3 = { "metrics._device": { $in: [
        "iPod5,1",
        "iPhone4,1", 
        "iPhone5,2", 
        "iPhone5,4", 
        "iPhone7,2", 
        "iPhone3,1", 
        "iPhone7,1"] } };

var nopt1 = { "metrics._device": { $nin: [
        "GT-I9300",
        "SM-N9005", 
        "GT-N7100", 
        "SM-G900F", 
        "Nexus 5", 
        "GT-I9500", 
        "SM-N900",
        "GT-I9505"] } , "begin_session": "1"};

var nopt2 = { "metrics._device": { $nin: [
        "GT-I9300",
        "Nexus 7", 
        "ME173X", 
        "SM-P600", 
        "SM-T211", 
        "SM-T800", 
        "A1-810",
        "B1-710"] } , "begin_session": "1"};

var nopt3 = { "metrics._device": { $nin: [
        "iPod5,1",
        "iPhone4,1", 
        "iPhone5,2", 
        "iPhone5,4", 
        "iPhone7,2", 
        "iPhone3,1", 
        "iPhone7,1"] } , "begin_session": "1"};

var nnopt1 = { "device_id": { $nin: [
        "bJAnN_8uUVYs-6vqWhlVDuveee-AOfRPZvaXqiyrf-M~",
        "LrGFuDbkPFoTTxxn3CIJWNqWrmcsdNC4EMW-DI3IjvI~"] } , "begin_session": "1"};

mydb.cnt = {}; // init counter to permit multiple db objects.

mydb.open = function(db) // call open to inc the counter.
{
  if( !mydb.cnt[db._dbconn.databaseName] ) mydb.cnt[db._dbconn.databaseName] = 1;
  else mydb.cnt[db._dbconn.databaseName]++;
}; 

mydb.close = function(db) // close the db when the cnt reaches 0.
{
  mydb.cnt[db._dbconn.databaseName]--;
  if ( mydb.cnt[db._dbconn.databaseName] <= 0 ) {
    delete mydb.cnt[db._dbconn.databaseName];
    return db.close();
  }
  return null;
};
function pad2(number) {
    return (number < 10 ? '0' : '') + number
}
function deleteRawData(rawName,data) {
    var did = data._id;
    var option = {"device_id":{$in: data}};
    mydb.open(db);
    db.collection(rawName).find(option, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        print(data);
        mydb.close(db);
    });
    return;
    mydb.open(db);
    db.collection(rawName).remove(data, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });
}
var sum = 0;
function deleteOemData(rawName,data) {
    var did = data._id;
    var option = {"device_id":{$in: data}};
    var noption = {"device_id":{$nin: data}};
    //print(option);
    /*
    mydb.open(db);
    db.collection(rawName).find(option).toArray(function(err, data) {
        if (err) {
            print("err:"+err);
        }
        if (data) {
            print(data.length);
        } else {
            print("no data");
        }
        mydb.close(db);
    });
    mydb.open(dbOem);
    dbOem.collection(rawName).find(noption).toArray(function(err, data) {
        if (err) {
            print("err:"+err);
        }
        if (data) {
            print(data.length);
        } else {
            print("no data");
        }
        mydb.close(dbOem);
    });
    */

    mydb.open(db);
    db.collection(rawName).remove(option, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });

    mydb.open(dbOem);
    dbOem.collection(rawName).remove(noption, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });
    /*mydb.open(dbOem);
    dbOem.collection(rawName).remove(option, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });*/
    return;
    mydb.open(dbOem);
    dbOem.collection(rawName).count(option, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        sum += data;
        mydb.close(dbOem);
    });
    mydb.open(dbOem);
    return;
    dbOem.collection(rawName).find(option).each(function(err, data) {
        if (err) {
            print("err:"+err);
        }
        if (data) {
            //print(data);
        } else {
            mydb.close(dbOem);
        }
    });
    return;
    mydb.open(dbOem);
    dbOem.collection(rawName).remove(data, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });
}
function saveCSV() {
    /*mydb.open(db);
    db.collection(rawName).find(tmpOpt).toArray(function(err, data) {
        if (err) {
            print("err:"+err);
        }
        if (data) {
            print(data.length);
        } else {
        }
        mydb.close(db);
    });
    return;*/
/*    
    mydb.open(dbOem2);
    dbOem2.collection(rawName).remove(nnopt1, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem2);
    });
    return;
*/
/* oem zxc debug */
/*
    mydb.open(dbOem2);
    dbOem2.collection(rawName).remove(nopt1, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem2);
    });
    return;
    mydb.open(dbOem2);
    dbOem2.collection(rawName2).remove(nopt3, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem2);
    });
    return;
*/
    mydb.open(db);
    db.collection(rawName).aggregate([
        { $match: opt1},
        { $group: { "_id": "$device_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var arr = [];
                var arrCount = 0;
                var raw = rawName;
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    arr[arrCount++] = data[i]._id;
                }
                deleteOemData(raw,arr);
                print("data:"+data.length);
            } else {
        }
        mydb.close(db);
    });

    mydb.open(db);
    db.collection(rawName1).aggregate([
        { $match: opt2},
        { $group: { "_id": "$device_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var arr = [];
                var arrCount = 0;
                var raw = rawName1;
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    arr[arrCount++] = data[i]._id;
                }
                deleteOemData(raw,arr);
                print("data:"+data.length);
            } else {
        }
        mydb.close(db);
    });

    mydb.open(db);
    db.collection(rawName2).aggregate([
        { $match: opt3},
        { $group: { "_id": "$device_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var arr = [];
                var arrCount = 0;
                var raw = rawName2;
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    arr[arrCount++] = data[i]._id;
                }
                deleteOemData(raw,arr);
                print("data:"+data.length);
            } else {
        }
        mydb.close(db);
    });
    /*mydb.open(db);
    db.collection(rawName1).aggregate([
        { $match: opt2},
        { $group: { "_id": "$device_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var arr = [];
                var arrCount = 0;
                var raw = rawName1;
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    arr[arrCount++] = data[i]._id;
                }
                deleteOemData(raw,arr);
                print("data:"+data.length);
            } else {
        }
        mydb.close(db);
    });
    db.collection(rawName2).aggregate([
        { $match: opt3},
        { $group: { "_id": "$device_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var arr = [];
                var arrCount = 0;
                var raw = rawName2;
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    arr[arrCount++] = data[i]._id;
                }
                deleteOemData(raw,arr);
                print("data:"+data.length);
            } else {
        }
        mydb.close(db);
    });*/
    return;
/*
    mydb.open(dbOem);
    dbOem.collection(rawName).find(nopt1).each(function(err, data) {
        if (err) {
            print("err:"+err);
        }
        if (data) {
            print(data.device_id);
        } else {
            mydb.close(dbOem);
        }
    });
    return;
*/
    mydb.open(dbOem);
    dbOem.collection(rawName).remove(nopt1, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });
    mydb.open(dbOem);
    dbOem.collection(rawName1).remove(nopt2, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });
    mydb.open(dbOem);
    dbOem.collection(rawName2).remove(nopt3, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });

    mydb.open(db);
    db.collection(rawName).remove(opt1, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });
    mydb.open(db);
    db.collection(rawName1).remove(opt2, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });
    mydb.open(db);
    db.collection(rawName2).remove(opt3, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });
    /*
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName).find(nopt1).toArray(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            for (i=0; i<data.length; i++) {
                //print(data[i]);
                ///allData += data[i]+"\n";
                //insertData(rawName,data[i]);
                deleteData(rawName,data[i]);
            }
            print("find["+rawName+"]:"+data.length);
        } else {
        }
        mydb.close(db);
    });*/
    return;
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName1).find(nopt2).toArray(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            for (i=0; i<data.length; i++) {
                //print(data[i]);
                ///allData += data[i]+"\n";
                insertData(rawName1,data[i]);
                deleteData(rawName1,data[i]);
            }
            print("find["+rawName1+"]:"+data.length);
        } else {
        }
        mydb.close(db);
    });
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName2).find(nopt3).toArray(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            for (i=0; i<data.length; i++) {
                //print(data[i]);
                ///allData += data[i]+"\n";
                insertData(rawName2,data[i]);
                deleteData(rawName2,data[i]);
            }
            print("find["+rawName2+"]:"+data.length);
        } else {
        }
        mydb.close(db);
    });
/*
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName).find(opt1).each(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            insertData(rawName,data);
            //deleteData(rawName,data);
            //print("find["+rawName+"]:"+data);
        } else {
            mydb.close(db);
            print("finished");
        }
    });
    return;
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName).find(opt2).each(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            Data(rawName1,data);
            //deleteData(rawName1,data);
            //print("find["+rawName+"]:"+data);
        } else {
            mydb.close(db);
            print("finished");
        }
    });
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName).find(opt3).each(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            insertData(rawName2,data);
            deleteData(rawName2,data);
            //print("find["+rawName+"]:"+data);
        } else {
            mydb.close(db);
            print("finished");
        }
    });
*/
/*
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName1).find(opt2).toArray(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            for (i=0; i<data.length; i++) {
                //print(data[i]);
                ///allData += data[i]+"\n";
                insertData(rawName1,data[i]);
                deleteData(rawName1,data[i]);
            }
            print("find["+rawName1+"]:"+data.length);
        } else {
        }
        mydb.close(db);
    });
    mydb.open(db);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    db.collection(rawName2).find(opt3).toArray(function(err, data) {
        if (err) {
            print(err);
            mydb.close(db);
            return;
        }
        if (data) {
            var allData = "";
            for (i=0; i<data.length; i++) {
                //print(data[i]);
                ///allData += data[i]+"\n";
                eventEmitter.setMaxListeners(0);
                insertData(rawName2,data[i]);
                eventEmitter.setMaxListeners(0);
                deleteData(rawName2,data[i]);
            }
            print("find["+rawName2+"]:"+data.length);
        } else {
        }
        mydb.close(db);
    });
*/
    /*mydb.open(db);
    db.collection(rawName).aggregate([
        { $match: { "my_apps": ObjectID("543f37d0a62268c51e16d053")}},
        { $group: { "_id": "$_id" }}
        ], 
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var allData = "";
                //write.writeLine(saveFile, data);
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    ///allData += data[i]+"\n";
                }
                //write.writeLine(saveFile, allData);
                print(data.length);
            } else {
            }
            mydb.close(db);
        });*/
/*
    mydb.open(db);
    db.collection(rawName).count({ "my_apps": ObjectID("543f37d0a62268c51e16d053")}, function(err, count) {
        print(count);
        mydb.close(db);
    });
    mydb.open(db);
    db.collection(rawName).count({ "my_apps": ObjectID("543f37eaa62268c51e16d0c3")}, function(err, count) {
        print(count);
        mydb.close(db);
    });
    mydb.open(db);
    db.collection(rawName).count({ "my_apps": {$in: [ObjectID("543f37d0a62268c51e16d053"), ObjectID("543f37eaa62268c51e16d0c3")]}}, function(err, count) {
        print(count);
        mydb.close(db);
    });
*/
    /*db.collection(rawName).distinct('device_id', {"begin_session": {$exists:1}, "timestamp": {$gte: startSec.toString(), $lt: endSec.toString()}} ,
        function(err, data) {
            if (err) {
                print(err);
                mydb.close(db);
                return;
            }
            if (data) {
                var allData = "";
                //write.writeLine(saveFile, data);
                for (i=0; i<data.length; i++) {
                    //print(data[i]);
                    allData += data[i]+"\n";
                }
                write.writeLine(saveFile, allData);
                print(saveFile+"\t"+data.length);
            } else {
            }
            mydb.close(db);
        });*/
}
//eventEmitter.on('deleteOemData', deleteOemData);
//eventEmitter.on('deleteRawData', deleteRawData);

saveCSV();