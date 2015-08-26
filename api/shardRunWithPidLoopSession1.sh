#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardSessionBatch1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[Shard]YMK+YCP Loop Session Batch already running, please close ${LOCKFILE}"\
	| mail -s "[Shard]YMK+YCP Loop Session Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

#nohup /usr/local/countly/api/shardSessionBatch1.sh >> /usr/local/countly/log/shardSessionMain1.log 2>&1 & echo $! > ${LOCKFILE}

