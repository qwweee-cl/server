#!/bin/bash
. /usr/local/countly/api/maillist.sh

trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e $(cat $one_day_log)\
	| mail -s "[Wrong][Shard] Session${indexNum} Drop ${dbName} on Local Mongodb Error" ${AWSM}
	exit 1
}

function sendSummaryMail() {
	echo -e $(cat $one_day_log)\
	| mail -s "[Shard] Session${indexNum} Drop ${dbName} on Local Mongodb Summary" ${AWSM}
}

log_path="/usr/local/countly/log/shardSession"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
one_day_log="$log_path/log_drop_$(date +%Y%m%d).log"

if [ -z "$1" ]; then
  echo -e "please add one paramater: dbName(countly_raw1212_00)"
  exit 1
else
  dbName="${1}"
fi

cd ${working_dir}
## drop current processed local mongodb
baseCmd="/usr/bin/mongo --eval "
cmd="printjson(db.dropDatabase());"
echo -e "${baseCmd}${cmd} 2>&1 " 2>&1 >> ${one_day_log}
${baseCmd}${cmd} 2>&1 >> ${one_day_log}

sendSummaryMail
