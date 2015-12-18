var mongo = require('mongoskin'),
	print = console.log;

var dbHost = "shard2-0";
var dbOptions = { safe:false, maxPoolSize: 1000 };
var dbName = "";
var appKey = ["0368eb926b115ecaf41eff9a0536a332ef191417",
              "02ce3171f470b3d638feeaec0b3f06bd27f86a26",
              "9219f32e8de29b826faf44eb9b619788e29041bb",
              "75edfca17dfbe875e63a66633ed6b00e30adcb92",
              "c277de0546df31757ff26a723907bc150add4254",
              "e315c111663af26a53e5fe4c82cc1baeecf50599",
              "895ef49612e79d93c462c6d34abd8949b4c849af",
              "ecc26ef108c821f3aadc5e283c512ee68be7d43e",
              "488fea5101de4a8226718db0611c2ff2daeca06a",
              "7cd568771523a0621abff9ae3f95daf3a8694392"];
var header = ["raw_session_",
              "raw_event_"];

if (process.argv.length == 3) {
    dbName = process.argv[2];
} else {
	print("please input db name");
}

var dbLocalRawName = (dbHost + ':27017/' + dbName + '?auto_reconnect=true');
var db = mongo.db(dbLocalRawName, dbOptions);

db.collections(function(err,collection) {
	if (!collection.length) {
		print('no collections');
		db.close();
		process.exit(0);
	}
	for (var i=0; i<collection.length; i++) {
		for (var j=0;j<appKey.length;j++) {
			if (collection[i].collectionName.indexOf(appKey[j])>=0) {
				if (collection[i].collectionName.indexOf(header[0])>=0) {
//print("session: "+collection[i].collectionName);
				} else if (collection[i].collectionName.indexOf(header[1])>=0) {
//print("event: "+collection[i].collectionName);
				} else {
					print(collection[i].collectionName);
				}
			}
		}
	}
	db.close();
});