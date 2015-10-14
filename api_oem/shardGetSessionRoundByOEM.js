var mysql      = require('mysql');
var host = 'emr2';
var user = 'countly';
var password = 'countly!@#';
var database = 'session_status';

var oemName = process.argv[2] || null;;

// exit if miss any argument
if(!oemName) {
    console.log("Update Session Status: Invalid Parameters OEM name(medion, intex, Cheetah)");
    process.exit(1);
}

oemName = oemName+'_round';

var connection = mysql.createConnection({
  host     : host,
  user     : user,
  password : password,
  database : database
});

connection.connect();

//var backupStatus = 1;

connection.query('select '+oemName+' from oem_status', function(err, rows, fields) {
  if (err) {
    throw err;
  }

  console.log(rows[0][oemName]);
});

connection.end();

