#!/bin/bash

. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "[Shard OEM]${oemName} Loop Session Batch Error Please check log ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[Shard OEM]${oemName} ${start_date} ${start_round} Session Error Trap(${pid})" ${mail_target}
	#rm -f ${LOCKFILE}
	exit 1
}

function backupDashboard() {
	if [ "${indexNum}" == "1" ]; then
		cd $working_dir
		## update backup status 1
		cmd="node shardUpdateBackupStatusByOEM.js 1"
		echo ${cmd} 2>&1 >> ${one_day_log}
		$cmd
		## call backup script
		cmd="${working_dir}/shardBackupDashboardDBByOEM.sh"
		echo ${cmd} 2>&1 >> ${one_day_log}
		$cmd

		## update backup status 0
		cmd="node shardUpdateBackupStatusByOEM.js 0"
		echo ${cmd} 2>&1 >> ${one_day_log}
		$cmd
	fi
}
function checkLoopStop() {
	loopFile="/tmp/shardStopOEMSessionFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "Loop Session Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Shard OEM]${oemName} ${start_date} ${start_round} Session Batch Stop" ${mail_target}
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
	oemName="${1}"
	cmd="node shardGetBackupFinishedByOEM.js ${curTimestamp} ${appType} ${oemName}"
	echo -e ${cmd} 2>&1 >> "$one_day_log"
	string=`${cmd}`
	echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> "$one_day_log"
}
function sendSummaryMail() {
	oemName="${1}"
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard OEM]${oemName} ${start_date} ${start_round} Session Summary" ${mail_target}
}
function sendWrongMail1() {
	oemName="${1}"
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard OEM][Wrong DB][Session]${oemName} ${start_date} ${start_round}" ${Gary}
}
function sendWrongMail2() {
	oemName="${1}"
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard OEM][Wrong S3][Session]${oemName} ${start_date} ${start_round}" ${Gary}
}
function sendWrongMail3() {
	oemName="${1}"
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard OEM][next OEMs round][Session]${oemName} ${start_date} ${start_round}" ${Gary}
}

log_path="/usr/local/countly/log/shardOEMSession"
working_dir="/usr/local/countly/api_oem"
mail_target=${AWSM}
one_day_log="$log_path/log_oem_session_$(date +%Y%m%d).log"

gzipPath="/mem/oem_mongo_shard_dashboard_gzip/"
exportPath="/mem/oem_mongo_shard_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/OEM/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/OEM/dashboard_data/"
rawSession="/mem/tmp/RawSession/"
batchdb=""

s3Path="/s3mnt/shard_backup/oem_hourly_data/"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
backupTime="1000"
afterbackupTime="1200"
sleepTime=10800 # this is for clad2
currBackup=$(date +%j)
## backup dashboard need end

cd $working_dir

T="$(date +%s)"

