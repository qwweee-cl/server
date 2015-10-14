var mongo = require('mongoskin');

var db_host = process.argv[2] || null;
var db_name = process.argv[3] || null;
var collectionName = process.argv[4] || null;
var new_app_key = process.argv[5] || null;

// exit if miss any argument
if(!db_host || !db_name || !collectionName || !new_app_key) {
    console.log("Updata App Key: Invalid Parameters");
    process.exit(0);
}

var dbBatchOptions = {safe: true, maxPoolSize: 1000};
var dbLocalBatchName = db_host + "/" + db_name + '?auto_reconnect=true';
var db = mongo.db(dbLocalBatchName, dbBatchOptions);
var b_coll = db.collection(collectionName);

b_coll.update({'app_key': {'$ne': new_app_key}}, 
              {'$set': {'app_key': new_app_key}}, {'multi': true}, 
              function(err, data){
                  if(err) {
                      console.log("Update App Key error: "+err);
                  }
                  console.log("Finish update collection: " + collectionName + " with app key: " + new_app_key);
                  db.close();
              });
