#!/bin/bash

LOCKFILE="/tmp/loopBackupRaw1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Main Loop Backup Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Main Loop Backup Batch Already running" Gary_Huang@PerfectCorp.com,qwweee@gmail.com
	#rm -f ${LOCKFILE}
	exit 1
fi

sudo chown ubuntu:ubuntu /mem -R

nohup /usr/local/countly/api/loopBackupRaw.sh >> /usr/local/countly/log/loopBackupMain1.log 2>&1 & echo $! > ${LOCKFILE}

