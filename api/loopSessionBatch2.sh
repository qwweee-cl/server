#!/bin/bash

pid=`cat /tmp/loopSessionBatch2.pid`

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[hourly]Countly Batch Error Please check log /usr/local/countly/log/loopSessionMain2.log" 
	$(tail -20 /usr/local/countly/log/loopSessionMain2.log)\
	| mail -s "[hourly]Slave Countly Batch Error Trap(${pid})" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	exit 1
}

logpath="/usr/local/countly/log/loopSession/"

path="/usr/local/countly/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
exportPath="/mem/mongo_hourly_dashboard_backup/"
s3Path="/mnt/mongodb/tmp/s3_data/"
s3Path="/s3mnt/db_backup/hourly_data/dashboard_data/"
CachePath="/mem/tmp/s3cache/clcom2-countly/db_backup/hourly_data/dashboard_data/"
batchdb=""
indexNum="2"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

path="/usr/local/countly/api"

curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_log.log"

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi
if [ ! -d "${s3Path}" ]; then
	echo "mkdir ${s3Path}"
	mkdir ${s3Path}
fi

for ((;1;)); do
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

		cmd="node hourlySessionNewBatch.js ${batchdb}"
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
	sleep 60
done

exit 0

cd $exportPath

cmd="mongodump -h ${mongo} -db ${batchdb} -o ${exportPath}${rawdate}"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 

echo $PWD
cmd="/bin/tar czf ${gzipPath}${rawdate}.tgz ./"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 
cmd="/bin/rm ./${rawdate} -rf"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 

cmd="/bin/cp ${gzipPath}${rawdate}.tgz ${s3Path}${rawdate}.tmp"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 
cmd="/bin/rm ${gzipPath}${rawdate}.tgz"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 
cmd="/bin/mv ${s3Path}${rawdate}.tmp ${s3Path}${rawdate}.tgz"
echo $cmd 2>&1 >> $one_time_log 
$cmd 2>&1 >> $one_time_log 

cmd="sudo rm ${CachePath} -rf"
echo $cmd
$cmd
