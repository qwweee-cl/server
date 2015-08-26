#!/bin/bash
. /usr/local/countly/api/maillist.sh
#LOCKFILE="/tmp/loopSessionBatch1.pid"
#pid=`cat ${LOCKFILE}`
trap 'error_exp'  ERR SIGINT SIGTERM

if [ -z "$1" ]
then
  echo -e "please add one paramater: 1 = YMK+YCP, 2 = PF"
  exit 1
else
  appType=${1}
fi
if [ "${appType}" == "1" ]; then
	header="YMK+YCP"
	LOCKFILE="/tmp/shardSessionBatch1.pid"
	mainLogFile="/usr/local/countly/log/shardSessionMain1.log"
	mongo="shard1-2:27017"
	indexNum="1"
	pid=`cat ${LOCKFILE}`
elif [ "${appType}" == "2" ]; then
	header="PF"
	LOCKFILE="/tmp/shardSessionBatch1.pid"
	mainLogFile="/usr/local/countly/log/shardSessionMain2.log"
	mongo="shard2-2:27017"
	indexNum="2"
	pid=`cat ${LOCKFILE}`
else
	echo -e "wrong paramater (1 = shard1, 2 = shard2)"
	exit 1
fi
echo -e ${header}
echo -e ${LOCKFILE}
echo -e ${mainLogFile}
echo -e ${mongo}
echo -e ${indexNum}
echo -e ${pid}

function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[Shard]${header} Loop Session Batch Error Please check log ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[Shard]${header} Loop Session Batch Error Trap(${pid})" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
}

function backupDashboard() {
	cd $path
	#cmd="${path}/backupDashboardDB.sh"
	#echo $cmd
	#$cmd
}
function checkLoopStop() {
	loopFile="/tmp/loopStopFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "Loop Session Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Shard]${header} Loop Session Batch Stop" ${AWSM}
		exit 0
	fi
}
function sendSummaryMail() {
	echo -e $(tail -20 ${one_time_log})\
	| mail -s "[Shard]${header} Loop Process Session Summary" ${AWSM}
}
function createIndex() {
	cmd="node shardCreateIndex.js ${batchdb} ${appType}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}"_"${indexNum}
	echo -e ${rawdate} 2>&1 >> $one_time_log
}
function getBackupFinished() {
	cmd="node shardGetBackupFinished.js ${curTimestamp} ${appType}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_time_log
}
logpath="/usr/local/countly/log/shardSession/"

## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
s3DashboardPath="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api"
gzipPath="/mem/mongo_shard_dashboard_gzip/"
exportPath="/mem/mongo_shard_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/dashboard_data/"
rawSession="/mem/tmp/RawSession/"
batchdb=""

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_log.log"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
backupTime="0800"
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
if [ ! -d "${rawSession}" ]; then
	echo "mkdir ${rawSession}"
	mkdir ${rawSession}
fi

for ((;1;)); do
	savedate=$(date +%Y%m%d)
	dashboarddate=${savedate}"_countly"
	curdate=$(date +%Y%m%d-%H%M)
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
			echo -e "do next job, continue process session"
			sleep 601
		fi
	fi
## check stop file
	checkLoopStop
## process session
	curdate=$(date +%Y%m%d-%H%M)
	one_time_log="${logpath}${curdate}_log.log"
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`."
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 

	## get the first backup finished db name
	getBackupFinished

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> $one_time_log 
		sleep 602
		continue
	else
		cd ${path}

		## created index
		createIndex

		cmd="node shardUpdateSessionBegin.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} update [begin] time in session_finished"

		#cmd="node --max-old-space-size=6144 hourlySessionNewBatch.js ${batchdb}"
		#echo -e ${cmd} 2>&1 >> $one_time_log 
		#${cmd} 2>&1 >> $one_time_log
		#echo -e "process ${batchdb} session finished"

		cmd="node shardUpdateSessionEnd.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} update [end] time in session_finished"

		cmd="node shardRemoveBackupFinished.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} remove from backup_finished"
	fi
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

	sendSummaryMail
	sleep 60
done

exit 0
