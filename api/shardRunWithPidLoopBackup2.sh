#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardBackupRaw2.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[Shard]PF Loop Backup Batch already running, please close ${LOCKFILE}"\
	| mail -s "[Shard]PF Loop Backup Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

sudo chown ubuntu:ubuntu /mem -R

#nohup /usr/local/countly/api/shardBackupRaw.sh 2 >> /usr/local/countly/log/loopBackupMain2.log 2>&1 & echo $! > ${LOCKFILE}

