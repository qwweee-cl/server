var mysql      = require('mysql');
var host = 'emr2';
var user = 'countly';
var password = 'countly!@#';
var database = 'session_status';
var connection = mysql.createConnection({
  host     : host,
  user     : user,
  password : password,
  database : database
});

var oemName = process.argv[2] || null;
var sessionType = oemName || null;
var sessionStatus = process.argv[3] || null;
var roundValue = process.argv[4] || null;

// exit if miss any argument
if(!oemName || !sessionStatus || !roundValue || !sessionType) {
    console.log("Update Session Status: Invalid Parameters OEM name(medion, intex, Cheetah) Status(1 or 0) roundValue(dbname)");
    process.exit(1);
}

sessionType = sessionType+"_round";

connection.connect();

//var oemName = 1;
//var session1 = 1;
//var round1 = "'countly_raw0901_00'";
var queryString = 'UPDATE oem_status SET `'+oemName+'`='+sessionStatus+', '+sessionType+'="'+roundValue+'" WHERE id = 1';
console.log(queryString);

connection.query(queryString, function(err, rows, fields) {
  if (err) {
    throw err;
  }

  console.log(rows);
});

connection.end();

