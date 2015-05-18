#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Countly Batch Error Please check log in clad.cyberlink.com>/usr/local/countly/log/cron_batch.log" $(tail -20 /usr/local/countly/log/cron_batch.log)\
	| mail -s "Main Countly Batch Error Trap" gary_huang@cyberlink.com,qwweee@gmail.com
	#sleep 1
	rm -f ${LOCKFILE}
	exit 1
}

LOCKFILE="/tmp/Batchlock.lock"
if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "Countly Batch already running, please manual run" $(date +%Y%m%d)\
	| mail -s "Main Countly Batch Already running" gary_huang@cyberlink.com,qwweee@gmail.com
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
s3Path="/s3mnt/db_backup/raw_data/"
s3DashboardPath="/s3mnt/db_backup/dashboard_data/"

s3OEMPath="/s3mnt/db_backup/oem_raw_data/"
s3OEMDashboardPath="/s3mnt/db_backup/oem_dashboard_data/"
s3GenericDashboardPath="/s3mnt/db_backup/generic_dashboard_data/"

livefile="config.live.js"
batchfile="config.batch.js"
srcfile="config.js"
mongo="localhost:27017"
dashboard="claddb:27017"
batchdb=""
dashboarddb="countly"
curdate=$(date +%Y%m%d)
rawdate=$curdate"_raw_1"
dashboarddate=$curdate"_countly"
echo "==============================================================="
echo "======================Countly Batch Start======================"
start=$(date +%Y-%m-%d_%H-%M)
cd $path
echo $PWD
if [ ! -d "$exportPath" ]; then
	mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
	mkdir $gzipPath
fi

if [ ! -d "$s3OEMPath" ]; then
	echo "mkdir $s3OEMPath"
	mkdir $s3OEMPath
fi
if [ ! -d "$s3OEMDashboardPath" ]; then
	echo "mkdir $s3OEMDashboardPath"
	mkdir $s3OEMDashboardPath
fi
if [ ! -d "$s3GenericDashboardPath" ]; then
	echo "mkdir $s3GenericDashboardPath"
	mkdir $s3GenericDashboardPath
fi

## switch empty file 
## cp next config to countly service
file="/usr/local/countly/api/switch_file.empty"
liveconf=0
if [ -f "$file" ]; then
	liveconf=0
	rm $file -rf
	echo "copy "$batchfile" to "$srcfile
	echo "db_raw : countly_raw1"
	echo "db_batch : countly_raw0"
	cp $batchfile $srcfile -a
	batchdb="countly_raw0"
	batchtmpdb="countly_raw0"
	rawdb="countly_raw1"
else
	liveconf=1
	touch $file
	echo "copy "$livefile" to "$srcfile
	echo "db_raw : countly_raw0"
	echo "db_batch : countly_raw1"
	cp $livefile $srcfile -a
	batchdb="countly_raw1"
	batchtmpdb="countly_raw1"
	rawdb="countly_raw0"
fi

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


cd $path

cmd="node getBatchOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a raw_apps <<< "$string"

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

cmd="node getGeneric.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a generic <<< "$string"
echo -e $generic

## backup generic dashboard data
cd $path
echo $PWD
dashboarddb="$generic"
oemdashboarddate="generic_"$dashboarddate
## backup countly dashboard data
## dump countly dashboard data
cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$oemdashboarddate"
echo $cmd
$cmd
## zip backup file
cd $exportPath
echo $PWD
cmd="/bin/tar czf $gzipPath$oemdashboarddate.tgz ./"
echo $cmd
$cmd
cmd="/bin/rm ./$oemdashboarddate -rf"
echo $cmd
$cmd
## move dashboard zip file to s3
if [ ! -d "$s3GenericDashboardPath" ]; then
	echo "mkdir $s3GenericDashboardPath"
	mkdir $s3GenericDashboardPath$generic
fi
cmd="/bin/cp $gzipPath$oemdashboarddate.tgz $s3GenericDashboardPath"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$oemdashboarddate.tgz"
echo $cmd
$cmd

