#!/bin/bash

cd ${path}

## created index
cmd="node hourlyCreateEventIndex.js ${batchdb}"
echo -e ${cmd} 2>&1 >> $one_time_log 
string=`${cmd}`
#echo -e ${string}
rawdate=${string}"_"${indexNum}
echo -e ${rawdate} 2>&1 >> $one_time_log

cmd="node updateHourlyBeginEvent.js ${batchdb}"
echo -e ${cmd} 2>&1 >> $one_time_log 
string=`${cmd}`
echo -e ${string} 2>&1 >> $one_time_log 
echo -e "${batchdb} update [begin] time in event_finished"

cmd="node --max-old-space-size=6144 hourlyEventNewBatch.js ${batchdb}"
echo -e ${cmd} 2>&1 >> $one_time_log 
${cmd} 2>&1 >> $one_time_log
echo -e "process ${batchdb} event finished"

cmd="node updateHourlyEndEvent.js ${batchdb}"
echo -e ${cmd} 2>&1 >> $one_time_log 
string=`${cmd}`
echo -e ${string} 2>&1 >> $one_time_log 
echo -e "${batchdb} update [end] time in event_finished"

cmd="node removeEventFinished.js ${batchdb}"
echo -e ${cmd} 2>&1 >> $one_time_log 
string=`${cmd}`
echo -e ${string} 2>&1 >> $one_time_log 
echo -e "${batchdb} remove from backup_finished"