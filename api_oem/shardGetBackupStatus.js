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

connection.connect();

//var backupStatus = 1;

connection.query('select backup from status', function(err, rows, fields) {
  if (err) {
    throw err;
  }

  console.log(rows[0].backup);
});

connection.end();