interval=$((6*3600));
interval=$((24*3600));
round_num=$(((24*60*60) / 10#$interval))
start_date=""
small_date=""
start_round=""
start_time=""
end_time=""

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:2015-01-01) (start round:0~3)"
  exit 1
else
  appType=${1}
  start_date=$(date -d "$2" +%Y-%m-%d)
  small_date=$(date -d "${start_date}" +%m%d)
  start_round=$(printf "%02d" $3)	
fi

if [ "${appType}" == "1" ]; then
  header="OEM"
  LOCKFILE="/tmp/shardSessionBatchOEM.pid"
  mainLogFile="/usr/local/countly/log/shardSessionOEMMain1.log"
  mongo="config1:27017"
  indexNum="1"
  theOther="2"
  pid=`cat ${LOCKFILE}`
elif [ "${appType}" == "2" ]; then
  header="OEM"
  LOCKFILE="/tmp/shardSessionBatchOEM.pid"
  mainLogFile="/usr/local/countly/log/shardSessionOEMMain1.log"
  mongo="config1:27017"
  indexNum="2"
  theOther="1"
  pid=`cat ${LOCKFILE}`
else
  echo -e "wrong paramater (1 = shard1, 2 = shard2)"
  exit 1
fi

header="OEM"
LOCKFILE="/tmp/shardSessionBatchOEM.pid"
mainLogFile="/usr/local/countly/log/shardSessionOEMMain1.log"
mongo="config2:27017"
indexNum="1"
theOther="2"
pid=`cat ${LOCKFILE}`

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
if [ ! -d "${s3DashboardPath}" ]; then
	echo "mkdir ${s3DashboardPath}"
	mkdir ${s3DashboardPath}
fi


while true;
do
	one_day_log="$log_path/log_oem_session_$(date +%Y%m%d).log"

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
#	if [ "${indexNum}" == "2" ]; then
#		echo -e "Session2 to check backup status"
#		echo -e "Session2 to check backup status" >> "$one_day_log" 2>&1
#		cd $working_dir
#		cmd="node shardGetBackupStatus.js"
#		echo -e ${cmd}
#		echo -e ${cmd} >> "$one_day_log" 2>&1
#		backupStatus=`${cmd}`

#		echo -e "${backupStatus}"
#		while [ "${backupStatus}" == "1" ]
#		do
#			cmd="node shardGetBackupStatus.js"
#			echo -e ${cmd}
#			echo -e ${cmd} >> "$one_day_log" 2>&1
#			backupStatus=`${cmd}`
#			echo -e "Session2 wait for backup finished (600 seconds)"
#			echo -e "Session2 wait for backup finished (600 seconds)" >> "$one_day_log" 2>&1
#			sleep 600
			## check stop file
#			checkLoopStop

#			echo -e "backupStatus: ${backupStatus}"
#			echo -e "backupStatus: ${backupStatus}" >> "$one_day_log" 2>&1
#		done
#		echo -e "do process session script"
#	fi

## for session1 to check session2 process session finished
	if [ "${indexNum}" == "1" ]; then
#		echo -e "Session1 to check session2 status"
#		echo -e "Session2 to check session2 status" >> "$one_day_log" 2>&1
		cd $working_dir
		if [[ ${currBackup} != ${checkDate} ]] && [[ ${checkTime} > ${backupTime} ]]; then
#			cmd="node shardGetSession1Status.js"
#			echo -e ${cmd}
#			echo -e ${cmd} >> "$one_day_log" 2>&1
#			session1Status=`${cmd}`

#			cmd="node shardGetSession2Status.js"
#			echo -e ${cmd}
#			echo -e ${cmd} >> "$one_day_log" 2>&1
#			session2Status=`${cmd}`

#			echo -e "Session1: ${session1Status}"
#			echo -e "Session2: ${session2Status}"
#			while [ "${session2Status}" == "1" ]
#			do
#				echo -e "do wait for Session2 process finished(60 seconds)"
#				echo -e "do wait for Session2 process finished(60 seconds)" >> "$one_day_log" 2>&1
#				sleep 60

#				cmd="node shardGetSession1Status.js"
#				echo -e ${cmd}
#				echo -e ${cmd} >> "$one_day_log" 2>&1
#				session1Status=`${cmd}`

#				cmd="node shardGetSession2Status.js"
#				echo -e ${cmd}
#				echo -e ${cmd} >> "$one_day_log" 2>&1
#				session2Status=`${cmd}`

#				echo -e "Session1: ${session1Status}"
#				echo -e "Session2: ${session2Status}"
#			done

			echo -e "[backup]backup start"
## call backup function
			backupDashboard
## call backup function end
			echo -e "[backup]backup end"
			currBackup=$(date +%j)
		else
			echo -e "do next job, continue process session"
			sleep 61
		fi
	fi

## check stop file
	checkLoopStop
## process session
	curdate=$(date +%Y%m%d-%H%M)
	one_day_log="$log_path/log_oem_session_$(date +%Y%m%d).log"

	cd ${working_dir}

	echo -e "Process $start_date, round:$start_round, old_data:$old_data" >> "$one_day_log" 2>&1
	echo -e "Start Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "$one_day_log" 2>&1

	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log" 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log"

## do for to get oem name

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"
totaloems=${#apps[@]}
dosession=0
processArray=()
processIndex=0

while(true) do
	checkLoopStop
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log" 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> "$one_day_log"
for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
	oemName="${apps[${i}]}"

	## get the first backup finished db name
	getBackupFinished ${oemName}

## wait for get finished backup data
#	if [ "${oemName}" == "Tencent" ]; then
#		dosession=$(($dosession+1))
#		continue
#	fi
#	if [ "${oemName}" == "360" ]; then
#		dosession=$(($dosession+1))
#		continue
#	fi
#	if [ "${oemName}" == "Huawei" ]; then
#		dosession=$(($dosession+1))
#		continue
#	fi
#	if [ "${oemName}" == "XiaoMi" ]; then
#		dosession=$(($dosession+1))
#		continue
#	fi
#	if [ "${oemName}" == "BaiduStore" ]; then
#		dosession=$(($dosession+1))
#		continue
#	fi
	if [ "${oemName}" == "PPAndroid" ]; then
		dosession=$(($dosession+1))
		continue
	fi
	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> "$one_day_log" 
		sleep 602
		processArray[${processIndex}]=${oemName}
		processIndex=$(($processIndex+1))
		continue
	else
## check process round and s3 files
		
		echo -e ${start_date}
		filedate=$(date -d "${start_date}" +%Y%m%d)
		echo -e ${filedate}
		echo -e ${small_date}
		echo -e ${start_round}
		s3OEMFile=${s3Path}${filedate}"_${oemName}_${start_round}.tgz"
		fileExist=true
		echo -e ${s3OEMFile}

		if [ "${batchdb}" != "oem_${oemName}_raw${small_date}_${start_round}" ]; then
			echo -e "${oemName} could be process session oem_${oemName}_raw${small_date}_${start_round} not ${batchdb}" 2>&1 >> "$one_day_log"
			sendWrongMail1 ${oemName}
			exit 1
		fi

		if [ ! -f ${s3OEMFile} ]; then
			echo "${s3OEMFile} file not exist" >> ${one_day_log}
			fileExist=false
		fi

		if [ ! -s ${s3OEMFile} ]; then
			echo "${s3OEMFile} file size is 0" >> ${one_day_log}
			fileExist=false
		fi

		echo -e ${fileExist}

		if [ ${fileExist} = false ]; then
			echo "${s3OEMFile} s3 file not exist" >> ${one_day_log}
			sendWrongMail2 ${oemName}
			exit 1
		fi

		cd ${working_dir}

		## created index
		#createIndex

		## set session status true
		cmd="node shardUpdateSessionStatusByOEM.js ${oemName} 1 ${batchdb}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		${cmd}

		cmd="node shardUpdateSessionBeginByOEM.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log" 
		echo -e "${batchdb} update [begin] time in session_oem_finished"

		#cmd="node --max-old-space-size=6144 hourlySessionNewBatch.js ${batchdb}"
		#echo -e ${cmd} 2>&1 >> $one_day_log 
		#${cmd} 2>&1 >> $one_day_log
		#echo -e "process ${batchdb} session finished"

		#cmd="python sessionMT_v2.py ${batchdb} ${header}"
		#echo -e ${cmd} 2>&1 >> "$one_day_log"
		#${cmd} 2>&1 >> "$one_day_log"
		#echo -e "process ${batchdb} ${header} session finished"

		cmd="node --max-old-space-size=6144 shardNewBatchByOEM.js ${oemName} ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_day_log 
		${cmd} 2>&1 >> $one_day_log
		echo -e "[${oemName}]process ${batchdb} session finished"

		cmd="node shardUpdateSessionEndByOEM.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log"
		echo -e "${batchdb} update [end] time in session_oem_finished"

		cmd="node shardRemoveBackupFinishedByOEM.js ${batchdb} ${appType}"
		echo -e ${cmd} 2>&1 >> "$one_day_log" 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> "$one_day_log"
		echo -e "${batchdb} remove from backup_oem_finished"

		## set session status false
		cmd="node shardUpdateSessionStatusByOEM.js ${oemName} 0 ${batchdb}"
		echo -e ${cmd} 2>&1 >> "$one_day_log"
		${cmd}

## update process finished round to mysql
		
	fi

	echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "$one_day_log" 2>&1

#	if [ "${indexNum}" == "1" ]; then
## process mongodb to mysql in claddb
#		cmd="ssh ubuntu@claddb2 /usr/local/countly/api/shardRunMongoToMysql.sh >> /usr/local/countly/log/mongoToMysql.log"
#		echo $cmd
#		$cmd 2>&1 &
#	fi

	## do other scripts
	cd ${working_dir}
	echo -e "Call Others batch script shardLoopSessionOthersByOEM.sh ${batchdb} ${indexNum}"
	${working_dir}/shardLoopSessionOthersByOEM.sh ${batchdb} ${indexNum} >> "$one_day_log" 2>&1

	## send summary mail
	sendSummaryMail ${oemName}
	dosession=$(($dosession+1))
done
	if [ ${dosession} == ${totaloems} ]; then
		echo -e "next oems round(1)"
		echo -e "next oems round(1)" >> "$one_day_log"
		sendWrongMail3 ${oemName}
		break
	fi
	apps=("${processArray[@]}")
	if [ ${#apps[@]} == "0" ]; then
		echo -e "next oems round(2)"
		echo -e "next oems round(2)" >> "$one_day_log"
		sendWrongMail3 ${oemName}
		break;
	fi
done

if [ ${dosession} == ${totaloems} ]; then
	if [ "$start_round" == "00" ] && [ "$old_data" == "0" ]; then
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
#		cmd="rm *.txt"
#		echo -e ${cmd} 2>&1 >> "$one_day_log"
#		${cmd}
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
fi

done
