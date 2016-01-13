#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardSessionBatch1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[ShardNew]YCP+YMK Loop Session Batch already running, please close ${LOCKFILE}"\
	| mail -s "[ShardNew]YCP+YMK Loop Session Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:2015-01-01) (start round:0~3)"
  exit 1
fi

nohup /usr/local/countly/api/shardSessionBatchNew_check.sh 1 $2 $3 >> /usr/local/countly/log/shardSessionMain1.log 2>&1 & echo $! > ${LOCKFILE}

