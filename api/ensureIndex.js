var mongo = require('mongoskin');

var db_host = process.argv[2] || null;
var db_name = process.argv[3] || null;
var collectionName = process.argv[4] || null;

// exit if miss any argument
if(!db_host || !db_name || !collectionName) {
    console.log("Ensure Index: Invalid Parameters");
    process.exit(0);
}

var dbBatchOptions = {safe: true, maxPoolSize: 1000};
var dbLocalBatchName = db_host + "/" + db_name + '?auto_reconnect=true';
var db = mongo.db(dbLocalBatchName, dbBatchOptions);
var b_coll = db.collection(collectionName);

b_coll.ensureIndex({"app_user_id":1, "timestamp":1}, function(err, nameIndex) {
    if(err) {
        console.log("Ensure Index with error: "+err);
        db.close();
    }
    console.log("Finish ensure index of collection: " + collectionName + " with index name: " +nameIndex);
    db.close();
});