#!/bin/bash
. /usr/local/countly/api/maillist.sh
SCRIPTNAME=`basename $0`
LOCKFILE="/tmp/shardSessionBatchOEMCron.pid"
trap 'error_exp'  ERR SIGINT SIGTERM
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] 
then
  echo -e "please add one paramater: (oemName:360) (batchdbName:oem_360_raw0613_00) (start_date) (start_round)"
  exit 1
else
  oemName=${1}
  batchdb=${2}
  start_date=${3}
  start_round=${4}
fi
mainLogFile="/usr/local/countly/log/shardSessionOEM_${oemName}.log"
header="OEM"

echo -e "${oemName}"
echo -e "${batchdb}"
echo -e "${start_date}"
echo -e "${start_round}"

PID=`ps -ef | grep ${SCRIPTNAME} | head -n1 |  awk ' {print $2;} '`
echo ${PID} > ${LOCKFILE}
pid=`cat ${LOCKFILE}`

function error_exp
{
  echo -e "[Shard OEM]${oemName} Process Session Batch Error Please check log ${mainLogFile}"\
  $(tail -20 ${mainLogFile})\
  | mail -s "[Wrong][Shard OEM]${oemName} ${start_date} ${start_round} Process Session Error Trap(${pid})" ${mail_target}
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 1
}
function sendSummaryMail() {
  oemName="${1}"
  echo -e $(tail -20 ${mainLogFile})\
  | mail -s "[Shard OEM]${oemName} ${start_date} ${start_round} Process Session Summary" ${mail_target}
}

log_path="/usr/local/countly/log/shardOEMSession"
working_dir="/usr/local/countly/api_oem"
mail_target=${AWSM}

## backup dashboard need end

cd ${working_dir}

echo -e ${header}
echo -e ${LOCKFILE}
echo -e ${mainLogFile}
echo -e ${pid}

curdate=$(date +%Y%m%d-%H%M)

cd ${working_dir}

echo -e "Start Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "${mainLogFile}" 2>&1

cmd="node --max-old-space-size=6144 shardNewBatchByOEM.js ${oemName} ${batchdb}"
echo -e "${cmd}"
echo -e ${cmd} 2>&1 >> ${mainLogFile} 
eval ${cmd} 2>&1 >> ${mainLogFile}

echo -e "[${oemName}]process ${batchdb} session finished"
  
echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> "${mainLogFile}" 2>&1

## send summary mail
sendSummaryMail ${oemName}

if [ -f ${LOCKFILE} ]; then
  rm ${LOCKFILE}
fi

exit 0
