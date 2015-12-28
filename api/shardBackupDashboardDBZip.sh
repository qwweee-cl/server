#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardSessionBatch1.pid"
pid=`cat ${LOCKFILE}`

function sendSummaryMail() {
	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Shard] Zip Session1 Loop Backup Dashboard Summary" ${AWSM}
}

logpath="/usr/local/countly/log/shardSession/"

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
cmds3DashboardPath="s3://clcom2-countly/shard_backup/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/dashboard_data/"

cmds3DashboardPath="s3://clcom2-countly/test/dashboard_data/"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

if [ -z "$1" ]; then
  echo -e "please add one paramater: dashboarddate(20151212_countly)"
  echo -e "Zip dashboard data error, please input a paramater(20151212_countly)"\
  | mail -s "[Wrong][Shard] Zip Dashboard Data Paramater Error" ${AWSM}
  exit 1
fi

curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_zip_log.log"

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi

dashboarddate=${1}

## echo backup start time
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

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
#if [ ! -d "$s3DashboardPath" ]; then
#echo "mkdir $s3DashboardPath"
#mkdir $s3DashboardPath
#fi
#cmd="/bin/cp $gzipPath$dashboarddate.tgz $s3DashboardPath"
#echo $cmd
#$cmd
cmd="aws s3 cp $gzipPath$dashboarddate.tgz $cmds3DashboardPath"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$dashboarddate.tgz"
echo $cmd
$cmd

## echo backup stop time
echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`."

sendSummaryMail
exit 0
