var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    fs = require('fs'),
    print = console.log,
    ObjectID = require('mongodb').ObjectID;

var db = common.getLocalBatchDB();

var app_key = process.argv[2] || 0;
var prefix = process.argv[3] || '_sessions_';
var ext = process.argv[4] || '.txt';
var number_files = process.argv[5] || 1;
if (!app_key) {
	print("No app key, exit.");
	process.exit(1);
}

var sortOrder = {app_user_id:1, timestamp:1};
var date = new Date();
var begin_date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 60);
var end_date = new Date(date.getFullYear(),date.getMonth(), date.getDate()+1);

var bdd = Math.floor(begin_date.getTime()/1000);
var edd = Math.floor(end_date.getTime()/1000);
var bid = new ObjectID(bdd.toString(16)+'0000000000000000');
var eid = new ObjectID(edd.toString(16)+'0000000000000000');

dbonoff.open(db);
var colName = "raw_session_"+app_key;
var col = db.collection(colName);

// remove files
for(var idx = 0 ; idx < 32 ; idx++) {
    if(fs.existsSync(getSessionFileName(idx)))
        fs.unlinkSync(getSessionFileName(idx));
}

var startTime = new Date().getTime();
var sessions = [];
var currentFileIdx = 0;
var userCount = 0;

col.find({_id:{$lt:eid, $gte:bid}}).sort(sortOrder).each(
    function(err, res) {
        if(err) {
            print('Distinct Sessions with Error: ' + err);
            exitCloseDB();
        }
        
        if(sessions.length == 0) {
            if(!res) {// sessions is empty and no data queried, return
                print('No Data.');
                exitCloseDB();
            }
            else // first session of first user
                sessions[0] = res;
        }
        else {
            if(!res) { // all records have been queried.
                writeSessionsToFile(sessions);
                print('Finish get sessions of app_key: ' + app_key + ', user count = ' + userCount);
                exitCloseDB();
            }
            // check user of this session is same as the current collected sessions
            else if(res.app_user_id == sessions[0].app_user_id)
                sessions[sessions.length] = res;
            else {
                // write current collected sessions to file
                writeSessionsToFile(sessions);
                sessions = [];
                sessions[0] = res;
            }
        }
});

function exitCloseDB() {
    var endTime = new Date().getTime();
	print("Total Time lapsed: "+(endTime-startTime));
    
	dbonoff.close(db);
	process.exit(1);
}

function getSessionFileName(index) {
    return 'RawSession/' + prefix + index + ext;
}

function writeSessionsToFile(listSessions) {
    var fileName = getSessionFileName(currentFileIdx);
    fs.appendFileSync(fileName, JSON.stringify(listSessions) + '\n');
    userCount ++;
    currentFileIdx ++;
    if(currentFileIdx >= number_files)
        currentFileIdx = 0;
}




