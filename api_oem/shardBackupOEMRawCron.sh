#!/bin/bash
. /usr/local/countly/api/maillist.sh
SCRIPTNAME=`basename $0`
trap 'error_exp'  ERR SIGINT SIGTERM
header="CronJob"
LOCKFILE="/tmp/shardBackupOEMRawCron.pid"
PID=`ps -ef | grep ${SCRIPTNAME} | head -n1 |  awk ' {print $2;} '`
echo ${PID} > ${LOCKFILE}
mainLogFile="/usr/local/countly/log/shardOEMCronBackup.log"
pid=`cat ${LOCKFILE}`

mongo="localhost:30000"
echo -e ${header}
echo -e ${LOCKFILE}
echo -e ${mainLogFile}
echo -e ${mongo}
echo -e ${pid}

function error_exp
{
  echo -e "[Shard OEM]${header} Backup Batch error: ${mainLogFile}"\
  $(tail -20 ${mainLogFile})\
  | mail -s "[Wrong][Shard OEM]${header} Backup Batch Error Trap(${pid})" ${AWSM}
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 1
}
function checkLoopStop() {
  loopFile="/tmp/shardStopBackupCronOEMFile"
  if [ -f "${loopFile}" ]; then
    echo "${loopFile} exist"
    echo -e "[Shard OEM]${header} Backup Batch Stop on $(date +%Y%m%d-%H:%M)"\
    | mail -s "[Wrong][Shard OEM]${header} Backup Batch Stop" ${AWSM}
    if [ -f ${LOCKFILE} ]; then
      rm ${LOCKFILE}
    fi
    exit 0
  fi
}
function sendSummaryMail() {
  echo -e $(tail -20 ${one_time_log})\
  | mail -s "[Shard OEM] ${fullDate} ${header} ALL Backup Raw Finished" ${AWSM}
}
function sendSummaryMailPerOEM() {
  oemName="${1}"
  echo -e $(tail -20 ${one_time_log})\
  | mail -s "[Shard OEM][${oemName}] ${fullDate}_00 Backup Raw Log Summary" ${AWSM}
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

cmds3Path="s3://clcom2-countly/shard_backup/oem_hourly_data_new/"
batchdb=""
curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_oem_log.log"

if [ ! -d "$exportPath" ]; then
  mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
  mkdir $gzipPath
fi
### get process Date with parameter
if [ -z "$1" ] 
then
  echo -e "please add one paramater: (start date:2015-01-01)"
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 1
else
  processDate=${1}
fi

smallDate=$(date -d "${processDate}" +%m%d)
fullDate=$(date -d "${processDate}" +%Y%m%d)
curdate=$(date +%Y%m%d-%H%M)
one_time_log="${logpath}${curdate}_oem_log.log"
## check stop file
checkLoopStop

## get OEM arrays
echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

cd ${path}
cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"
totaloems=${#apps[@]}
dosession=0
processArray=()
unset processArray
processIndex=0
dbNameHeader="oem_"

for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
  oemName="${apps[${i}]}"
  echo -e "${oemName}"
  batchdb="${dbNameHeader}${oemName}_raw${smallDate}_00"
  rawdate="${fullDate}_${oemName}_00"
  echo -e "${rawdate}"
  echo -e "${batchdb}"
  echo -e ${rawdate} 2>&1 >> $one_time_log 
  echo -e ${batchdb} 2>&1 >> $one_time_log 
### dump and save raw data to s3
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

  cmd="/usr/local/bin/aws s3 mv ${gzipPath}${rawdate}.tgz ${cmds3Path}${rawdate}.tgz"
  echo $cmd 2>&1 >> $one_time_log 
  $cmd 2>&1 >> $one_time_log

  echo -e "Send Summary Mail"
  sendSummaryMailPerOEM ${oemName}
done;

echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Program(${pid}) stops on `date +"%Y-%m-%d %T"`."
## send summary mail
sendSummaryMail

if [ -f ${LOCKFILE} ]; then
  rm ${LOCKFILE}
fi

exit 0
