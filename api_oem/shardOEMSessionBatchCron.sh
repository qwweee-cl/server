#!/bin/bash

. /usr/local/countly/api/maillist.sh
SCRIPTNAME=`basename $0`
trap 'error_exp'  ERR SIGINT SIGTERM
header="OEM"
LOCKFILE="/tmp/shardSessionBatchOEMCron.pid"
PID=`ps -ef | grep ${SCRIPTNAME} | head -n1 |  awk ' {print $2;} '`
echo ${PID} > ${LOCKFILE}
pid=`cat ${LOCKFILE}`

function error_exp
{
  echo -e "[Shard OEM]${oemName} Main Process Session Batch Error Please check log ${mainLogFile}"\
  $(tail -20 ${mainLogFile})\
  | mail -s "[Wrong][Shard OEM]${oemName} ${start_date} ${start_round} Session Error Trap(${pid})" ${mail_target}
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 1
}

function backupDashboard() {
  backupDashLog="/usr/local/countly/log/shardOEMDashBackupCron.log"
  cd $working_dir
## call backup script
  cmd="${working_dir}/shardBackupDashboardDBCronByOEM.sh"
  echo ${cmd} 2>&1 >> ${one_day_log}
  $cmd 2>&1 >> ${backupDashLog}
}
function checkLoopStop() {
  loopFile="/tmp/shardStopOEMSessionCronFile"
  if [ -f "${loopFile}" ]; then
    echo "${loopFile} exist"
    echo -e "Loop Session Batch Stop on $(date +%Y%m%d-%H:%M)"\
    | mail -s "[Wrong][Shard OEM]${oemName} ${start_date} ${start_round} Session Batch Stop" ${mail_target}
    if [ -f ${LOCKFILE} ]; then
      rm ${LOCKFILE}
    fi
    exit 0
  fi
}
function createIndex() {
  echo -e "create index is in createShardKey"
}
function sendSummaryMail() {
  oemName="${1}"
  echo -e $(tail -20 ${one_day_log})\
  | mail -s "[Shard OEM]${oemName} ${start_date} ${start_round} Session Summary" ${mail_target}
}
function sendSummaryTotalMail() {
  echo -e $(tail -20 ${mainLogFile})\
  | mail -s "[Shard OEM] ${start_date} ${start_round} All OEMs are Processing Session" ${mail_target}
}
function sendWrongMail1() {
  oemName="${1}"
  echo -e $(tail -20 ${one_day_log})\
  | mail -s "[Wrong][Shard OEM][Wrong DB][Session]${oemName} ${start_date} ${start_round}" ${Gary}
}
function sendWrongMail2() {
  oemName="${1}"
  echo -e $(tail -20 ${one_day_log})\
  | mail -s "[Wrong][Shard OEM][Wrong S3][Session]${oemName} ${start_date} ${start_round}" ${Gary}
}

log_path="/usr/local/countly/log/shardOEMSession"
working_dir="/usr/local/countly/api_oem"
mail_target=${AWSM}
one_day_log="$log_path/log_oem_session_$(date +%Y%m%d).log"

gzipPath="/mem/oem_mongo_shard_dashboard_gzip/"
exportPath="/mem/oem_mongo_shard_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/OEM/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/OEM/dashboard_data/"
rawSession="/mem/tmp/RawSession/"
batchdb=""

s3Path="/s3mnt/shard_backup/oem_hourly_data_new/"
cmds3Path="s3://clcom2-countly/shard_backup/oem_hourly_data_new/"

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
start_date=${fullDate}
start_round="00"

## backup dashboard need end

cd ${working_dir}
header="OEM"
mainLogFile="/usr/local/countly/log/shardOEMCronSession.log"
indexNum="1"
theOther="2"

echo -e ${header}
echo -e ${LOCKFILE}
echo -e ${mainLogFile}
echo -e ${indexNum}
echo -e ${pid}

if [ ! -d "${exportPath}" ]; then
  mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
  mkdir ${gzipPath}
fi
one_day_log="$log_path/log_oem_session_$(date +%Y%m%d).log"
curdate=$(date +%Y%m%d-%H%M)
if [ -f "$one_day_log" ]; then
  echo "" >> "$one_day_log"
else
  echo "Loop start: $(date +%Y-%m-%d)" > "$one_day_log"
fi
checkLoopStop

cd ${working_dir}

### start backup all oems dashboard data
echo -e "[backup]backup start"
## call backup function
backupDashboard
## call backup function end
echo -e "[backup]backup end"

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
## check process round and s3 files
  oemName="${apps[${i}]}"
  batchdb="${dbNameHeader}${oemName}_raw${smallDate}_00"
  filedate=$(date -d "${start_date}" +%Y%m%d)
  echo -e ${start_date}
  echo -e ${filedate}
  echo -e ${small_date}
  echo -e ${start_round}
  s3OEMFile=${s3Path}${filedate}"_${oemName}_${start_round}.tgz"
  cmds3OEMFile=${cmds3Path}${filedate}"_${oemName}_${start_round}.tgz"
  fileExist=true
  echo -e ${cmds3OEMFile}
  existFile=`/usr/local/bin/aws s3 ls ${cmds3OEMFile} | wc -l`
  
  duFile=`/usr/local/bin/aws s3 ls ${cmds3OEMFile} | awk '{ print $3 }'`

  if [ ${existFile} == "0" ]; then
    echo "${cmds3OEMFile} file not exist" >> ${one_day_log}
    fileExist=false
  fi

  if [ -z ${duFile} ]; then
    echo "${cmds3OEMFile} file size is 0" >> ${one_day_log}
    fileExist=false
  fi

  echo -e ${fileExist}

  if [ ${fileExist} = false ]; then
    echo "${cmds3OEMFile} s3 file not exist" >> ${one_day_log}
    sendWrongMail2 ${oemName}
#    continue;
  fi

  cd ${working_dir}
## call shardOEMSessionBatchPerOEM.sh
#  cmd="node --max-old-space-size=6144 shardNewBatchByOEM.js ${oemName} ${batchdb}"
#  echo -e ${cmd} 2>&1 >> $one_day_log 
#  ${cmd} 2>&1 >> $one_day_log
  cmd="${working_dir}/shardOEMSessionBatchPerOEM.sh ${oemName} ${batchdb} ${start_date} ${start_round}"
  echo -e ${cmd}
  echo -e ${cmd} 2>&1 >> ${one_day_log}
  eval ${cmd} 2>&1 >> ${one_day_log} &

## run script on background and sleep 5 mins then continue;
  sleep 5m
  echo -e "[${oemName}] sleep 5 mins ${batchdb} session processing and continue next "
  
  echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "${one_day_log}" 2>&1
## do other scripts
  cd ${working_dir}
#  echo -e "Call Others batch script shardLoopSessionOthersByOEM.sh ${batchdb} ${indexNum}"
#  ${working_dir}/shardLoopSessionOthersByOEM.sh ${batchdb} ${indexNum} >> "$one_day_log" 2>&1

## send summary mail
#  sendSummaryMail ${oemName}
done;
sendSummaryTotalMail
if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
fi

exit 0
