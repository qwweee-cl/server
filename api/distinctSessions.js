var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    fs = require('fs'),
    ObjectID = require('mongodb').ObjectID;

var e_log = console.error,
    log = console.log;

var db = common.getLocalBatchDB();

var app_key = process.argv[2] || null;
var file_name = process.argv[3] || null;
var begin_session = process.argv[4] || 0;
var limit_session = process.argv[5] || 0;
if (!app_key || !file_name) {
    if(!app_key) e_log("No app key, exit.");
    if(!file_name) e_log("Invalid file name, exit.");
	process.exit(1);
}

// Need to check begin session is belong to another file
var skipNumber = (begin_session == 0) ? 0 : begin_session - 1;
var bCheckUserMode = (skipNumber > 0) ;

// file will be remove if already exist
if(fs.existsSync(file_name)) {
    fs.unlinkSync(file_name);
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

var startTime = new Date().getTime();
var sessions = [];
var userCount = 0;
var accumlateSessionCnt = 0;

col.find({_id:{$lt:eid, $gte:bid}}, {read:"secondary"}).sort(sortOrder).skip(skipNumber).each(
    function(err, res) {
        if(err) {
            e_log('Server Error: ' + err);
            exitCloseDB();
        }
        
        if(sessions.length == 0) {
            if(!res) {// sessions is empty and no data queried, return
                e_log('Data Error: No Data');
                exitCloseDB();
            }
            else if(bCheckUserMode) {
                sessions[0] = res;
            }
            else { // first session of first user
                sessions[0] = res;
                addOneSession();
            }
        }
        else if(bCheckUserMode) {
            if(!res) {
                // all sessions in queried range are belong to another file?!
                // it should be impossible
                e_log("Data Error: No Distinct Data in Queried Range");
                exitCloseDB();
            }
            else if(res.app_user_id != sessions[0].app_user_id) {
                // meet the first session which is belong to this file
                sessions = [];
                sessions[0] = res;
                addOneSession();
                bCheckUserMode = false;
            }
            else {
                // to avoid if the first user check belong to another file eat too many limitation
                limit_session --; 
            }
        }
        else {
            if(!res) { // all records have been queried.
                writeSessionsToFile(sessions);
                logSummary();
                exitCloseDB();
            }
            // check user of this session is same as the current collected sessions
            else if(res.app_user_id == sessions[0].app_user_id) { 
                sessions[sessions.length] = res;
                addOneSession();
            }
            else {
                // write current collected sessions to file
                writeSessionsToFile(sessions);
                if(accumlateSessionCnt >= limit_session) {
                    logSummary();
                    exitCloseDB();
                }
                else {
                    sessions = [];
                    sessions[0] = res;
                    addOneSession();
                }
            }
        }
});

function exitCloseDB() {
    var endTime = new Date().getTime();
	log("Total Time lapsed: "+(endTime-startTime));
    
	dbonoff.close(db);
	process.exit(1);
}

function addOneSession() {
    accumlateSessionCnt ++;
}

function writeSessionsToFile(listSessions) {
    fs.appendFileSync(file_name, JSON.stringify(listSessions) + '\n');
    userCount ++;
}

function logSummary(){
    log("*** Summary: ");
    log("File Name: " + file_name);
    log("App Key: " + app_key);
    log("Sessions Count: " + accumlateSessionCnt);
    log("Users Count: " + userCount);
    log("-------------------------");
}


