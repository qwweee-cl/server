#!/bin/bash
. /usr/local/countly/api/maillist.sh
LOCKFILE="/tmp/shardBackupRaw1.pid"

if [ -e ${LOCKFILE} ] ; then
	echo "already running"
	echo -e "[Shard]shard1 Loop Backup Batch already running, please close ${LOCKFILE}"\
	| mail -s "[Shard]shard1 Loop Backup Batch Already running" ${AWSM}
	#rm -f ${LOCKFILE}
	exit 1
fi

sudo chown ubuntu:ubuntu /mem -R

nohup /usr/local/countly/api/shardBackupRaw.sh 1 >> /usr/local/countly/log/shardBackupMain1.log 2>&1 & echo $! > ${LOCKFILE}

