#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e "error trap"
	exit 1
}


cmd="node shardGetBackupStatus.js"
echo -e ${cmd}
backupStatus=`${cmd}`

echo -e "${backupStatus}"

while [ "${backupStatus}" == "1" ]
do
	cmd="node shardGetBackupStatus.js"
	echo -e ${cmd}
	backupStatus=`${cmd}`
	sleep 10

	echo -e "${backupStatus}"
done
echo -e "do process session script"

exit 0

string="countly_raw0910_00"
date
echo -e "test"
#node eventNewBatch.js
#node ensureIndex.js localhost:27018 clad_raw0 raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
#node shardUpdateSessionStatus.js 
regular="[0-9]{4}"
if [[ $string =~ $regular ]]; then echo ${BASH_REMATCH[0]}; fi
date
