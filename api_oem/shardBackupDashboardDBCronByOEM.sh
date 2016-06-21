#!/bin/bash
. /usr/local/countly/api/maillist.sh
SCRIPTNAME=`basename $0`
trap 'error_exp'  ERR SIGINT SIGTERM

LOCKFILE="/tmp/shardDashboardBackupOEMCron.pid"
PID=`ps -ef | grep ${SCRIPTNAME} | head -n1 |  awk ' {print $2;} '`
echo ${PID} > ${LOCKFILE}
pid=`cat ${LOCKFILE}`

function error_exp
{
  echo -e "[Shard OEM] OEM Backup Dashboard Error Please check log ${one_time_log}"\
  $(tail -20 ${one_time_log})\
  | mail -s "[Wrong][Shard OEM] OEM Backup Dashboard Error Trap(${pid})" ${mail_target}
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 0
}
function sendSummaryMail() {
	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Shard OEM] ${folderTime} OEM Session Backup Dashboard Summary" ${AWSM}
}

logpath="/usr/local/countly/log/shardOEMSession/"

## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
s3DashboardPath="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api_oem"
gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/mem/mongo_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/db_backup/hourly_data/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/db_backup/hourly_data/dashboard_data/"
batchdb=""
indexNum="1"

gzipPath="/mem/mongo_oem_hourly_dashboard_gzip/"
exportPath="/mem/mongo_oem_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/OEM/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/OEM/dashboard_data/"

cmds3DashboardPath="s3://clcom2-countly/shard_backup/OEM/dashboard_data_new/"

curdate=$(date +%Y%m%d-%H%M)
one_time_log="${logpath}${curdate}_log.log"

if [ ! -d "${exportPath}" ]; then
  mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
  mkdir ${gzipPath}
fi

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

## this is for test
dashboarddb="countly_test"
dashboard="cladtest:27017"
## this is for test end

dashboarddb="countly"
dashboard="countly-oem:27017"

savedate=$(date +%Y%m%d)
folderTime=$(date +%Y%m%d_%H%M)
dashboarddate=${folderTime}"_countly"

## echo backup start time
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

cd ${path}
backupDate="$(date +%Y%m%d-%H%M)"

for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
  oemName="${apps[${i}]}"
  dashboarddb="countly_${oemName}"
  dashboarddate="${folderTime}_countly_${oemName}"
  exportFolder="${savedate}_countly_${oemName}"
  echo -e "${oemName}"
  echo -e "${dashboarddb}"
  echo -e "${dashboarddate}"
  echo -e "${exportFolder}"
#  continue;
## process dashboard backup
  cd $exportPath
## backup countly dashboard data
## dump countly dashboard data
  cmd="mongodump -h ${dashboard} -db ${dashboarddb} -o ${exportPath}${exportFolder}"
  echo $cmd
  $cmd
  ## zip backup file
  cd $exportPath
  echo $PWD
  cmd="/bin/tar czf ${gzipPath}${dashboarddate}.tgz ./"
  echo $cmd
  $cmd
  cmd="/bin/rm ./${exportFolder} -rf"
  echo $cmd
  $cmd

  cmd="/usr/local/bin/aws s3 mv ${gzipPath}${dashboarddate}.tgz ${cmds3DashboardPath}"
  echo $cmd
  $cmd

## echo backup stop time
  echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
  echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`."
done

sendSummaryMail

if [ -f ${LOCKFILE} ]; then
  rm ${LOCKFILE}
fi
exit 0
