#!/bin/bash

LOCKFILE="/tmp/loopEventBatch1.pid"
pid=`cat ${LOCKFILE}`

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[hourly]Main Loop Event Batch Error Please check log /usr/local/countly/log/loopEventMain1.log"\
	$(tail -20 /usr/local/countly/log/loopEventMain1.log)\
	| mail -s "[hourly]Main Loop Event Batch Error Trap(${pid})" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	#rm -f ${LOCKFILE}
	exit 1
}

function backupDashboard() {
#	cd $path
#	cmd="${path}/backupDashboardDB.sh"
#	echo $cmd
#	$cmd
	sleep 7200
}
function checkLoopStop() {
	loopFile="/tmp/loopEventStopFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "Loop Event Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Hourly] Main Loop Event Batch Stop" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
		exit 0
	fi
}
function processEvent() {
	cd ${path}

	cmd='${path}/processEventBatch.sh ${batchdb} ${indexNum} ${path} ${one_time_log}'
	echo -e ${cmd}
	${cmd}
}
function processEvent_old() {
	cd ${path}

	## created index
	cmd="node hourlyCreateEventIndex.js ${batchdb}"
	echo -e ${cmd} 2>&1 >> ${one_time_log}
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}"_"${indexNum}
	echo -e ${rawdate} 2>&1 >> ${one_time_log}

	cmd="node updateHourlyBeginEvent.js ${batchdb}"
	echo -e ${cmd} 2>&1 >> ${one_time_log} 
	string=`${cmd}`
	echo -e ${string} 2>&1 >> ${one_time_log} 
	echo -e "${batchdb} update [begin] time in event_finished"

	cmd="node --max-old-space-size=6144 hourlyEventNewBatch.js ${batchdb}"
	echo -e ${cmd} 2>&1 >> ${one_time_log} 
	${cmd} 2>&1 >> ${one_time_log}
	echo -e "process ${batchdb} event finished"

	cmd="node updateHourlyEndEvent.js ${batchdb}"
	echo -e ${cmd} 2>&1 >> ${one_time_log} 
	string=`${cmd}`
	echo -e ${string} 2>&1 >> ${one_time_log} 
	echo -e "${batchdb} update [end] time in event_finished"

	cmd="node removeEventFinished.js ${batchdb}"
	echo -e ${cmd} 2>&1 >> ${one_time_log} 
	string=`${cmd}`
	echo -e ${string} 2>&1 >> ${one_time_log} 
	echo -e "${batchdb} remove from backup_finished"
}

logpath="/usr/local/countly/log/loopEvent/"

## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
s3DashboardPath="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api"
gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/mem/mongo_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/db_backup/hourly_data/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/db_backup/hourly_data/dashboard_data/"
batchdb=""
indexNum="1"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

curdate=$(date +%Y%m%d)

one_time_log="${logpath}${curdate}_log.log"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
afterbackupTime="1200"
sleepTime=10800 # this is for clad2
currBackup=$(date +%j)
## backup dashboard need end

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi
if [ ! -d "${s3DashboardPath}" ]; then
	echo "mkdir ${s3DashboardPath}"
	mkdir ${s3DashboardPath}
fi

for ((;1;)); do
	savedate=$(date +%Y%m%d)
	dashboarddate=${savedate}"_countly"
	curdate=$(date +%Y%m%d)
	one_time_log="${logpath}${curdate}_log.log"
## check backup dashboard time
	checkTime=$(date +%H%M)
	checkDate=$(date +%j)
	if [[ ${checkTime} > ${beforeBackupTime} ]] && [[ ${checkTime} < ${backupTime} ]]; then
		echo -e "waiting for backup start"
		sleep 600
		continue
	else
		if [[ ${currBackup} != ${checkDate} ]] && [[ ${checkTime} > ${backupTime} ]]; then
			echo -e "[backup]backup start"
## call backup function
			backupDashboard
## call backup function end
			echo -e "[backup]backup end"
			currBackup=$(date +%j)
		else
			echo -e "do next job, continue process event"
			sleep 600
		fi
	fi
## check stop file
	checkLoopStop
## process Event
	curdate=$(date +%Y%m%d)
	one_time_log="${logpath}${curdate}_log.log"
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`."
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 

	## get the first Event finished db name
	cmd="node getEventFinished.js ${curTimestamp}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_time_log

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> $one_time_log 
		sleep 600
		continue
	else
		processEvent
	fi
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Hourly] Main1 Loop Process Event Summary" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	sleep 60
done

exit 0
