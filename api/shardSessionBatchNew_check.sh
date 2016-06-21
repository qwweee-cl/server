#!/bin/bash

. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[ShardNew]${header} Loop Session Batch Error Please check log ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[ShardNew][Wrong]${header} ${start_date} ${start_round} Session Error Trap(${pid})" ${mail_target}
	#rm -f ${LOCKFILE}
	exit 1
}

function backupDashboard() {
	if [ "${indexNum}" == "1" ]; then
		cd $working_dir
		## update backup status 1
		cmd="node shardUpdateBackupStatus.js 1"
		echo ${cmd} 2>&1 >> ${one_day_log}
		$cmd
		## call backup script
		cmd="${working_dir}/shardBackupDashboardDB.sh"
		echo ${cmd} 2>&1 >> ${one_day_log}
#		$cmd
		#cmd="${working_dir}/backupDashboardDB.sh"
		#echo $cmd
		#$cmd

		## update backup status 0
		cmd="node shardUpdateBackupStatus.js 0"
		echo ${cmd} 2>&1 >> ${one_day_log}
		$cmd
	fi
}
function checkLoopStop() {
	loopFile="/tmp/shardStopSessionFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "Loop Session Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[ShardNew]${header} ${start_date} ${start_round} Session Batch Stop" ${mail_target}
		exit 0
	fi
}
function createIndex() {
	echo -e "create index is in createShardKey"
#	cmd="node shardCreateIndex.js ${batchdb} ${appType}"
#	echo -e ${cmd} 2>&1 >> $one_day_log 
#	string=`${cmd}`
#	#echo -e ${string}
#	rawdate=${string}"_"${indexNum}
#	echo -e ${rawdate} 2>&1 >> $one_day_log
}
function getBackupFinished() {
	cmd="node shardGetBackupFinished.js ${curTimestamp} ${appType}"
	echo -e ${cmd} 2>&1 >> "$one_day_log"
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> "$one_day_log"
}
function getFutureTimestamp() {
	cmd="node transferRound.js ${start_date} ${start_round}"
	echo -e ${cmd} 2>&1 >> "$one_day_log"
	string=`${cmd}`
	#echo -e ${string}
	futureTimestamp=${string}
	echo -e ${futureTimestamp} 2>&1 >> "$one_day_log"
}
function restoreDataFromS3ToLocal() {
	cd ${working_dir}
	cmd="./shardToLocalMongodbNew.sh ${start_date} ${start_round} ${batchdb} ${indexNum}"
	echo -e ${cmd} 2>&1 >> "$one_day_log"
	${cmd} 2>&1 >> "$one_day_log"
}
function sendSummaryMail() {
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[ShardNew]${header} ${start_date} ${start_round} Session Summary" ${mail_target}
}
function sendWrongMail1() {
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[ShardNew][Wrong DB][Session]${header} ${start_date} ${start_round}" ${mail_target}
}
function sendWrongMail2() {
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[ShardNew][Wrong S3][Session]${header} ${start_date} ${start_round}" ${mail_target}
}

log_path="/usr/local/countly/log/shardSession"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
one_day_log="$log_path/new_log_session_$(date +%Y%m%d).log"

gzipPath="/mem/mongo_shard_dashboard_gzip/"
exportPath="/mem/mongo_shard_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/dashboard_data/"
rawSession="/mem/tmp/RawSession/"
batchdb=""
futureTimestamp=$(date +%s)

s3Path="/s3mnt/shard_backup/hourly_data/"

cmds3DashboardPath="/s3mnt/shard_backup/dashboard_data/"
cmds3Path="s3://clcom2-countly/shard_backup/hourly_data/"
###### session-test
s3Path="/s3mnt/test_backup/hourly_data/"
cmds3DashboardPath="/s3mnt/test_backup/dashboard_data/"
cmds3Path="s3://clcom2-countly/test_backup/hourly_data/"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
backupTime="0900"
afterbackupTime="1200"
sleepTime=10800 # this is for clad2
currBackup=$(date +%j)
## backup dashboard need end

cd $working_dir

T="$(date +%s)"

