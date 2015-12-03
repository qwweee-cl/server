var mysql      = require('mysql');
var host = 'emr2';
var user = 'countly';
var password = 'countly!@#';
var database = 'test_session_status';
var connection = mysql.createConnection({
  host     : host,
  user     : user,
  password : password,
  database : database
});

var backupStatus = process.argv[2] || null;

// exit if miss any argument
if(!backupStatus) {
    console.log("Update Backup Status: Invalid Parameters Backup Status(0 or 1)");
    process.exit(1);
}

connection.connect();

//var backupStatus = 1;

connection.query('UPDATE status SET backup='+backupStatus+' WHERE id = 1', function(err, rows, fields) {
  if (err) {
    throw err;
  }

  console.log(rows);
});

connection.end();

