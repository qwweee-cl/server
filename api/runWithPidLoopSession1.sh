#!/bin/bash

LOCKFILE="/tmp/loopSessionBatch1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Main Loop Session Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Main Loop Session Batch Already running" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	#rm -f ${LOCKFILE}
	exit 1
fi

nohup /usr/local/countly/api/loopSessionBatch.sh >> /usr/local/countly/log/loopSessionMain1.log 2>&1 & echo $! > ${LOCKFILE}

