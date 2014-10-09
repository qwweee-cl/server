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
	//console.log('on:'+db+'='+inc+','+_mydb_cnt[db]);
    }; 

    dbonoff.isZero = function(db) {
	if (_mydb_cnt[db]>0) return false;
	else return true;
    }

    dbonoff.getCnt = function(db) {
	if (!_mydb_cnt[db]) return null;
	else return _mydb_cnt[db];
    }

    dbonoff.setZero = function(db) {
	_mydb_cnt[db] = 0;
    }

    dbonoff.off = function(db, decrement) {
	var dec = decrement? decrement: 1;
	if (!_mydb_cnt[db]) _mydb_cnt[db] = 0;
    	else _mydb_cnt[db] -= dec;
	if (_mydb_cnt[db] < 0) _mydb_cnt[db] = 0;
    };
}(dbonoff));

module.exports = dbonoff;
