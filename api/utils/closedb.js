// closedb.js
// ========
var closedb = {},
	mydb = {};
	mydb.cnt = {};

(function (closedb) {
  	closedb.open =  function(db) {
    	if( !mydb.cnt[db.tag] ) mydb.cnt[db.tag] = 1;
    	else mydb.cnt[db.tag]++;
      //console.log(db.tag+" "+mydb.cnt[db.tag]);
  	}; 
  	closedb.close = function(db) {
    	mydb.cnt[db.tag]--;
      //console.log(db.tag+" "+mydb.cnt[db.tag]);
    	if ( mydb.cnt[db.tag] <= 0 ) {
      		delete mydb.cnt[db.tag];
      		return db.close();
    	}
    	return null;
  	};
}(closedb));

module.exports = closedb;

