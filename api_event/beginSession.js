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
    dbName = ('mongodb://localhost:27017/clad_raw1?auto_reconnect=true'),
    dbOemName = ('mongodb://localhost:27017/oem_abc_raw1?auto_reconnect=true'),
    dbOemName1 = ('mongodb://localhost:27017/oem_zxc_raw1?auto_reconnect=true'),
    dbRawName = ('mongodb://localhost:27017/countly_raw1?auto_reconnect=true'),
    dbOemCountlyName = ('mongodb://localhost:27017/clad_abc?auto_reconnect=true'),
    dbOemCountlyName1 = ('mongodb://localhost:27017/clad_zxc?auto_reconnect=true'),
    db = mongo.db(dbName, dbOptions),
    dbOem = mongo.db(dbOemName, dbOemOptions),
    dbOem1 = mongo.db(dbOemName1, dbOemOptions),
    dbRaw = mongo.db(dbRawName, dbOptions),
    dbOemCountly = mongo.db(dbOemCountlyName, dbOemOptions),
    dbOemCountly1 = mongo.db(dbOemCountlyName1, dbOemOptions),
    rawName = 'raw_session_5bdd437648c2d067c3dce506f8c22fe5421ed5a9';
    rawName1 = 'raw_session_3c0d51e6ebd543345390297e77186287f3cfb43d';
    rawName2 = 'raw_session_e4f1ebacd105643ae331ef2f0e909b00694aefd5';
    appuser = 'app_users5407ff9df036d1673f0182d1';
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
        "GT-I9505"] } };

var nopt2 = { "metrics._device": { $nin: [
        "GT-I9300",
        "Nexus 7", 
        "ME173X", 
        "SM-P600", 
        "SM-T211", 
        "SM-T800", 
        "A1-810",
        "B1-710"] } };

var nopt3 = { "metrics._device": { $nin: [
        "iPod5,1",
        "iPhone4,1", 
        "iPhone5,2", 
        "iPhone5,4", 
        "iPhone7,2", 
        "iPhone3,1", 
        "iPhone7,1"] } };

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
function deleteData(rawName,data) {
    return;
    mydb.open(db);
    db.collection(rawName).remove(data, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(db);
    });
}
function insertData(rawName,data) {
    return;
    mydb.open(dbOem);
    dbOem.collection(rawName).remove(data, function(err, data) {
        if (err) {
            print("err:"+err);
        }
        mydb.close(dbOem);
    });
}
var sum = 0;
function findUserApps(dataIn) {
    var option = {'_id':dataIn._id};
    mydb.open(dbOemCountly1);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    dbOemCountly1.collection(appuser).findOne(option, function(err, zxcdata) {
        if (err) {
            print(err);
            mydb.close(dbOemCountly1);
            return;
        }
        if (zxcdata) {
            //print(dataIn.sc+" "+zxcdata.sc);
            if (dataIn.sc != zxcdata.sc) {
                if (dataIn.sc < zxcdata.sc) {
                    //print(dataIn.sc+" "+zxcdata.sc);
                    print(dataIn.did);
                }
                sum += (dataIn.sc-zxcdata.sc);
                //print("sum="+sum+" "+dataIn.did);
            }
        } else {
            //print("no match");
        }
        mydb.close(dbOemCountly1);
    });
}
function saveCSV() {

    mydb.open(dbOemCountly);
    //db.collection(rawName).find({$or:[{"metrics._device":"GT-I9300"},{"metrics._device":"SM-N9005"}]}).toArray(function(err, data) {
    dbOemCountly.collection(appuser).find().each(function(err, data) {
        if (err) {
            print(err);
            mydb.close(dbOemCountly);
            return;
        }
        if (data) {
            findUserApps(data);
        } else {
            mydb.close(dbOemCountly);
        }
    });
return;

/* begin session count */

    mydb.open(db);
    db.collection(rawName).count({"begin_session": "1"}, function(err, count) {
        print(rawName+" : "+count);
        mydb.close(db);
    });
    mydb.open(dbRaw);
    dbRaw.collection(rawName).count({"begin_session": "1"}, function(err, count) {
        print(rawName+" : "+count);
        mydb.close(dbRaw);
    });
    mydb.open(dbOem);
    dbOem.collection(rawName).count({"begin_session": "1"}, function(err, count) {
        print(rawName+" : "+count);
        mydb.close(dbOem);
    });
    mydb.open(dbOem1);
    dbOem1.collection(rawName).count({"begin_session": "1"}, function(err, count) {
        print(rawName+" : "+count);
        mydb.close(dbOem1);
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

saveCSV();