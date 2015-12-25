var moment = require('moment'),
    momentz = require('moment-timezone'),
    print = console.log;

var start_date = process.argv[2];
var start_round = process.argv[3];
var formatMoment = moment(start_date, "YYYYMMDD");
var formatRound = zeroFill(((parseInt(start_round)+1)*6)-1, 2);
var appTimezone = "America/Denver";
//print(formatMoment.format("YYYY-MM-DD")+" "+formatRound+":59");
var tmpMoment = moment.tz(formatMoment.format("YYYY-MM-DD")+" "+formatRound+":59:00", appTimezone);
//print(tmpMoment.toString());
print(tmpMoment.format("X"));

function zeroFill (number, width) {
    width -= number.toString().length;

    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }

    return number + ""; // always return a string
};
 