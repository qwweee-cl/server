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

var dateRound = process.argv[2] || null;

// exit if miss any argument
if(!dateRound) {
    console.log("Update Session Status: Invalid Parameters DateRound(20150101_00)");
    process.exit(1);
}

connection.connect();

//var sessionType = 1;
//var session1 = 1;
//var round1 = "'countly_raw0901_00'";
var queryString = 'UPDATE status SET dateRound="'+dateRound+'" WHERE id = 1';
console.log(queryString);

connection.query(queryString, function(err, rows, fields) {
  if (err) {
    throw err;
  }

  console.log(rows);
});

connection.end();

