#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardBackupRaw1.pid"
trap 'error_exp'  ERR SIGINT SIGTERM

if [ -z "$1" ]
then
  echo -e "please add one paramater: 1 = shard1, 2 = shard2"
  exit 1
else
  appType=${1}
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

function error_exp
{
	echo -e "[Shard]${header} Loop Backup Batch error: ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[Shard]${header} Loop Backup Batch Error Trap(${pid})" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
}
function checkLoopStop() {
	loopFile="/tmp/shardStopBackupFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "[Shard]${header} Loop Backup Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Shard]${header} Loop Backup Batch Stop" ${AWSM}
		exit 0
	fi
}
function sendSummaryMail() {
	echo -e $(tail -20 ${mainLogFile})\
	| mail -s "[Shard]${header} Loop Backup Raw Log Summary" ${AWSM}
}
logpath="/usr/local/countly/log/shardBackup/"

## this is for test
gzipPath="/mnt/mongodb/tmp/mongo_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_backup/"
s3Path="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api"
gzipPath="/mem/mongo_shard_gzip/"
exportPath="/mem/mongo_shard_backup/"
s3Path="/s3mnt/shard_backup/hourly_data/"
CachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/hourly_data/"
#mongo="localhost:27017"
batchdb=""
#indexNum="1"
curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_log.log"

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

for ((;1;)); do
	curdate=$(date +%Y%m%d-%H%M)
	one_time_log="${logpath}${curdate}_log.log"
	## check stop file
	checkLoopStop
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`."
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 

	## get the first db name
	cmd="node shardGetRawFinished.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_time_log 

	# wait for secondary sync
	sleep 601

	## get rawdata file name
	cmd="node shardGetRawFileName.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}"_"${indexNum}
	echo -e ${rawdate} 2>&1 >> $one_time_log 

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...." 2>&1 >> $one_time_log 
		sleep 600
		continue
	else
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

		cd ${path}

		cmd="node shardRemoveRawFinished.js ${batchdb} ${indexNum}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
		echo -e "${rawdate}.tgz has been backup"

		cmd="sudo rm ${CachePath} -rf"
		echo $cmd
		$cmd
	fi
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`."
	## send summary mail
	sendSummaryMail
	
	sleep 60
done
