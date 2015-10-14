var countlyCommon = {},
    time = require('time')(Date),
    moment = require('moment'),
    underscore = require('underscore');

(function (countlyCommon) {

    // Private Properties
    var _period = "hour",
        _appTimezone = "UTC",
        _currMoment = moment();

    // Public Properties

    countlyCommon.periodObj = getPeriodObj();

    // Public Methods

    countlyCommon.setTimezone = function(appTimezone) {
        _appTimezone = appTimezone;

        var currTime = new Date();
        currTime.setTimezone(appTimezone);

        _currMoment = moment(currTime);

        countlyCommon.periodObj = getPeriodObj();
    };

    countlyCommon.setPeriod = function(period) {
        _period = period;
        countlyCommon.periodObj = getPeriodObj();
    };

    // Calculates the percent change between previous and current values.
    // Returns an object in the following format {"percent": "20%", "trend": "u"}
    countlyCommon.getPercentChange = function (previous, current) {
        var pChange = 0,
            trend = "";

        if (previous == 0) {
            pChange = "NA";
            trend = "u"; //upward
        } else if (current == 0) {
            pChange = "∞";
            trend = "d"; //downward
        } else {
            pChange = countlyCommon.getShortNumber((((current - previous) / previous) * 100).toFixed(1)) + "%";
            if (previous > current) {
                trend = "d";
            } else {
                trend = "u";
            }
        }

        return {"percent":pChange, "trend":trend};
    };

    // Fetches nested property values from an obj.
    countlyCommon.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

    countlyCommon.extractRangeData = function (db, propertyName, rangeArray, explainRange) {

        countlyCommon.periodObj = getPeriodObj();

        var dataArr = [],
            dataArrCounter = 0,
            rangeTotal,
            total = 0;

        if (!rangeArray) {
            return dataArr;
        }

        for (var j = 0; j < rangeArray.length; j++) {

            rangeTotal = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    rangeTotal += tmp_x[rangeArray[j]];
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            } else {
                var tmpRangeTotal = 0;

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        rangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        tmpRangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                if (rangeTotal > tmpRangeTotal) {
                    rangeTotal = tmpRangeTotal;
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            }
        }

        for (var j = 0; j < dataArr.length; j++) {
            dataArr[j].percent = ((dataArr[j]["t"] / total) * 100).toFixed(1);
        }

        dataArr.sort(function (a, b) {
            return -(a["t"] - b["t"]);
        });

        return dataArr;
    };

    countlyCommon.extractChartData = function (db, clearFunction, chartData, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

        var periodMin = countlyCommon.periodObj.periodMin,
            periodMax = (countlyCommon.periodObj.periodMax + 1),
            dataObj = {},
            formattedDate = "",
            tableData = [],
            propertyNames = underscore.pluck(dataProperties, "name"),
            propertyFunctions = underscore.pluck(dataProperties, "func"),
            currOrPrevious = underscore.pluck(dataProperties, "period"),
            activeDate,
            activeDateArr;

        for (var j = 0; j < propertyNames.length; j++) {
            if (currOrPrevious[j] === "previous") {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.previousPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.previousPeriod;
                }
            } else {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.activePeriod;
                }
            }

            for (var i = periodMin; i < periodMax; i++) {

                if (!countlyCommon.periodObj.isSpecialPeriod) {

                    if (countlyCommon.periodObj.periodMin == 0) {
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"));
                    } else if (("" + activeDate).indexOf(".") == -1) {
                        formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"));
                    } else {
                        formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"));
                    }

                    dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
                } else {
                    formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"));
                    dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
                }

                dataObj = clearFunction(dataObj);

                if (!tableData[i]) {
                    tableData[i] = {};
                }

                tableData[i]["date"] = formattedDate.format(countlyCommon.periodObj.dateString);

                if (propertyFunctions[j]) {
                    propertyValue = propertyFunctions[j](dataObj);
                } else {
                    propertyValue = dataObj[propertyNames[j]];
                }

                chartData[j]["data"][chartData[j]["data"].length] = [i, propertyValue];
                tableData[i][propertyNames[j]] = propertyValue;
            }
        }

        var keyEvents = [];

        for (var k = 0; k < chartData.length; k++) {
            var flatChartData = underscore.flatten(chartData[k]["data"]);
            var chartVals = underscore.reject(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });
            var chartIndexes = underscore.filter(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });

            keyEvents[k] = {};
            keyEvents[k].min = underscore.min(chartVals);
            keyEvents[k].max = underscore.max(chartVals);
        }

        return {"chartDP":chartData, "chartData":underscore.compact(tableData), "keyEvents":keyEvents};
    };

    countlyCommon.extractTwoLevelData = function (db, rangeArray, clearFunction, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

        if (!rangeArray) {
            return {"chartData":tableData};
        }
        var periodMin = 0,
            periodMax = 0,
            dataObj = {},
            formattedDate = "",
            tableData = [],
            chartData = [],
            propertyNames = underscore.pluck(dataProperties, "name"),
            propertyFunctions = underscore.pluck(dataProperties, "func"),
            propertyValue = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            periodMin = countlyCommon.periodObj.periodMin;
            periodMax = (countlyCommon.periodObj.periodMax + 1);
        } else {
            periodMin = 0;
            periodMax = countlyCommon.periodObj.currentPeriodArr.length;
        }

        var tableCounter = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            for (var j = 0; j < rangeArray.length; j++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }

                dataObj = clearFunction(dataObj);

                var propertySum = 0,
                    tmpPropertyObj = {};

                for (var k = 0; k < propertyNames.length; k++) {

                    if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    } else {
                        propertyValue = dataObj[propertyNames[k]];
                    }

                    if (typeof propertyValue !== 'string') {
                        propertySum += propertyValue;
                    }

                    tmpPropertyObj[propertyNames[k]] = propertyValue;
                }

                if (propertySum > 0) {
                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj;
                    tableCounter++;
                }
            }
        } else {

            for (var j = 0; j < rangeArray.length; j++) {

                var propertySum = 0,
                    tmpPropertyObj = {},
                    tmp_x = {};

                for (var i = periodMin; i < periodMax; i++) {
                    dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                    if (!dataObj) {
                        continue;
                    }

                    dataObj = clearFunction(dataObj);

                    for (var k = 0; k < propertyNames.length; k++) {

                        if (propertyNames[k] == "u") {
                            propertyValue = 0;
                        } else if (propertyFunctions[k]) {
                            propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                        } else {
                            propertyValue = dataObj[propertyNames[k]];
                        }

                        if (!tmpPropertyObj[propertyNames[k]]) {
                            tmpPropertyObj[propertyNames[k]] = 0;
                        }

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj[propertyNames[k]] = propertyValue;
                        } else {
                            propertySum += propertyValue;
                            tmpPropertyObj[propertyNames[k]] += propertyValue;
                        }
                    }
                }

                if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                    var tmpUniqVal = 0,
                        tmpUniqValCheck = 0,
                        tmpCheckVal = 0;

                    for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        propertyValue = tmp_x["u"];

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj["u"] = propertyValue;
                        } else {
                            propertySum += propertyValue;
                            tmpUniqVal += propertyValue;
                            tmpPropertyObj["u"] += propertyValue;
                        }
                    }

                    for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        tmpCheckVal = tmp_x["u"];

                        if (typeof tmpCheckVal !== 'string') {
                            propertySum += tmpCheckVal;
                            tmpUniqValCheck += tmpCheckVal;
                            tmpPropertyObj["u"] += tmpCheckVal;
                        }
                    }

                    if (tmpUniqVal > tmpUniqValCheck) {
                        tmpPropertyObj["u"] = tmpUniqValCheck;
                    }
                }

                //if (propertySum > 0)
                {
                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj;
                    tableCounter++;
                }
            }
        }

        if (propertyNames.indexOf("t") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["t"]
            });
        } else if (propertyNames.indexOf("c") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["c"]
            });
        }

        for (var i = 0; i < tableData.length; i++) {
            if (underscore.isEmpty(tableData[i])) {
                tableData[i] = null;
            }
        }

        return {"chartData":underscore.compact(tableData)};
    };

    // Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
    countlyCommon.extractBarData = function (db, rangeArray, clearFunction) {

        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            {
                name:"range",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" }
        ]);

        var rangeNames = underscore.pluck(rangeData.chartData, 'range'),
            rangeTotal = underscore.pluck(rangeData.chartData, 't'),
            barData = [],
            sum = 0,
            maxItems = 3,
            totalPercent = 0;

        rangeTotal.sort(function (a, b) {
            if (Math.floor(a) <  Math.floor(b)) return 1;
            if (Math.floor(b) <  Math.floor(a)) return -1;
            return 0;
        });

        if (rangeNames.length < maxItems) {
            maxItems = rangeNames.length;
        }

        for (var i = 0; i < maxItems; i++) {
            sum += rangeTotal[i];
        }

        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((rangeTotal[i] / sum) * 100);
            totalPercent += percent;

            if (i == (maxItems - 1)) {
                percent += 100 - totalPercent;
            }

            barData[i] = { "name":rangeNames[i], "percent":percent };
        }

        return underscore.sortBy(barData, function(obj) { return -obj.percent; });
    };

    // Shortens the given number by adding K (thousand) or M (million) postfix.
    // K is added only if the number is bigger than 10000.
    countlyCommon.getShortNumber = function (number) {

        var tmpNumber = "";

        if (number >= 1000000 || number <= -1000000) {
            tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
        } else if (number >= 10000 || number <= -10000) {
            tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
        } else {
            number += "";
            tmpNumber = number.replace(".0", "");
        }

        return tmpNumber;
    };

    // Function for getting the date range shown on the dashboard like 1 Aug - 30 Aug.
    // countlyCommon.periodObj holds a dateString property which holds the date format.
    countlyCommon.getDateRange = function () {

        countlyCommon.periodObj = getPeriodObj();

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            if (countlyCommon.periodObj.dateString == "HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");

                var nowMin = _currMoment.format("mm");
                formattedDateEnd.add(nowMin, "minutes");

            } else if (countlyCommon.periodObj.dateString == "D MMM, HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes");
            } else {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
            }
        } else {
            formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
            formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D");
        }

        return formattedDateStart.format(countlyCommon.periodObj.dateString) + " - " + formattedDateEnd.format(countlyCommon.periodObj.dateString);
    };

    // Private Methods

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    //printLog = console.log;
    function checkAll(from, to) {
        if (from>to) {
            var tmp = to;
            to = from;
            from = tmp;
        }
        var fromMoment = moment(from);
        var toMoment = moment(to);
        var fromDate = moment(from).format();
        var toDate = moment(to).format();
        var fromY = parseInt(moment(from).format("YYYY"));
        var toY = parseInt(moment(to).format("YYYY"));
        var fromM = parseInt(moment(from).format("MM"));
        var toM = parseInt(moment(to).format("MM"));
        var fromD = parseInt(moment(from).format("DD"));
        var toD = parseInt(moment(to).format("DD"));
        var fromH = parseInt(moment(from).format("HH"));
        var toH = parseInt(moment(to).format("HH"));
        var arr = [];
        //printLog("Year "+fromDate);
        //printLog("Year "+toDate);
        ////printLog(fromY+" "+fromM+" "+fromD+" "+fromH);
        ////printLog(toY+" "+toM+" "+toD+" "+toH);
        ////printLog(fromMoment.isBefore("2012-11-01"));
        for (var i=fromY;i<=toY;i++) {
            if ((fromMoment.valueOf() <= moment(i+"-01-01").valueOf()) && 
                (toMoment.valueOf() >= moment(i+"-12-31").valueOf())) {
                //printLog(i+" is full year");
                arr.push(i.toString());
            } else if ((toMoment.valueOf() >= moment(i+"-12-31").valueOf())) {
                //printLog(i+" after 1/1, check month, week, day");
                ////printLog("from:"+fromMoment.valueOf()+" to:"+moment(i+"-12-31").valueOf());
                var tmpArr = checkMonth(fromMoment.valueOf(), moment(i+"-12-31").valueOf());
                arr.push.apply(arr, tmpArr);
            } else if ((fromMoment.valueOf() <= moment(i+"-01-01").valueOf())){
                //printLog(i+" before 12/31, check month, week, day");
                var tmpArr = checkMonth(moment(i+"-01-01").valueOf(), toMoment.valueOf());
                arr.push.apply(arr, tmpArr);
            } else {
                //printLog(i+" this year , check month, week, day");
                var tmpArr = checkMonth(fromMoment.valueOf(), toMoment.valueOf());
                arr.push.apply(arr, tmpArr);
            }
        }
        arr.sort();
        //printLog(arr);
        return arr;
    }

    function pad2(number) {
        return (number < 10 ? '0' : '') + number
    }

    function checkMonth(from, to) {
        if (from>to) {
            var tmp = to;
            to = from;
            from = tmp;
        }
        var fromMoment = moment(from);
        var toMoment = moment(to);
        var fromDate = moment(from).format();
        var toDate = moment(to).format();
        var fromY = parseInt(moment(from).format("YYYY"));
        var toY = parseInt(moment(to).format("YYYY"));
        var fromM = parseInt(moment(from).format("MM"));
        var toM = parseInt(moment(to).format("MM"));
        var fromD = parseInt(moment(from).format("DD"));
        var toD = parseInt(moment(to).format("DD"));
        var fromH = parseInt(moment(from).format("HH"));
        var toH = parseInt(moment(to).format("HH"));
        var endofM = [0,31,28,31,30,31,30,31,31,30,31,30,31];
        var arr = [];
        var arrM = [];
        var regex = /\d{4}.\d{1,2}.\d{1,2}/;
        if (fromMoment.isLeapYear()) {
            endofM[2]=29;
        }
        //printLog("Month "+fromDate);
        //printLog("Month "+toDate);
        //printLog(fromY+" "+fromM+" "+fromD+" "+fromH);
        //printLog(toY+" "+toM+" "+toD+" "+toH);
        for (var i=fromM;i<=toM;i++) {
            if ((fromMoment.valueOf() <= moment(fromY+"-"+pad2(i)+"-01").valueOf()) && 
                (toMoment.valueOf() >= moment(toY+"-"+pad2(i)+"-"+endofM[i]).valueOf())) {
                //printLog(fromY+"-"+i+" is full month");
                arr.push(fromY+"."+i);
            } else if ((toMoment.valueOf() >= moment(toY+"-"+pad2(i)+"-"+endofM[i]).valueOf())) {
                //printLog("after "+fromY+"-"+pad2(i)+"-1 check week, day");
                ////printLog("from:"+fromMoment.valueOf()+" to:"+moment(fromY+"-"+pad2(i)+"-"+endofM[i]).valueOf());
                var tmpArr = checkWeek(fromMoment.valueOf(), moment(fromY+"-"+pad2(i)+"-"+endofM[i]).valueOf());
                for (var j=0;j<tmpArr.length;j++) {
                    if (!regex.test(tmpArr[j])) {
                        arr.push(tmpArr[j]);
                        //printLog(tmpArr[j]);
                    } else {
                        arrM.push(tmpArr[j]);
                    }
                }
                //arrM.push.apply(arrM, tmpArr);
            } else if ((fromMoment.valueOf() <= moment(fromY+"-"+pad2(i)+"-01").valueOf())){
                //printLog("before "+toY+"-"+pad2(i)+"-"+endofM[i]+" check week, day");
                ////printLog("from:"+moment(fromY+"-"+pad2(i)+"-01").valueOf()+" to:"+toMoment.valueOf());
                var tmpArr = checkWeek(moment(fromY+"-"+pad2(i)+"-01").valueOf(), toMoment.valueOf());
                for (var j=0;j<tmpArr.length;j++) {
                    if (!regex.test(tmpArr[j])) {
                        arr.push(tmpArr[j]);
                        //printLog(tmpArr[j]);
                    } else {
                        arrM.push(tmpArr[j]);
                    }
                }
                //arrM.push.apply(arrM, tmpArr);
            } else {
                //printLog(fromY+"-"+i+" this month , check week, day");
                var tmpArr = checkWeek(fromMoment.valueOf(), toMoment.valueOf());
                for (var j=0;j<tmpArr.length;j++) {
                    if (!regex.test(tmpArr[j])) {
                        arr.push(tmpArr[j]);
                        //printLog(tmpArr[j]);
                    } else {
                        arrM.push(tmpArr[j]);
                    }
                }
                //arrM.push.apply(arrM, tmpArr);
            }
        }
        var wofy = new Array(54);
        for (var i=0;i<wofy.length;i++) {
            wofy[i] = new Array(2);
            wofy[i][0] = 0;
            wofy[i][1] = [];
        }
        for (var i=0;i<arrM.length;i++) {
            //printLog(arrM[i]);
            var tmpMoment = moment(arrM[i], "YYYY.M.D");
            var tmpW = Math.ceil(tmpMoment.format("DDD") / 7);
            //printLog(tmpW);
            var tmpArr = wofy[tmpW];
            tmpArr[0]++;
            tmpArr[1].push(arrM[i]);
        }
        ////printLog(wofy);
        for (var i=0;i<wofy.length;i++) {
            if (wofy[i][0] != 7) {
                for(var j=0;j<wofy[i][1].length;j++) {
                    arr.push(wofy[i][1][j]);
                }
            } else {
                arr.push(fromY+".w"+i);
            }
        }
        return arr;
    }

    function checkWeek(from, to) {
        if (from>to) {
            var tmp = to;
            to = from;
            from = tmp;
        }
        var fromMoment = moment(from);
        var toMoment = moment(to);
        var fromDate = moment(from).format();
        var toDate = moment(to).format();
        var fromY = parseInt(moment(from).format("YYYY"));
        var toY = parseInt(moment(to).format("YYYY"));
        var fromM = parseInt(moment(from).format("MM"));
        var toM = parseInt(moment(to).format("MM"));
        var fromD = parseInt(moment(from).format("DD"));
        var toD = parseInt(moment(to).format("DD"));
        var fromH = parseInt(moment(from).format("HH"));
        var toH = parseInt(moment(to).format("HH"));
        var fromW = parseInt(moment(from).format("w"));
        var toW = parseInt(moment(to).format("w"));
        fromW = Math.ceil(fromMoment.format("DDD") / 7);
        toW = Math.ceil(toMoment.format("DDD") / 7);
        var arr = [];
        //printLog("Month "+fromDate);
        //printLog("Month "+toDate);
        //printLog(fromY+" "+fromM+" "+fromD+" "+fromH+" w"+fromW);
        //printLog(toY+" "+toM+" "+toD+" "+toH+" w"+toW);
        
        //printLog("from w"+fromW);
        //printLog(fromMoment.format("DDD"));
        //printLog("to w"+toW);
        //printLog(toMoment.format("DDD"));
        //printLog("===================");
        if (fromW == toW) {
            if ((toMoment.format("DDD")-fromMoment.format("DDD") == 6)) {
                //printLog("w"+fromW+" is full week");
                arr.push(fromY+".w"+fromW);
            } else {
                for (var i=0;i<=(toMoment.format("DDD")-fromMoment.format("DDD"));i++) {
                    var tmpMoment = moment(fromMoment);
                    tmpMoment.add('days',i);
                    ////printLog(tmpMoment.format("YYYY.M.D"));
                    arr.push(tmpMoment.format("YYYY.M.D"));
                }
            }
            return arr;
        }
        // check fromW
        var fromMod = fromMoment.format("DDD") % 7;
        if (fromMod == 1) {
            //printLog("w"+fromW+" is full week");
            arr.push(fromY+".w"+fromW);
        } else {
            //printLog("from w"+fromW);
            //printLog(fromMod);
            for (var i=0;i<=((7-fromMod)%7);i++) {
                var tmpMoment = moment(fromMoment);
                tmpMoment.add('days',i);
                arr.push(tmpMoment.format("YYYY.M.D"));
                /*//printLog(fromY+"-"+fromM+"-"+(fromD+i));
                arr.push(fromY+"."+fromM+"."+(fromD+i));*/
            }
        }
        // check fromW+1 to toW-1
        for (var i=fromW+1;i<=toW-1;i++) {
            //printLog("w"+i+" is full week");
            arr.push(fromY+".w"+i);
        }
        // check toW
        var toMod = toMoment.format("DDD") % 7;
        if (toMod == 0) {
            //printLog("w"+toW+" is full week");
            arr.push(toY+".w"+toW);
        } else {
            //printLog("to w"+toW);
            //printLog(toMod);
            if (toMoment.isLeapYear()) {
                if (toMod==2 && toW==53) {
                    //printLog("w"+toW+" is the end week");
                    arr.push(toY+".w"+toW);
                    return arr;
                }
            } else {
                if (toMod==1 && toW==53) {
                    //printLog("w"+toW+" is the end week");
                    arr.push(toY+".w"+toW);
                    return arr;
                }
            }
            for (var i=0;i<toMod;i++) {
                var tmpMoment = moment(toMoment);
                tmpMoment.add('days',-i);
                arr.push(tmpMoment.format("YYYY.M.D"));
                /*//printLog(toY+"-"+toM+"-"+(toD-i));
                arr.push(toY+"."+toM+"."+(toD-i));*/
            }
        }
        return arr;
    }
    // Returns a period object used by all time related data calculation functions.
    function getPeriodObj() {
        var now = _currMoment,
            year = now.year(),
            month = (now.month() + 1),
            day = now.date(),
            hour = (now.hours()),
            activePeriod,
            previousPeriod,
            periodMax,
            periodMin,
            periodObj = {},
            isSpecialPeriod = false,
            daysInPeriod = 0,
            rangeEndDay = null,
            dateString,
            uniquePeriodsCheck = [],
            previousUniquePeriodsCheck = [],
            newPeriods = [];

        switch (_period) {
            case "month":
                activePeriod = year;
                previousPeriod = year - 1;
                periodMax = month;
                periodMin = 1;
                dateString = "MMM";
                break;
            case "day":
                activePeriod = year + "." + month;

                var previousDate = _currMoment.subtract(day, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                _currMoment.add(day, 'days');

                previousPeriod = previousYear + "." + previousMonth;
                periodMax = day;
                periodMin = 1;
                dateString = "D MMM";
                break;
            case "hour":
                activePeriod = year + "." + month + "." + day;
                var previousDate = _currMoment.subtract(1, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                _currMoment.add(1, 'days');

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = hour;
                periodMin = 0;
                dateString = "HH:mm";
                break;
            case "7days":
                daysInPeriod = 7;
                break;
            case "30days":
                daysInPeriod = 30;
                break;
            case "60days":
                daysInPeriod = 60;
                break;
            case "90days":
                daysInPeriod = 90;
                break;
            default:
                break;
        }

        // Check whether period object is array
        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {

            // One day is selected from the datepicker
            if (_period[0] == _period[1]) {
                var selectedDate = moment(_period[0]),
                    selectedYear = selectedDate.year(),
                    selectedMonth = (selectedDate.month() + 1),
                    selectedDay = selectedDate.date(),
                    selectedHour = (selectedDate.hours());

                activePeriod = selectedYear + "." + selectedMonth + "." + selectedDay;

                var previousDate = selectedDate.subtract(1, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
            } else {
                var a = moment(_period[0]),
                    b = moment(_period[1]);

                daysInPeriod = b.diff(a, 'days') + 1;
                rangeEndDay = _period[1];
                var tmpArr = checkAll(a.valueOf(), b.valueOf());
                newPeriods.push.apply(newPeriods, tmpArr);
            }
        }

        if (daysInPeriod != 0) {
            var yearChanged = false,
                currentYear = 0,
                currWeeksArr = [],
                currWeekCounts = {},
                currMonthsArr = [],
                currMonthCounts = {},
                currPeriodArr = [],
                prevWeeksArr = [],
                prevWeekCounts = {},
                prevMonthsArr = [],
                prevMonthCounts = {},
                prevPeriodArr = [];

            for (var i = (daysInPeriod - 1); i > -1; i--) {

                var currTime = new Date();
                currTime.setTimezone(_appTimezone);

                var currTime2 = new Date();
                currTime2.setTimezone(_appTimezone);

                var momentOne = moment(currTime),
                    momentTwo = moment(currTime2);

                var currIndex = (!rangeEndDay) ? momentOne.subtract(i, 'days') : moment(rangeEndDay).subtract(i, 'days'),
                    currIndexYear = currIndex.year(),
                    prevIndex = (!rangeEndDay) ? momentTwo.subtract((daysInPeriod + i), 'days') : moment(rangeEndDay).subtract((daysInPeriod + i), 'days'),
                    prevYear = prevIndex.year();

                if (i != (daysInPeriod - 1) && currentYear != currIndexYear) {
                    yearChanged = true;
                }
                currentYear = currIndexYear;

                // Current period variables

                var currWeek = currentYear + "." + "w" + Math.ceil(currIndex.format("DDD") / 7);
                currWeeksArr[currWeeksArr.length] = currWeek;
                currWeekCounts[currWeek] = (currWeekCounts[currWeek]) ? (currWeekCounts[currWeek] + 1) : 1;

                var currMonth = currIndex.format("YYYY.M");
                currMonthsArr[currMonthsArr.length] = currMonth;
                currMonthCounts[currMonth] = (currMonthCounts[currMonth]) ? (currMonthCounts[currMonth] + 1) : 1;

                currPeriodArr[currPeriodArr.length] = currIndex.format("YYYY.M.D");

                // Previous period variables

                var prevWeek = prevYear + "." + "w" + Math.ceil(prevIndex.format("DDD") / 7);
                prevWeeksArr[prevWeeksArr.length] = prevWeek;
                prevWeekCounts[prevWeek] = (prevWeekCounts[prevWeek]) ? (prevWeekCounts[prevWeek] + 1) : 1;

                var prevMonth = prevIndex.format("YYYY.M");
                prevMonthsArr[prevMonthsArr.length] = prevMonth;
                prevMonthCounts[prevMonth] = (prevMonthCounts[prevMonth]) ? (prevMonthCounts[prevMonth] + 1) : 1;

                prevPeriodArr[prevPeriodArr.length] = prevIndex.format("YYYY.M.D");
            }

            dateString = (yearChanged) ? "D MMM, YYYY" : "D MMM";
            isSpecialPeriod = true;
        }

        periodObj = {
            "newPeriods":newPeriods,
            "activePeriod":activePeriod,
            "periodMax":periodMax,
            "periodMin":periodMin,
            "previousPeriod":previousPeriod,
            "currentPeriodArr":currPeriodArr,
            "previousPeriodArr":prevPeriodArr,
            "isSpecialPeriod":isSpecialPeriod,
            "dateString":dateString,
            "daysInPeriod":daysInPeriod,
            "uniquePeriodArr":getUniqArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts, currPeriodArr),
            "uniquePeriodCheckArr":getUniqCheckArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts),
            "previousUniquePeriodArr":getUniqArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts, prevPeriodArr),
            "previousUniquePeriodCheckArr":getUniqCheckArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts)
        };

        return periodObj;
    }

    function getUniqArray(weeksArray, weekCounts, monthsArray, monthCounts, periodArr) {

        if (_period == "month" || _period == "day" || _period == "hour") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts),
            periodArr = clone(periodArr);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1,
            rejectedWeeks = [],
            rejectedWeekDayCounts = {};

        for (var key in weekCounts) {

            // If this is the current week we can use it
            if (key === _currMoment.format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 7) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (_currMoment.format("YYYY.M") === key) {
                    tmpDaysInMonth = _currMoment.format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < tmpDaysInMonth) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0 || (rejectedWeeks.indexOf(weeksArray[i]) != -1)) {
                    uniquePeriods[i] = periodArr[i];
                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
                uniquePeriods[i] = monthsArray[i];

                if (rejectedWeekDayCounts[weeksArray[i]]) {
                    rejectedWeekDayCounts[weeksArray[i]].count++;
                } else {
                    rejectedWeekDayCounts[weeksArray[i]] = {
                        count:1,
                        index:i
                    };
                }
            }
        }

        var totalWeekCounts = underscore.countBy(weeksArray, function (per) {
            return per;
        });

        for (var weekDayCount in rejectedWeekDayCounts) {

            // If the whole week is rejected continue
            if (rejectedWeekDayCounts[weekDayCount].count == 7) {
                continue;
            }

            // If its the current week continue
            if (_currMoment.format("YYYY.\\w w").replace(" ", "") == weekDayCount && totalWeekCounts[weekDayCount] == rejectedWeekDayCounts[weekDayCount].count) {
                continue;
            }

            // If only some part of the week is rejected we should add back daily buckets

            var startIndex = rejectedWeekDayCounts[weekDayCount].index - (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count),
                limit = startIndex + (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count);

            for (var i = startIndex; i < limit; i++) {
                // If there isn't already a monthly bucket for that day
                if (monthsArray[i] == 0) {
                    uniquePeriods[i] = periodArr[i];
                }
            }
        }

        rejectedWeeks = underscore.uniq(rejectedWeeks);
        uniquePeriods = underscore.uniq(underscore.difference(uniquePeriods, rejectedWeeks));

        return uniquePeriods;
    }

    function getUniqCheckArray(weeksArray, weekCounts, monthsArray, monthCounts) {

        if (_period == "month" || _period == "day" || _period == "hour") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1;

        for (var key in weekCounts) {
            if (key === _currMoment.format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 1) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (_currMoment.format("YYYY.M") === key) {
                    tmpDaysInMonth = _currMoment.format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < (tmpDaysInMonth * 0.5)) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0) {

                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                uniquePeriods[i] = monthsArray[i];
            }
        }

        uniquePeriods = underscore.uniq(uniquePeriods);

        return uniquePeriods;
    }

    function clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;

        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
    }

}(countlyCommon));

module.exports = countlyCommon;
