#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e "error trap"
	exit 1
}


cmd="node shardGetSession1Status.js"
echo -e ${cmd}
session1Status=`${cmd}`

cmd="node shardGetSession2Status.js"
echo -e ${cmd}
session2Status=`${cmd}`

echo -e "${session1Status}"
echo -e "${session2Status}"

while [ "${session2Status}" == "1" ]
do
	echo -e "do wait for Session2 process finished"
	sleep 10

	cmd="node shardGetSession1Status.js"
	echo -e ${cmd}
	session1Status=`${cmd}`

	cmd="node shardGetSession2Status.js"
	echo -e ${cmd}
	session2Status=`${cmd}`

	echo -e "${session1Status}"
	echo -e "${session2Status}"

done
echo -e "do backup script"

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
