#!/bin/bash
. /usr/local/countly/api/maillist.sh
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
	LOCKFILE="/tmp/shardBackupOEMRaw1.pid"
	mainLogFile="/usr/local/countly/log/shardBackupOEMMain1.log"
	mongo="shard1-2:27017"
	indexNum="1"
	pid=`cat ${LOCKFILE}`
elif [ "${appType}" == "2" ]; then
	header="shard2"
	LOCKFILE="/tmp/shardBackupOEMRaw2.pid"
	mainLogFile="/usr/local/countly/log/shardBackupOEMMain2.log"
	mongo="shard2-2:27017"
	indexNum="2"
	pid=`cat ${LOCKFILE}`
else
	echo -e "wrong paramater (1 = shard1, 2 = shard2)"
	exit 1
fi

mongo="localhost:30000"
echo -e ${header}
echo -e ${LOCKFILE}
echo -e ${mainLogFile}
echo -e ${mongo}
echo -e ${indexNum}
echo -e ${pid}

function error_exp
{
	echo -e "[Shard OEM]${header} Loop Backup Batch error: ${mainLogFile}"\
	$(tail -20 ${mainLogFile})\
	| mail -s "[Wrong][Shard OEM]${header} Loop Backup Batch Error Trap(${pid})" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
}
function checkLoopStop() {
	loopFile="/tmp/shardStopBackupOEMFile"
	if [ -f "${loopFile}" ]; then
		echo "${loopFile} exist"
		echo -e "[Shard OEM]${header} Loop Backup Batch Stop on $(date +%Y%m%d-%H:%M)"\
		| mail -s "[Wrong][Shard OEM]${header} Loop Backup Batch Stop" ${AWSM}
		exit 0
	fi
}
function sendSummaryMail() {
	echo -e $(tail -20 ${one_time_log})\
	| mail -s "[Shard OEM]${header} Loop Backup Raw Log Summary" ${AWSM}
}
logpath="/usr/local/countly/log/shardBackup/"

## this is for test
gzipPath="/mnt/mongodb/tmp/mongo_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_backup/"
s3Path="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api_oem"
gzipPath="/mem/mongo_oem_shard_gzip/"
exportPath="/mem/mongo_oem_shard_backup/"
s3Path="/s3mnt/shard_backup/oem_hourly_data/"
CachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/oem_hourly_data/"

cmds3Path="s3://clcom2-countly/shard_backup/oem_hourly_data/"
#mongo="localhost:27017"
batchdb=""
#indexNum="1"
curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_oem_log.log"

if [ ! -d "$exportPath" ]; then
	mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
	mkdir $gzipPath
fi
#if [ ! -d "$s3Path" ]; then
#	echo "mkdir $s3Path"
#	mkdir $s3Path
#fi

for ((;1;)); do
	curdate=$(date +%Y%m%d-%H%M)
	one_time_log="${logpath}${curdate}_oem_log.log"
	## check stop file
	checkLoopStop
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`."
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 
	curTimestamp=$(date -d "-6 hours" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 

	## get the first db name
	cmd="node shardGetOEMRawFinished.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_time_log 

	## get rawdata file name
	cmd="node shardGetOEMRawFileName.js ${curTimestamp} ${indexNum}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}
	echo -e ${rawdate} 2>&1 >> $one_time_log 

	# wait for secondary sync
	echo -e "wait data sync sleep 30 minutes ...." 2>&1 >> $one_time_log 
	sleep 1801

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 30 minutes ...." 2>&1 >> $one_time_log 
		sleep 1800
		continue
	else
		cd $exportPath

		cmd="mongodump -h ${mongo} -d ${batchdb} -o ${exportPath}${rawdate}"
		echo $cmd 2>&1 >> $one_time_log 
		$cmd 2>&1 >> $one_time_log 

		echo $PWD

		cmd="/bin/tar czf ${gzipPath}${rawdate}.tgz ./"
		echo $cmd 2>&1 >> $one_time_log 
		$cmd 2>&1 >> $one_time_log 
		cmd="/bin/rm ./${rawdate} -rf"
		echo $cmd 2>&1 >> $one_time_log 
		$cmd 2>&1 >> $one_time_log 

		cmd="aws s3 mv ${gzipPath}${rawdate}.tgz ${cmds3Path}${rawdate}.tgz"
		echo $cmd 2>&1 >> $one_time_log 
		$cmd 2>&1 >> $one_time_log

#		cmd="/bin/cp ${gzipPath}${rawdate}.tgz ${s3Path}${rawdate}.tmp"
#		echo $cmd 2>&1 >> $one_time_log 
#		$cmd 2>&1 >> $one_time_log 
#		cmd="/bin/rm ${gzipPath}${rawdate}.tgz"
#		echo $cmd 2>&1 >> $one_time_log 
#		$cmd 2>&1 >> $one_time_log 
#		cmd="/bin/mv ${s3Path}${rawdate}.tmp ${s3Path}${rawdate}.tgz"
#		echo $cmd 2>&1 >> $one_time_log 
#		$cmd 2>&1 >> $one_time_log 

		cd ${path}

		cmd="node shardRemoveOEMRawFinished.js ${batchdb} ${indexNum}"
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
