#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/loopBackupRaw2.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[hourly]Main Loop Backup Batch already running, please close ${LOCKFILE}"\
	| mail -s "[hourly]Main Loop Backup Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

sudo chown ubuntu:ubuntu /mem -R

nohup /usr/local/countly/api/loopBackupRaw2.sh >> /usr/local/countly/log/loopBackupMain2.log 2>&1 & echo $! > ${LOCKFILE}