interval=$((6*3600));
round_num=$(((24*60*60) / 10#$interval))
start_date=""
small_date=""
start_round=""
start_time=""
end_time=""

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:20150101) (start round:0~3)"
  exit 1
else
  appType=${1}
  start_date=$(date -d "$2" +%Y%m%d)
#  start_date=$(date -d "${start_date}" +%Y%m%d)
  small_date=$(date -d "${start_date}" +%m%d)
  start_round=$(printf "%02d" $3)	
fi

if [ "${appType}" == "1" ]; then
  header="YCP+YMK"
  LOCKFILE="/tmp/shardNewSessionBatch1.pid"
  mainLogFile="/usr/local/countly/log/shardSessionMain1.log"
  mongo="config1:27017"
  indexNum="1"
  theOther="2"
  pid=`cat ${LOCKFILE}`
elif [ "${appType}" == "2" ]; then
  header="PF"
  LOCKFILE="/tmp/shardNewSessionBatch2.pid"
  mainLogFile="/usr/local/countly/log/shardSessionMain2.log"
  mongo="config1:27017"
  indexNum="2"
  theOther="1"
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

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

curdate=$(date +%Y%m%d-%H%M)

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi
if [ ! -d "${rawSession}" ]; then
	echo "mkdir ${rawSession}"
	mkdir ${rawSession}
fi


while true;
do
	one_day_log="$log_path/new_log_session_$(date +%Y%m%d).log"

	savedate=$(date +%Y%m%d)
	dashboarddate=${savedate}"_countly"
	curdate=$(date +%Y%m%d-%H%M)
## check backup dashboard time
	checkTime=$(date +%H%M)
	checkDate=$(date +%j)

	if [ -f "$one_day_log" ]; then
		echo "" >> "$one_day_log"
	else
		echo "Loop start: $(date +%Y-%m-%d)" > "$one_day_log"
	fi

## check stop file
	checkLoopStop

	start_time=$((10#$(date -d "-6 hours" +%H)*3600+10#$(date -d "-6 hours" +%M)*60+10#$(date -d "-6 hours" +%S)))
	cur_round=$(printf "%02d" $((10#$start_time/10#$interval)))
	old_data="0"

## for session2 to check backup
	if [ "${indexNum}" == "2" ]; then
		echo -e "Session2 to check backup status"
		echo -e "Session2 to check backup status" >> "$one_day_log" 2>&1
		sleep 605
		cd $working_dir
		cmd="node shardGetBackupStatus.js"
		echo -e ${cmd}
		echo -e ${cmd} >> "$one_day_log" 2>&1
		backupStatus=`${cmd}`

		echo -e "${backupStatus}"
		while [ "${backupStatus}" == "1" ]
		do
			cmd="node shardGetBackupStatus.js"
			echo -e ${cmd}
			echo -e ${cmd} >> "$one_day_log" 2>&1
			backupStatus=`${cmd}`
			echo -e "Session2 wait for backup finished (600 seconds)"
			echo -e "Session2 wait for backup finished (600 seconds)" >> "$one_day_log" 2>&1
			sleep 600
			## check stop file
			checkLoopStop

			echo -e "backupStatus: ${backupStatus}"
			echo -e "backupStatus: ${backupStatus}" >> "$one_day_log" 2>&1
		done
		echo -e "do process session script"
	fi

## for session1 to check session2 process session finished
	if [ "${indexNum}" == "1" ]; then
		echo -e "Session1 to check session2 status"
		echo -e "Session2 to check session2 status" >> "$one_day_log" 2>&1
		cd $working_dir
		if [[ ${currBackup} != ${checkDate} ]] && [[ ${checkTime} > ${backupTime} ]]; then
			cmd="node shardGetSession1Status.js"
			echo -e ${cmd}
			echo -e ${cmd} >> "$one_day_log" 2>&1
			session1Status=`${cmd}`

			cmd="node shardGetSession2Status.js"
			echo -e ${cmd}
			echo -e ${cmd} >> "$one_day_log" 2>&1
			session2Status=`${cmd}`

			echo -e "Session1: ${session1Status}"
			echo -e "Session2: ${session2Status}"
			while [ "${session2Status}" == "1" ]
			do
				echo -e "do wait for Session2 process finished(60 seconds)"
				echo -e "do wait for Session2 process finished(60 seconds)" >> "$one_day_log" 2>&1
				sleep 60

				cmd="node shardGetSession1Status.js"
				echo -e ${cmd}
				echo -e ${cmd} >> "$one_day_log" 2>&1
				session1Status=`${cmd}`

				cmd="node shardGetSession2Status.js"
				echo -e ${cmd}
				echo -e ${cmd} >> "$one_day_log" 2>&1
				session2Status=`${cmd}`

				echo -e "Session1: ${session1Status}"
				echo -e "Session2: ${session2Status}"
			done

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

#	if [[ ${checkTime} > ${beforeBackupTime} ]] && [[ ${checkTime} < ${backupTime} ]]; then
#		echo -e "waiting for backup start"
#		sleep 600
#		continue
#	else
#		if [[ ${currBackup} != ${checkDate} ]] && [[ ${checkTime} > ${backupTime} ]]; then
#			echo -e "[backup]backup start"
## call backup function
#			backupDashboard
## call backup function end
#			echo -e "[backup]backup end"
#			currBackup=$(date +%j)
#		else
#			echo -e "do next job, continue process session"
#			sleep 601
#		fi
#	fi
## check stop file
	checkLoopStop
## process session
	curdate=$(date +%Y%m%d-%H%M)
	one_day_log="$log_path/new_log_session_$(date +%Y%m%d).log"

	cd ${working_dir}

	echo -e "Process $start_date, round:$start_round, old_data:$old_data" >> "$one_day_log" 2>&1
	echo -e "Start Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "$one_day_log" 2>&1

	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log" 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log"


	## get the first backup finished db name
	getBackupFinished

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> "$one_day_log" 
		sleep 602
		continue
	else
## check process round and s3 files
		sleep 603
		echo -e ${start_date}
		filedate=$(date -d "${start_date}" +%Y%m%d)
		echo -e ${filedate}
		echo -e ${small_date}
		echo -e ${start_round}
		s3File1=${s3Path}${filedate}"_raw_${start_round}_1.tgz"
		s3File2=${s3Path}${filedate}"_raw_${start_round}_2.tgz"
		s3File3=${s3Path}${filedate}"_raw_${start_round}_3.tgz"
		cmds3File1=${cmds3Path}${filedate}"_raw_${start_round}_1.tgz"
		cmds3File2=${cmds3Path}${filedate}"_raw_${start_round}_2.tgz"
		cmds3File3=${cmds3Path}${filedate}"_raw_${start_round}_3.tgz"
		fileExist=true
		echo -e ${s3File1}
		echo -e ${s3File2}
		echo -e ${s3File3}

		if [ "${batchdb}" != "countly_raw${small_date}_${start_round}" ]; then
			echo -e "${header} could be process session countly_raw${small_date}_${start_round} not ${batchdb}" 2>&1 >> "$one_day_log"
			sendWrongMail1
			exit 1
		fi

		existFile1=`aws s3 ls ${cmds3File1} | wc -l`
		existFile2=`aws s3 ls ${cmds3File2} | wc -l`
		existFile3=`aws s3 ls ${cmds3File3} | wc -l`

		duFile1=`aws s3 ls ${cmds3File1} | awk '{ print $3 }'`
		duFile2=`aws s3 ls ${cmds3File2} | awk '{ print $3 }'`
		duFile3=`aws s3 ls ${cmds3File3} | awk '{ print $3 }'`


		if [ ${existFile1} == "0" ] || [ ${existFile2} == "0" ] || [ ${existFile3} == "0" ]; then
			echo "${s3File1} or ${s3File2} or ${s3File3} file not exist" >> ${one_day_log}
			fileExist=false
		fi

		if [ -z ${duFile1} ] || [ -z ${duFile2} ] || [ -z ${duFile3} ]; then
			echo "${s3File1} or ${s3File2} or ${s3File3} file size is 0" >> ${one_day_log}
			fileExist=false
		fi

		echo -e ${fileExist}

		if [ ${fileExist} = false ]; then
			echo "${s3File1} or ${s3File2} or ${s3File3} s3 file not exist" >> ${one_day_log}
			sendWrongMail2
			exit 1
		fi

		cd ${working_dir}

		## created index
		#createIndex

		## set session status true
		cmd="node shardUpdateSessionStatus.js ${appType} 1 ${batchdb}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		${cmd}

		cmd="node shardUpdateSessionBegin.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log" 
		echo -e "${batchdb} update [begin] time in session_finished"

		#cmd="node --max-old-space-size=6144 hourlySessionNewBatch.js ${batchdb}"
		#echo -e ${cmd} 2>&1 >> $one_day_log 
		#${cmd} 2>&1 >> $one_day_log
		#echo -e "process ${batchdb} session finished".
## reget future timestamp
		futureTimestamp=$(date +%s)
## get Future Timestamp (start_date & start_round)
		getFutureTimestamp

		restoreDataFromS3ToLocal

		cmd="python sessionMT_v2.py ${batchdb} ${header} ${futureTimestamp}"
		echo -e ${cmd} 2>&1 >> "$one_day_log"
		${cmd} 2>&1 >> "$one_day_log"
		echo -e "process ${batchdb} ${header} session finished"

		cmd="node shardUpdateSessionEnd.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log"
		echo -e "${batchdb} update [end] time in session_finished"

		cmd="node shardRemoveBackupFinished.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log"
		echo -e "${batchdb} remove from backup_finished"

		## set session status false
		cmd="node shardUpdateSessionStatus.js ${appType} 0 ${batchdb}"
		echo -e ${cmd} 2>&1 >> "$one_day_log"
		${cmd}

## update process finished round to mysql
		
	fi

	echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "$one_day_log" 2>&1

#	if [ "${indexNum}" == "1" ]; then
## check backup finish or not?
#		cmd="node shardFindSessionFinished.js ${batchdb} ${theOther}"
#		echo -e ${cmd} 2>&1 >> ${one_time_log}
#		string=`${cmd}`
#		while [ "${string}" == "null" ]; do
#		    echo -e "sleep 60 seconds"
#		    echo -e "sleep 60 seconds" >> ${one_time_log}
#		    sleep 60
#		    cmd="node shardFindSessionFinished.js ${batchdb} ${theOther}"
#		    echo -e ${cmd} 2>&1 >> ${one_time_log}
#		    string=`${cmd}`
#		    checkLoopStop
#		done
### process mongodb to mysql in claddb
#	cmd="ssh ubuntu@claddb2 /usr/local/countly/api/shardRunMongoToMysql.sh ${start_date} ${start_round} >> /usr/local/countly/log/mongoToMysql.log"
#	echo $cmd
#	$cmd 2>&1
#	fi

#	## cp Prediction files to s3
#	cd ${working_dir}
#	cmd="./shardPredictionRename.sh"
#	echo -e ${cmd} 2>&1 >> $one_day_log 
#	${cmd}
	## do other scripts
	cd ${working_dir}
	echo -e "Call Others batch script shardLoopSessionOthers.sh ${batchdb} ${indexNum} ${start_date} ${start_round}"
	${working_dir}/shardLoopSessionOthers.sh ${batchdb} ${indexNum} ${start_date} ${start_round} >> "$one_day_log" 2>&1

	## send summary mail
	sendSummaryMail

	while true;
	do
		cmd="node shardGetSessionDateRound.js"
		echo -e ${cmd} 2>&1 >> "$one_day_log"
		string=`${cmd}`
		#echo -e ${string}
		dateRound=${string}
		echo -e "${dateRound} : ${start_date}_${start_round}" 2>&1 >> "$one_day_log"

		if [ "${dateRound}" != "${start_date}_${start_round}" ]; then
			echo -e "no data sleep 10 minutes ...." 2>&1 >> "$one_day_log" 
			sleep 605
			continue
		else
			echo -e "${start_date}_${start_round} finished, do next" 2>&1 >> "$one_day_log"
			break
		fi
	done

	if [ "$start_round" == "03" ] && [ "$old_data" == "0" ]; then
		echo "Loop end: $(date +%Y-%m-%d)" >> "$one_day_log"
		#/usr/bin/mail -s "Hourly Computation Summary ($start_date)" $mail_target < $one_day_log
	fi

	#go next round
	start_round=$(printf "%02d" $((10#$start_round + 1)))	
	if [ $((10#$start_round)) -ge $(($round_num)) ]; then
		start_round="00"
		start_date=$(date -d "$start_date 1 days" +%Y%m%d)
		small_date=$(date -d "${start_date}" +%m%d)
		## rm Prediction files
		cd ${working_dir}
		cmd="rm *.txt"
		echo -e ${cmd} 2>&1 >> "$one_day_log"
		${cmd}
	fi

	end_time=$(date +%s)
	next_start_time=$(date -d "$start_date" +%s)
	next_start_time=$((10#$next_start_time + ((10#$start_round+1) * 10#$interval)))
	sleep_time=$((10#$next_start_time - 10#$end_time))

	#wait for next round
	if [ $sleep_time -ge 0 ]; then
		echo -e "Sleep $sleep_time seconds" >> "$one_day_log"
		sleep $sleep_time
	fi
done