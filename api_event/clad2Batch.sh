#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Clad2 Countly Batch Error Please check log in clad2.cyberlink.com>/usr/local/countly/log/clad2_batch.log" $(tail -20 /usr/local/countly/log/clad2_batch.log)\
	| mail -s "Clad2 Countly Batch Error Trap" gary_huang@cyberlink.com,qwweee@gmail.com
	#sleep 1
	rm -f ${LOCKFILE}
	exit 1
}

if [ -z "$1" ]
then
    echo "No argument supplied"
    exit 1
fi

LOCKFILE="/tmp/Batchlock.lock"
if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "Clad2 Countly Batch already running, please manual run" $(date +%Y%m%d)\
	| mail -s "Clad2 Countly Batch Already running" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
	#sleep 1
	rm -f ${LOCKFILE}
	exit 1
else
	cmd="touch "${LOCKFILE}
	echo $cmd
	$cmd
fi

path="/usr/local/countly/api"
gzipPath="/mem/mongo_gzip/"
exportPath="/mem/mongo_backup/"
s3Path="/s3mnt/db_backup/clad2_raw/"
s3DashboardPath="/s3mnt/db_backup/dashboard_data/"
livefile="config.live.js"
batchfile="config.batch.js"
srcfile="config.js"
mongo="localhost:27017"
dashboard="claddb:27017"
remote="clad:27017"
remotedb=$1
batchdb=""
dashboarddb="countly"
curdate=$(date +%Y%m%d)
rawdate=$curdate"_raw"
dashboarddate=$curdate"_countly"
echo "==============================================================="
echo "================Clad2 Countly Batch Start======================"
start=$(date +%Y-%m-%d_%H-%M)
cd $path
echo $PWD
if [ ! -d "$exportPath" ]; then
	mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
	mkdir $gzipPath
fi

## switch empty file 
## cp next config to countly service
file="/usr/local/countly/api/switch_file.empty"
liveconf=0
if [ $1 = "countly_raw0" ]; then
	liveconf=0
	rm $file -rf
	echo "copy "$batchfile" to "$srcfile
	echo "db_raw : countly_raw1"
	echo "db_batch : countly_raw0"
	cp $batchfile $srcfile -a
	batchdb="countly_raw0"
#	remotedb="test_raw0"
else 
	if [ $1 = "countly_raw1" ]; then
		liveconf=1
		touch $file
		echo "copy "$livefile" to "$srcfile
		echo "db_raw : countly_raw0"
		echo "db_batch : countly_raw1"
		cp $livefile $srcfile -a
		batchdb="countly_raw1"
#		remotedb="test_raw0"
	else
		echo "error argument: $1"
		rm -f ${LOCKFILE}
		exit 1
	fi
fi
#remote="cat:27017"
#remotedb=$1
#s3Path="/s3mnt/db_backup/clad2_raw/"
#liveconf=0
#echo "db_raw : countly_raw1"
#echo "db_batch : countly_raw0"
#batchdb="test_raw0"
echo $remotedb

#path="/home/hadoop/countly_snow/api"
#batchdb="countly_raw_snow"
#dashboarddb="countly_snow"
#dashboard="192.168.4.18:27017"

#path="/home/hadoop/countly_snow/api"
#batchdb="countly_raw_snow"
#dashboarddb="countly_snow"
#dashboard="192.168.4.18:27017"

## stop countly-supervisor service
#cmd="sudo stop countly-supervisor"
#echo $cmd
#$cmd

#sleep 60

## stop nginx service
#cmd="sudo service nginx stop"
#echo $cmd
#$cmd

#sleep 10

## restart mongodb service
#cmd="sudo service mongodb restart"
#echo $cmd
#$cmd

#sleep 10

## start countly-supervisor service
#cmd="sudo start countly-supervisor"
cmd="sudo restart countly-supervisor"
echo $cmd
$cmd

#sleep 10

## start nginx service
#cmd="sudo service nginx start"
#echo $cmd
#$cmd

## sudo restart countly-supervisor
## backup raw data
## mongodump -h localhost:27017 -db countly -o ./20141002
cmd="mongodump -h $mongo -db $batchdb -o $exportPath$rawdate"
echo $cmd
$cmd

## restore db to remote db
## mongorestore -h cat:27017 -d test_raw0 /mem/mongo_backup/20150225_raw/countly_raw0/
cmd="mongorestore -h $remote -db $remotedb $exportPath$rawdate/$batchdb"
echo $cmd
$cmd

## zip backup file
cd $exportPath
echo $PWD
cmd="/bin/tar czf $gzipPath$rawdate.tgz ./"
echo $cmd
$cmd
cmd="/bin/rm ./$rawdate -rf"
echo $cmd
$cmd

if [ ! -d "$s3Path" ]; then
	echo "mkdir $s3Path"
	mkdir $s3Path
fi
cmd="/bin/cp $gzipPath$rawdate.tgz $s3Path"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$rawdate.tgz"
echo $cmd
$cmd

## remove raw data
## mongo test --eval "printjson(db.getCollectionNames())"
cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
echo $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Clad2 Countly Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/clad2_batch.log)\
| mail -s "[$curdate]Clad2 Countly Batch Finished" gary_huang@cyberlink.com,qwweee@gmail.com
## | mail -s "Clad2 Countly Batch Finished" gary_huang@cyberlink.com
rm -f ${LOCKFILE}
exit 0

## add index in database
cd $path
echo $PWD
cmd="/usr/bin/node $path/createIndex.js"
echo $cmd
$cmd
## run batch
cmd="/usr/bin/node $path/newBatch.js"
echo $cmd
$cmd

## run OEM batch
cmd="$path/runOEM.sh >> /usr/local/countly/log/oem_batch.log 2>&1"
echo $cmd
$cmd

## remove raw data ( move to end )
## mongo test --eval "printjson(db.getCollectionNames())"
#cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
#echo $cmd
#$cmd
## mongo -h $mongo --eval "db.dropDatabase();"
## move zip file to s3
if [ ! -d "$s3Path" ]; then
	echo "mkdir $s3Path"
	mkdir $s3Path
fi
cmd="/bin/cp $gzipPath$rawdate.tgz $s3Path"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$rawdate.tgz"
echo $cmd
$cmd

cd $path
echo $PWD
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

## remove raw data
## mongo test --eval "printjson(db.getCollectionNames())"
cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
echo $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Clad2 Countly Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/cron_batch.log)\
| mail -s "[$curdate]Clad2 Countly Batch Finished" gary_huang@cyberlink.com,qwweee@gmail.com
#sleep 1
rm -f ${LOCKFILE}