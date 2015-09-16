var mysql      = require('mysql');
var host = 'elephant1';
var user = 'ceip';
var password = 'cyberlink#1';
var database = 'session_status';
var connection = mysql.createConnection({
  host     : host,
  user     : user,
  password : password,
  database : database
});

connection.connect();

connection.query('SELECT * from status', function(err, rows, fields) {
  if (err) throw err;

  console.log('The solution is: ', rows[0].id);
  console.log('The solution is: ', rows[0].session1);
  console.log('The solution is: ', rows[0].session2);
  console.log('The solution is: ', rows[0].round1);
  console.log('The solution is: ', rows[0].round2);
  console.log('The solution is: ', rows[0].backup);
});

var session1 = 1;

connection.query('UPDATE status SET session1 = '+session1+' WHERE id = 1', function(err, rows, fields) {
  if (err) throw err;

  console.log(rows);
});

connection.end();

