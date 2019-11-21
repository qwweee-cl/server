import androidJson from "./countly_auto_android_json";
import iosJson from "./countly_auto_ios_json";
import fs from "fs";
import path from "path";

const android = [];
const ios = [];

const tmpJson = {"5554ac343cc1b0f9b48ea881553126cd8320a6de" : {appName: "EL_CareOS_SDK", appOS: "And", sdk: true}};
const tmpAndroid = {appName: "", appOS: "And", sdk: true};
const tmpiOS = {appName: "", appOS: "iOS", sdk: true};

androidJson.map(item => {
  android.push({...tmpAndroid, appName: item.name, appKey: item.appKey});
});

iosJson.map(item => {
  ios.push({...tmpiOS, appName: item.name, appKey: item.appKey});
});

console.log(android.length);
console.log(ios.length);

const dataFile1 = path.join('./', 'countly_auto_android_json_code.json');
console.log(dataFile1);
const fd1 = fs.openSync(dataFile1, 'w');
try {
  fs.writeSync(fd1, JSON.stringify(android));
  fs.closeSync(fd1);
} catch (e) {
  fs.closeSync(fd1);
}

const dataFile2 = path.join('./', 'countly_auto_ios_json_code.json');
console.log(dataFile2);
const fd2 = fs.openSync(dataFile2, 'w');
try {
  fs.writeSync(fd2, JSON.stringify(ios));
  fs.closeSync(fd2);
} catch (e) {
  fs.closeSync(fd2);
}
