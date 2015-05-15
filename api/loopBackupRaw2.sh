#!/bin/bash

pid=`cat /tmp/loopBackupRaw2.pid`

logpath="/usr/local/countly/log/"

path="/usr/local/countly/api"
gzipPath="/mnt/mongodb/tmp/mongo_gzip/"
gzipPath="/mem/mongo_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_backup/"
exportPath="/mem/mongo_backup/"
s3Path="/mnt/mongodb/tmp/s3_data/"
s3Path="/s3mnt/db_backup/hourly_data/"
mongo="localhost:27017"
batchdb=""
indexNum="2"
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
	echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp} 2>&1 >> $one_time_log 

	## get the first db name
	cmd="node getRawFinished.js ${curTimestamp}"
	echo -e ${cmd} 2>&1 >> $one_time_log 
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb} 2>&1 >> $one_time_log 

	## get rawdata file name
	cmd="node getRawFileName.js ${curTimestamp}"
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

		cmd="node removeRawFinished.js ${batchdb}"
		echo -e ${cmd} 2>&1 >> $one_time_log 
		string=`${cmd}`
		echo -e ${string} 2>&1 >> $one_time_log 
	fi
	echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	sleep 60
done
