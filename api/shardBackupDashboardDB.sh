#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardSessionBatch1.pid"
pid=`cat ${LOCKFILE}`

function sendSummaryMail() {
	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Shard] Session1 Loop Backup Dashboard Summary" ${AWSM}
}

logpath="/usr/local/countly/log/shardSession/"
sendSummaryMail
exit 0
## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
s3DashboardPath="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api"
gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/mem/mongo_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/db_backup/hourly_data/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/db_backup/hourly_data/dashboard_data/"
batchdb=""
indexNum="1"

gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/data/mongo_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/dashboard_data/"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_log.log"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
afterbackupTime="1200"
sleepTime=10800 # this is for clad2
currBackup=$(date +%j)
## backup dashboard need end

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

## this is for test
dashboarddb="countly_test"
dashboard="cladtest:27017"
## this is for test end

dashboarddb="countly"
dashboard="claddb2:27017"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

## echo backup start time
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

cd $path
backupDate=$(date +%Y%m%d-%H%M)
#cmd="node shardCladBackupStatus.js"
#echo -e ${cmd}
#string=`${cmd}`
cmd="node shardGetSession1Round.js"
echo -e ${cmd}
string=`${cmd}`
#	echo -e ${string}
cladStatus=$string

#cmd="node shardClad2BackupStatus.js"
#echo -e ${cmd}
#string=`${cmd}`
cmd="node shardGetSession2Round.js"
echo -e ${cmd}
string=`${cmd}`
#	echo -e ${string}
clad2Status=${string}

echo -e "backupDate  : ${backupDate}" >> $one_time_log
echo -e "cladStatus  : ${cladStatus}" >> $one_time_log
echo -e "clad2Status : ${clad2Status}" >> $one_time_log

echo -e "backupDate  : ${backupDate}"
echo -e "cladStatus  : ${cladStatus}"
echo -e "clad2Status : ${clad2Status}"

## save dashboard backup begin
cmd="node shardUpdateDashBackupBegin.js ${backupDate} ${cladStatus} ${clad2Status}"
echo -e ${cmd}
string=`${cmd}`
echo -e ${string}

## process dashboard backup
cd $exportPath
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

cmd="sudo rm ${DashboardCachePath} -rf"
echo $cmd
$cmd

## save dashboard backup end
cd $path
cmd="node shardUpdateDashBackupEnd.js ${backupDate}"
echo -e ${cmd}
string=`${cmd}`
echo -e ${string}

## echo backup stop time
echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

sendSummaryMail
exit 0
