var debug = {},
    fs = require('fs');

(function (debug) {
    debug.writeLog = function(filename, log) {
        fs.appendFile(filename, log+"\n", function(err) {
            if(err) {
                console.log(err);
            } else {
                //console.log("The file was saved!");
            }
        });
    }
}(debug));

module.exports = debug;
