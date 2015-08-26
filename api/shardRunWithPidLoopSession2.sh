#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardSessionBatch2.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[Shard]PF Loop Session Batch already running, please close ${LOCKFILE}"\
	| mail -s "[Shard]PF Loop Session Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

#nohup /usr/local/countly/api/shardSessionBatch2.sh >> /usr/local/countly/log/shardSessionMain2.log 2>&1 & echo $! > ${LOCKFILE}

