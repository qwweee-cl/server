#!/bin/bash

LOCKFILE="/tmp/loopEventBatch2.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Slave Loop Event Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Slave Loop Event Batch Already running" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	#rm -f ${LOCKFILE}
	exit 1
fi

nohup /usr/local/countly/api_event/loopEventBatch2.sh >> /usr/local/countly/log/loopEventMain2.log 2>&1 & echo $! > /tmp/loopEventBatch2.pid

