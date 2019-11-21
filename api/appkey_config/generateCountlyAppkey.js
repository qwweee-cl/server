import crypto from 'crypto';
import fs from "fs";
import path from "path";

const mongoObjectId = function() {
  const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
  return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
    return (Math.random() * 16 | 0).toString(16);
  }).toLowerCase();
};

function padLeft(str, len) {
  str = '' + str;
  return str.length >= len ? str : new Array(len - str.length + 1).join("0") + str;
}

const sha1Hash = function(str, addSalt) {
  var salt = (addSalt) ? new Date().getTime() : '';
  return crypto.createHmac('sha1', salt + '').update(str + '').digest('hex');
};


console.log(mongoObjectId());

const tmpData = {
  "_id": { "$oid": "5dc8b6cd967827d16c00000f" },
  "name": "MAC RED SDK Android",
  "country": "US",
  "category": "4",
  "timezone": "America/Phoenix",
  "key": "488dbc1e7acdf4dd4db283161d9b341c5d4f8ed4"
};

const tmpString1 = "a:6:{s:3:\"_id\";C:7:\"MongoId\":24:{";
const tmpString2 = "}s:4:\"name\";s:23:\"";
const tmpString3 = "\";s:7:\"country\";s:2:\"US\";s:8:\"category\";s:1:\"4\";s:8:\"timezone\";s:15:\"America\/Phoenix\";s:3:\"key\";s:40:\"";
const tmpString4 = "\";}";

const tmpString12 = "a:6:{s:3:\"_id\";C:7:\"MongoId\":24:{";
const tmpString22 = "}s:4:\"name\";s:19:\"";
const tmpString32 = "\";s:7:\"country\";s:2:\"US\";s:8:\"category\";s:1:\"4\";s:8:\"timezone\";s:15:\"America\/Phoenix\";s:3:\"key\";s:40:\"";
const tmpString42 = "\";}";

//console.log(tmpData);

const android = [];
const ios = [];

const jsonAndroid = [];
const jsonIOS = [];

let i = 0;
for (i = 0; i < 3000; i++) {
  const objectId = mongoObjectId();
  const name = "SDK_AUTO_Android_" + padLeft(i, 6);
  const appKey = sha1Hash(objectId, true);
  const newData = {
    "_id": objectId,
    "name": name,
    "appKey": appKey
  };
  jsonAndroid.push(newData);
  const str = tmpString1 + objectId + tmpString2 + name + tmpString3 + appKey + tmpString4;
  android.push(str);
}

for (i = 0; i < 3000; i++) {
  const objectId = mongoObjectId();
  const name = "SDK_AUTO_iOS_" + padLeft(i, 6);
  const appKey = sha1Hash(objectId, true);
  const newData = {
    "_id": objectId,
    "name": name,
    "appKey": appKey
  };
  jsonIOS.push(newData);
  const str = tmpString12 + objectId + tmpString22 + name + tmpString32 + appKey + tmpString42;
  ios.push(str);
}

const dataFile1 = path.join('./', 'countly_auto_android_mongo.json');
console.log(dataFile1);
const fd1 = fs.openSync(dataFile1, 'w');
try {
  fs.writeSync(fd1, JSON.stringify(android));
  fs.closeSync(fd1);
} catch (e) {
  fs.closeSync(fd1);
}

const dataFile2 = path.join('./', 'countly_auto_ios_mongo.json');
console.log(dataFile2);
const fd2 = fs.openSync(dataFile2, 'w');
try {
  fs.writeSync(fd2, JSON.stringify(ios));
  fs.closeSync(fd2);
} catch (e) {
  fs.closeSync(fd2);
}

const dataFile11 = path.join('./', 'countly_auto_android_json.json');
console.log(dataFile11);
const fd11 = fs.openSync(dataFile11, 'w');
try {
  fs.writeSync(fd11, JSON.stringify(jsonAndroid));
  fs.closeSync(fd11);
} catch (e) {
  fs.closeSync(fd11);
}

const dataFile12 = path.join('./', 'countly_auto_ios_json.json');
console.log(dataFile12);
const fd12 = fs.openSync(dataFile12, 'w');
try {
  fs.writeSync(fd12, JSON.stringify(jsonIOS));
  fs.closeSync(fd12);
} catch (e) {
  fs.closeSync(fd12);
}
