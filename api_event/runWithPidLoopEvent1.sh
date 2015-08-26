#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/loopEventBatch1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Main Loop Event Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Main Loop Event Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

nohup /usr/local/countly/api_event/loopEventBatch.sh >> /usr/local/countly/log/loopEventMain1.log 2>&1 & echo $! > /tmp/loopEventBatch1.pid

