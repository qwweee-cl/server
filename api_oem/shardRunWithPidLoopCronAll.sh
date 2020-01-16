#!/bin/bash
. /usr/local/countly/api/maillist.sh
SCRIPTNAME=`basename $0`
#PIDFILE=/var/run/${SCRIPTNAME}.pid
LOCKFILE="/tmp/shardBackupAndSessionBatchOEM.pid"
trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
  echo -e "[Shard OEM]CronAll Batch error: ${mainLogFile}"\
  $(tail -20 ${mainLogFile})\
  | mail -s "[Wrong][Shard OEM] ${processDate} CronAll Batch Batch Error Trap(${PID})" ${AWSM}
  if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
  fi
  exit 1
}
if [ -e ${LOCKFILE} ] ; then
    echo "already running"
    echo -e "[Shard OEM] OEM Loop Backup And Session Cronjob already running, please close ${LOCKFILE}"\
    | mail -s "[Shard OEM] OEM Loop Backup And Session Cronjob already running" ${AWSM}
    #rm -f ${LOCKFILE}
    exit 1
fi

PID=`ps -ef | grep ${SCRIPTNAME} | head -n1 |  awk ' {print $2;} '`
echo ${PID} > ${LOCKFILE}
### create a process Date

processDate=$(TZ=America/Denver date -d "-1 day" +%Y%m%d)
#processDate=$(TZ=America/Denver date -d "-1 day")
### backup OEM's raw data
/usr/local/countly/api_oem/shardBackupOEMRawCron.sh ${processDate} 2>&1 >> /usr/local/countly/log/shardOEMCronBackup_$(date +%Y-%m-%d).log
### process OEM's session 
#/usr/local/countly/api_oem/shardOEMSessionBatchCron.sh ${processDate} 2>&1 >> /usr/local/countly/log/shardOEMCronSession_$(date +%Y-%m-%d).log
echo ${processDate}
if [ -f ${LOCKFILE} ]; then
    rm ${LOCKFILE}
fi
