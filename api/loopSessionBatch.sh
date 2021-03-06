#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/loopSessionBatch1.pid"
pid=`cat ${LOCKFILE}`

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[hourly]Main Loop Session Batch Error Please check log /usr/local/countly/log/loopSessionMain1.log"\
	$(tail -20 /usr/local/countly/log/loopSessionMain1.log)\
	| mail -s "[hourly]Main Loop Session Batch Error Trap(${pid})" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
}

function backupDashboard() {
	cd $path
	cmd="${path}/backupDashboardDB.sh"
	echo $cmd
	$cmd
}
function checkLoopStop() {
	loopFile="/tmp/loopStopFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "Loop Session Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Hourly] Main Loop Session Batch Stop" ${AWSM}
		exit 0
	fi
}
function backupDashboard_old() {
## this is for test
	dashboarddb="countly_test"
	dashboard="cladtest:27017"
## this is for test end

	dashboarddb="countly"
	dashboard="claddb:27017"

	savedate=$(date +%Y%m%d)
	dashboarddate=${savedate}"_countly"

## echo backup start time
	echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

	cd $path
	backupDate=$(date +%Y%m%d-%H%M)
	cmd="node cladBackupStatus.js"
	echo -e ${cmd}
	string=`${cmd}`
#	echo -e ${string}
	cladStatus=$string

	cmd="node clad2BackupStatus.js"
	echo -e ${cmd}
	string=`${cmd}`
#	echo -e ${string}
	clad2Status=${string}

	echo -e "backupDate  : ${backupDate}" >> $one_time_log
	echo -e "cladStatus  : ${cladStatus}" >> $one_time_log
	echo -e "clad2Status : ${clad2Status}" >> $one_time_log

## save dashboard backup begin
	cmd="node updateDashBackupBegin.js ${backupDate} ${cladStatus} ${clad2Status}"
	echo -e ${cmd}
	string=`${cmd}`
	echo -e ${string}

## process dashboard backup
cd $exportPath
## backup countly dashboard data
## dump countly dashboard data
cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$dashboarddate"
echo $cmd
$cmd
## zip backup file
cd $exportPath
echo $PWD
cmd="/bin/tar czf $gzipPath$dashboarddate.tgz ./"
echo $cmd
$cmd
cmd="/bin/rm ./$dashboarddate -rf"
echo $cmd
$cmd
## move dashboard zip file to s3
if [ ! -d "$s3DashboardPath" ]; then
	echo "mkdir $s3DashboardPath"
	mkdir $s3DashboardPath
fi
cmd="/bin/cp $gzipPath$dashboarddate.tgz $s3DashboardPath"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$dashboarddate.tgz"
echo $cmd
$cmd

cmd="sudo rm ${DashboardCachePath} -rf"
echo $cmd
$cmd

## save dashboard backup end
	cd $path
	cmd="node updateDashBackupEnd.js ${backupDate}"
	echo -e ${cmd}
	string=`${cmd}`
	echo -e ${string}

## echo backup stop time
	echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Hourly] Main1 Loop Backup Dashboard Summary" ${AWSM}
}

logpath="/usr/local/countly/log/loopSession/"

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
			sleep 600
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
	cmd="node getBackupFinished.js ${curTimestamp}"
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
		cd ${path}

		## created index
		cmd="node hourlyCreateIndex.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		#echo -e ${string}
		rawdate=${string}"_"${indexNum}
		echo -e ${rawdate} 2>&1 >> $one_time_log

		cmd="node updateHourlyBegin.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} update [begin] time in session_finished"

		cmd="node --max-old-space-size=6144 hourlySessionNewBatch.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		${cmd} 2>&1 >> $one_time_log
		echo -e "process ${batchdb} session finished"

		cmd="node updateHourlyEnd.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} update [end] time in session_finished"

		cmd="node removeBackupFinished.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${batchdb} remove from backup_finished"
	fi
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

	cd ${path}
	echo -e "Call Others batch script hourlyLoopSessionOthers1.sh ${batchdb} ${indexNum}"
	./hourlyLoopSessionOthers1.sh ${batchdb} ${indexNum} >> $one_time_log 2>&1

	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Hourly] Main1 Loop Process Session Summary" ${AWSM}
	sleep 60
done

exit 0
