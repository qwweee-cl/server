var common = require('./utils/common.js'),
    dbonoff = require('./utils/closedb.js'),
    geoip = require('geoip-lite'),
    print = console.log;

print("date:"+(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')));

function testCommon() {
	var dbInstance = common.getDBByName("countly_Java");

	print(dbInstance.tag);
	dbonoff.open(dbInstance);
	dbInstance.collections(function(err,collection) {
	    if (!collection.length) {
	        common.db.close();
		    print('no data');
	        return;
	    }
	    for (var i=0; i<collection.length; i++) {
	        var collectionName = collection[i].collectionName;
	        print(collectionName);
	    }
	    dbonoff.close(dbInstance);
	});
}
function testIP() {
	var ipAddress = '195.241.137.66';
	var locationData = geoip.lookup(ipAddress);

	if (locationData) {
	    if (locationData.country) {
	        print(locationData.country);
	    }

	    if (locationData.city) {
	        print(locationData.city);
	    } 

	    // Coordinate values of the user location has no use for now
	    if (locationData.ll) {
	        print(locationData.ll);
	   }
	}
}