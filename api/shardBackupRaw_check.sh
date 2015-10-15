#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e "[Shard]${header} Loop Backup Batch error: ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[Shard]${header} ${start_date} ${start_round} Backup Error(${pid})" ${mail_target}
	#rm -f ${LOCKFILE}
	exit 1
}
function checkLoopStop() {
	loopFile="/tmp/shardStopBackupFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "[Shard]${header} Loop Backup Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Shard]${header} ${start_date} ${start_round} Backup Batch Stop" ${mail_target}
		exit 0
	fi
}
function sendSummaryMail() {
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard]${header} ${start_date} ${start_round} Backup Raw Summary" ${mail_target}
}

function sendWrongMail() {
	echo -e $(tail -20 ${one_day_log})\
	| mail -s "[Shard][Wrong][Backup]${header} ${start_date} ${start_round}" ${mail_target}
}

log_path="/usr/local/countly/log/shardBackup"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
one_day_log="$log_path/log_rawBackup_$(date +%Y%m%d).log"

cd $working_dir

T="$(date +%s)"

interval=$((6*3600));
round_num=$(((24*60*60) / 10#$interval))
start_date=""
start_round=""
start_time=""
end_time=""

gzipPath="/mem/mongo_shard_gzip/"
exportPath="/mem/mongo_shard_backup/"
s3Path="/s3mnt/shard_backup/hourly_data/"
CachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/hourly_data/"
s3FlagPath="/s3mnt/shard_backup/hourly_data_flag/"
CacheFlagPath="/mem/tmp/s3cache/clcom2-countly/shard_backup/hourly_data_flag/"
#mongo="localhost:27017"
batchdb=""
#indexNum="1"
curdate=$(date +%Y%m%d-%H%M)

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:2015-01-01) (start round:0~3)"
  exit 1
else
  appType=${1}
  start_date=$(date -d "$2" +%Y%m%d)
  small_date=$(date -d "${start_date}" +%m%d)
  start_round=$(printf "%02d" $3)
fi

if [ "${appType}" == "1" ]; then
	header="shard1"
	LOCKFILE="/tmp/shardBackupRaw1.pid"
	mainLogFile="/usr/local/countly/log/shardBackupMain1.log"
	mongo="shard1-2:27017"
	indexNum="1"
	pid=`cat ${LOCKFILE}`
elif [ "${appType}" == "2" ]; then
	header="shard2"
	LOCKFILE="/tmp/shardBackupRaw2.pid"
	mainLogFile="/usr/local/countly/log/shardBackupMain2.log"
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

if [ ! -d "$exportPath" ]; then
	mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
	mkdir $gzipPath
fi
if [ ! -d "$s3Path" ]; then
	echo "mkdir $s3Path"
	mkdir $s3Path
fi


while true;
do
	one_day_log="$log_path/log_rawBackup_$(date +%Y%m%d).log"

	curdate=$(date +%Y%m%d-%H%M)

	if [ -f "$one_day_log" ]; then
		echo "" >> $one_day_log
	else
		echo "Loop start: $(date +%Y-%m-%d)" > $one_day_log
	fi
	start_time=$((10#$(date -d "-6 hours" +%H)*3600+10#$(date -d "-6 hours" +%M)*60+10#$(date -d "-6 hours" +%S)))
	cur_round=$(printf "%02d" $((10#$start_time/10#$interval)))
	old_data="0"

	## check stop file
	checkLoopStop

	echo -e "Process $start_date, round:$start_round, old_data:$old_data" >> $one_day_log 2>&1
	echo -e "Start Time: $(date +%Y-%m-%d,%H:%M:%S)" >> $one_day_log 2>&1

	cd ${working_dir}

	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_day_log 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_day_log 

	## get the first db name
	cmd="node shardGetRawFinished.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_day_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_day_log 

	## get rawdata file name
	cmd="node shardGetRawFileName.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_day_log 
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}"_"${indexNum}
	echo -e ${rawdate} 2>&1 >> $one_day_log 

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> $one_day_log 
		## check stop file
		checkLoopStop
		sleep 600
		## check stop file
		checkLoopStop
		continue
	else
		## check process round and s3 files

		echo -e ${start_date}
		echo -e ${small_date}
		echo -e ${start_round}

		if [ "${batchdb}" != "countly_raw${small_date}_${start_round}" ]; then
			echo -e "${header} could be backup countly_raw${small_date}_${start_round} not ${batchdb}" 2>&1 >> $one_day_log
			sendWrongMail
			exit 1
		fi

		# wait for secondary sync
		echo -e "wait 10 mins for slave db sync......."
		echo -e "wait 10 mins for slave db sync......." 2>&1 >> $one_day_log
		sleep 601

		cd $exportPath

		cmd="mongodump -h ${mongo} -d ${batchdb} -o ${exportPath}${rawdate}"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 

		## touch flag file to s3FlagPath
		cmd="/bin/touch ${s3FlagPath}${rawdate}.tag"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log

		cmd="sudo rm ${CacheFlagPath} -rf"
		echo $cmd
		$cmd

		echo $PWD
		cmd="/bin/tar czf ${gzipPath}${rawdate}.tgz ./"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 
		cmd="/bin/rm ./${rawdate} -rf"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 

		cmd="/bin/cp ${gzipPath}${rawdate}.tgz ${s3Path}${rawdate}.tmp"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 
		cmd="/bin/rm ${gzipPath}${rawdate}.tgz"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 
		cmd="/bin/mv ${s3Path}${rawdate}.tmp ${s3Path}${rawdate}.tgz"
		echo $cmd 2>&1 >> $one_day_log 
		$cmd 2>&1 >> $one_day_log 

		cd ${working_dir}

		cmd="node shardRemoveRawFinished.js ${batchdb} ${indexNum}"
		echo -e ${cmd} 2>&1 >> $one_day_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_day_log 
		echo -e "${rawdate}.tgz has been backup"

		cmd="sudo rm ${CachePath} -rf"
		echo $cmd
		$cmd
	fi

	echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> $one_day_log 2>&1

	## send summary mail
	sendSummaryMail

	if [ "$start_round" == "03" ] && [ "$old_data" == "0" ]; then
		echo "Loop end: $(date +%Y-%m-%d)" >> $one_day_log
		#/usr/bin/mail -s "Hourly Computation Summary ($start_date)" $mail_target < $one_day_log
	fi

	#go next round
	start_round=$(printf "%02d" $((10#$start_round + 1)))
        echo -e "do start round ++ (${start_round})"
        echo -e "do start round ++ (${start_round})" >> $one_day_log
	if [ $((10#$start_round)) -ge $(($round_num)) ]; then
		start_round="00"
		start_date=$(date -d "$start_date 1 days" +%Y%m%d)
		small_date=$(date -d "${start_date}" +%m%d)
                echo -e "do start date ++ (${start_date})"
                echo -e "do start date ++ (${start_date})" >> $one_day_log
	fi

	end_time=$(date +%s)
	next_start_time=$(date -d "$start_date" +%s)
	next_start_time=$((10#$next_start_time + ((10#$start_round+1) * 10#$interval)))
	sleep_time=$((10#$next_start_time - 10#$end_time))
        echo -e "next round: ${start_date} ${start_round} ${small_date}"
        echo -e "next round: ${start_date} ${start_round} ${small_date}" >> $one_day_log

	#wait for next round
	if [ $sleep_time -ge 0 ]; then
		echo -e "Sleep $sleep_time seconds" >> $one_day_log
		sleep $sleep_time
		echo -e "wait for ${next_start_time} round ${start_round}"
		echo -e "wait for ${next_start_time} round ${start_round}" >> $one_day_log
		## check stop file
		checkLoopStop
	fi
done