## backup raw data
for (( i = 0 ; i < ${#raw_apps[@]} ; i++ )) do
	echo $i" "${raw_apps[$i]}
	cd $path

	cmd="$s3OEMPath${apps[$i]}"
	if [ ! -d "$cmd" ]; then
		echo -e $cmd
		mkdir $cmd
	fi
	cmd="$s3OEMDashboardPath${apps[$i]}"
	if [ ! -d "$cmd" ]; then
		echo -e $cmd
		mkdir $cmd
	fi
	batchdb=${raw_apps[$i]}

	OEMrawdate=${apps[$i]}"_"$rawdate
	cmd="mongodump -h $mongo -db $batchdb -o $exportPath$OEMrawdate"
	echo $cmd
	$cmd
	## zip backup file
	cd $exportPath
	echo $PWD
	cmd="/bin/tar czf $gzipPath$OEMrawdate.tgz ./"
	echo $cmd
	$cmd
	cmd="/bin/rm ./$OEMrawdate -rf"
	echo $cmd
	$cmd
	## add index in database
	## run batch
	## move zip file to s3
	if [ ! -d "$s3OEMPath${apps[$i]}" ]; then
		echo "mkdir $s3OEMPath${apps[$i]}"
		mkdir $s3OEMPath${apps[$i]}
	fi
	cmd="/bin/cp $gzipPath$OEMrawdate.tgz $s3OEMPath${apps[$i]}"
	echo $cmd
	$cmd
	cmd="/bin/rm $gzipPath$OEMrawdate.tgz"
	echo $cmd
	$cmd

	cd $path
	echo $PWD
	dashboarddb="countly_${apps[$i]}"
	oemdashboarddate=${apps[$i]}"_"$dashboarddate
	## backup countly dashboard data
	## dump countly dashboard data
	cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$oemdashboarddate"
	echo $cmd
	$cmd
	## zip backup file
	cd $exportPath
	echo $PWD
	cmd="/bin/tar czf $gzipPath$oemdashboarddate.tgz ./"
	echo $cmd
	$cmd
	cmd="/bin/rm ./$oemdashboarddate -rf"
	echo $cmd
	$cmd
	## move dashboard zip file to s3
	if [ ! -d "$s3OEMDashboardPath${apps[$i]}" ]; then
		echo "mkdir $s3OEMDashboardPath${apps[$i]}"
		mkdir $s3OEMDashboardPath${apps[$i]}
	fi
	cmd="/bin/cp $gzipPath$oemdashboarddate.tgz $s3OEMDashboardPath${apps[$i]}"
	echo $cmd
	$cmd
	cmd="/bin/rm $gzipPath$oemdashboarddate.tgz"
	echo $cmd
	$cmd
	## remove raw data
	## mongo test --eval "printjson(db.getCollectionNames())"
done

batchdb=$batchtmpdb

cd $path
echo $PWD

## remove raw data
## mongo test --eval "printjson(db.getCollectionNames())"
cmd="/usr/bin/mongo $mongo/$rawdb --eval printjson(db.dropDatabase());"
echo $cmd
$cmd

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

## ssh to clad2 to run clad2Batch.sh
## ssh ubuntu@clad2 /usr/local/countly/api/clad2Batch.sh $batchdb >> /usr/local/countly/log/clad2_batch.log 2>&1
#cmd="ssh ubuntu@clad2 /usr/local/countly/api/clad2Batch.sh $batchdb >> /usr/local/countly/log/clad2_batch.log"
#echo $cmd
#$cmd

## ssh to clad2 to run clad2OEMBatch.sh
## ssh ubuntu@clad2 /usr/local/countly/api/clad2OEMBatch.sh >> /usr/local/countly/log/clad2_oem_batch.log 2>&1
#cmd="ssh ubuntu@clad2 /usr/local/countly/api/clad2OEMBatch.sh >> /usr/local/countly/log/clad2_oem_batch.log"
#echo $cmd
#$cmd

## ssh to clad2 to run slaveCountlyBatch.sh
## ssh ubuntu@clad2 /usr/local/countly/api/slaveCountlyBatch.sh $batchdb >> /usr/local/countly/log/slave_batch.log 2>&1
cmd="ssh ubuntu@clad2 /usr/local/countly/api/slaveCountlyBatch.sh $batchdb >> /usr/local/countly/log/slave_batch.log &"
echo $cmd
$cmd

## sudo restart countly-supervisor
## backup raw data
## mongodump -h localhost:27017 -db countly -o ./20141002
cmd="mongodump -h $mongo -db $batchdb -o $exportPath$rawdate"
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

curr=$(date +%Y-%m-%d_%H-%M)
echo "===== raw data cp to s3 end =>"$curr" ====="

## run OEM batch
#cmd="$path/runOEM.sh >> /usr/local/countly/log/oem_batch.log"
cmd="$path/mainRunOEM.sh $curdate"
echo $cmd
$cmd >> /usr/local/countly/log/oem_batch.log 2>&1

## add index in database
cd $path
echo $PWD
cmd="/usr/bin/node $path/createIndex.js"
echo $cmd
$cmd
## run batch
#cmd="/usr/bin/node --max-old-space-size=8192 $path/newBatch.js"
cmd="/usr/bin/node $path/sessionNewBatch.js"
echo $cmd
$cmd

## remove raw data ( move to end )
## mongo test --eval "printjson(db.getCollectionNames())"
#cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
#echo $cmd
#$cmd
## mongo -h $mongo --eval "db.dropDatabase();"
## move zip file to s3
#if [ ! -d "$s3Path" ]; then
#	echo "mkdir $s3Path"
#	mkdir $s3Path
#fi
#cmd="/bin/cp $gzipPath$rawdate.tgz $s3Path"
#echo $cmd
#$cmd
#cmd="/bin/rm $gzipPath$rawdate.tgz"
#echo $cmd
#$cmd

#cd $path
#echo $PWD
## backup countly dashboard data
## dump countly dashboard data
#cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$dashboarddate"
#echo $cmd
#$cmd
## zip backup file
#cd $exportPath
#echo $PWD
#cmd="/bin/tar czf $gzipPath$dashboarddate.tgz ./"
#echo $cmd
#$cmd
#cmd="/bin/rm ./$dashboarddate -rf"
#echo $cmd
#$cmd
## move dashboard zip file to s3
#if [ ! -d "$s3DashboardPath" ]; then
#	echo "mkdir $s3DashboardPath"
#	mkdir $s3DashboardPath
#fi
#cmd="/bin/cp $gzipPath$dashboarddate.tgz $s3DashboardPath"
#echo $cmd
#$cmd
#cmd="/bin/rm $gzipPath$dashboarddate.tgz"
#echo $cmd
#$cmd

## ymk event script
#cd $path
#cmd="$path/ymkEvent.sh $curdate"
#echo $cmd
#$cmd >> /usr/local/countly/log/ymkEvent_batch.log 2>&1

## remove raw data
## mongo test --eval "printjson(db.getCollectionNames())"
#cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
#echo $cmd
#$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Countly Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/cron_batch.log)\
| mail -s "Main [$curdate]Countly Batch Finished" gary_huang@cyberlink.com,qwweee@gmail.com
#sleep 1
rm -f ${LOCKFILE}

cmd="ssh ubuntu@claddb /usr/local/countly/api/mongoToMysqlUU.sh $curdate >> /usr/local/countly/log/mongoToMysql.log &"
echo $cmd
$cmd
