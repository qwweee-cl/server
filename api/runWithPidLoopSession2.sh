#!/bin/bash

LOCKFILE="/tmp/loopSessionBatch2.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Slave Loop Session Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Slave Loop Session Batch Already running" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	#rm -f ${LOCKFILE}
	exit 1
fi

nohup /usr/local/countly/api/loopSessionBatch2.sh >> /usr/local/countly/log/loopSessionMain2.log 2>&1 & echo $! > /tmp/loopSessionBatch2.pid

