#!/bin/bash

path="/usr/local/countly/api"
gzipPath="/mnt/mongodb/tmp/mongo_gzip/"
gzipPath="/mem/mongo_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_backup/"
exportPath="/mem/mongo_backup/"
s3Path="/mnt/mongodb/tmp/s3_data/"
s3Path="/s3mnt/db_backup/hourly_data/"
mongo="localhost:27017"
batchdb=""
indexNum="1"

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
	cd ${path}
	## get current timestamp
	curTimestamp=$(date +%s)
	echo -e ${curTimestamp}
	curTimestamp=$(date -d "-5 minutes" +%s)
	echo -e ${curTimestamp}

	## get the first db name
	cmd="node getRawFinished.js ${curTimestamp}"
	echo -e ${cmd}
	string=`${cmd}`
	#echo -e ${string}
	batchdb=${string}
	echo -e ${batchdb}

	## get rawdata file name
	cmd="node getRawFileName.js ${curTimestamp}"
	echo -e ${cmd}
	string=`${cmd}`
	#echo -e ${string}
	rawdate=${string}"_"${indexNum}
	echo -e ${rawdate}

	## check if no data in db
	if [ "${batchdb}" == "" ]; then
		echo -e "no data sleep 10 minutes ...."
		sleep 600
		continue
	else
		cd $exportPath

		cmd="mongodump -h ${mongo} -db ${batchdb} -o ${exportPath}${rawdate}"
		echo $cmd
		$cmd

		echo $PWD
		cmd="/bin/tar czf ${gzipPath}${rawdate}.tgz ./"
		echo $cmd
		$cmd
		cmd="/bin/rm ./${rawdate} -rf"
		echo $cmd
		$cmd

		cmd="/bin/cp ${gzipPath}${rawdate}.tgz ${s3Path}"
		echo $cmd
		$cmd
		cmd="/bin/rm ${gzipPath}${rawdate}.tgz"
		echo $cmd
		$cmd

		cd ${path}

		cmd="node removeRawFinished.js ${batchdb}"
		echo -e ${cmd}
		string=`${cmd}`
		echo -e ${string}
	fi
	sleep 60
done
