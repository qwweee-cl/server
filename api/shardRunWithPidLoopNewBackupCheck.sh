#!/bin/bash
. /usr/local/countly/api/maillist.sh


if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:20150101) (start round:0~3)"
  exit 1
fi

LOCKFILE="/tmp/shardNewBackupRaw${1}.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[ShardNew]shard${1} Loop Backup Batch already running, please close ${LOCKFILE}"\
	| mail -s "[ShardNew]shard${1} Loop Backup Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi


sudo chown ubuntu:ubuntu /mem -R

nohup /usr/local/countly/api/shardBackupRawNew_check.sh ${1} $2 $3 >> /usr/local/countly/log/shardBackupMain${1}.log 2>&1 & echo $! > ${LOCKFILE}

