var mysql      = require('mysql');
var host = 'claddb';
var user = 'ymk';
var password = 'cyberlinkymk';
var connection = mysql.createConnection({
  host     : host,
  user     : user,
  password : password
});

connection.connect();

connection.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
  if (err) throw err;

  console.log('The solution is: ', rows[0].solution);
});

connection.end();

