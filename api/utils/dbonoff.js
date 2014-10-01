// closedb.js
// ========
var common = require('./common.js');
var dbonoff = {};
var _mydb_cnt = {};
var _total_db_cnt = 0;
var _dblist = [];

(function (dbonoff) {
    dbonoff.on =  function(db, increment) {
	var inc = increment? increment: 1;
	if (!_mydb_cnt[db]) _mydb_cnt[db] = inc;
	else _mydb_cnt[db] += inc;
	console.log('on:'+db+'='+inc+','+_mydb_cnt[db]);
    }; 

    dbonoff.off = function(db, decrement) {
	var dec = decrement? decrement: 1;
	if (!_mydb_cnt[db]) _mydb_cnt[db] = 0;
    	else _mydb_cnt[db] -= dec;
	if (_mydb_cnt[db] <= 0 && _dblist.indexOf(db)<0){
	    _total_db_cnt++;
	    _dblist.push(db);
	}
	console.log('off:'+db+','+_mydb_cnt[db]+','+_total_db_cnt);
	var sum = _dblist.reduce(
		    function(prev, curr) {
			return prev + (_mydb_cnt[curr]>0?1:0);
		    }, 0
		);
    	if (!sum && _total_db_cnt >= 3 ) { //sessions, events, all_sessions
	    common.db_raw.close();
	    return common.db.close();
    	}
    	return null;
    };
}(dbonoff));

module.exports = dbonoff;
