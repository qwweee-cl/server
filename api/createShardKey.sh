#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

logpath="/usr/local/countly/log/shardKey/"
curdate=$(date +%Y%m%d)
one_time_log="${logpath}${curdate}_log.log"

function error_exp
{
  curdate=$(date +%Y%m%d)
  one_time_log="${logpath}${curdate}_log.log"
	echo -e "Create ${tomorrow} shard key error: $(cat ${one_time_log})"\
	| mail -s "[MongoDB] Create ${tomorrow} Shard Key Error Trap" ${AWSM}
  echo -e "Create Shard Key Error"
  exit 1
}

function getDBName() {
  dbName="countly_raw"${1}"_"${2}
  echo -e ${dbName}
}

function getCollectionName() {
  dbCollectionName=${1}"."${2}
  echo -e ${dbCollectionName}
}

function sendSummaryMail() {
  echo -e $(cat $one_time_log)\
  | mail -s "[MongoDB] Create ${tomorrow} Shard Key Summary" ${AWSM}
}
date
date > ${one_time_log}

tomorrow=$(date -d "24 hours" +%m%d)
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
path=${DIR}
path="/usr/local/countly/api"

if [ -z "$1" ]
then
  echo -e "use tomorrow date"
else
  tomorrow=${1}
fi

echo -e ${path} >> ${one_time_log}

cd $path

cmd="node getAppsKey.js"
echo -e $cmd >> ${one_time_log}
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps_id <<< "$string"

#printf '%s\n' "${apps_id[@]}"
baseCmd="/usr/bin/mongo --eval "
cmd=""
dbName0=$(getDBName "${tomorrow}" "00")
#echo -e ${dbName0}
cmd="printjson(sh.enableSharding('${dbName0}'));"
echo -e ${baseCmd}${cmd} >> ${one_time_log}
echo -e ${baseCmd}${cmd}
${baseCmd}${cmd}

dbName1=$(getDBName "${tomorrow}" "01")
#echo -e ${dbName1}
cmd="printjson(sh.enableSharding('${dbName1}'));"
echo -e ${baseCmd}${cmd} >> ${one_time_log}
${baseCmd}${cmd}

dbName2=$(getDBName "${tomorrow}" "02")
#echo -e ${dbName2}
cmd="printjson(sh.enableSharding('${dbName2}'));"
echo -e ${baseCmd}${cmd} >> ${one_time_log}
${baseCmd}${cmd}

dbName3=$(getDBName "${tomorrow}" "03")
#echo -e ${dbName3}
cmd="printjson(sh.enableSharding('${dbName3}'));"
echo -e ${baseCmd}${cmd} >> ${one_time_log}
${baseCmd}${cmd}

allCmd=""
for (( i = 0 ; i < ${#apps_id[@]} ; i++ )) do
  cmd=""
  session="raw_session_"${apps_id[$i]}
  event="raw_event_"${apps_id[$i]}
  sessionColName0=$(getCollectionName "${dbName0}" "$session")
  cmd="printjson(sh.shardCollection('${sessionColName0}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  sessionColName1=$(getCollectionName "${dbName1}" "$session")
  cmd="printjson(sh.shardCollection('${sessionColName1}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  sessionColName2=$(getCollectionName "${dbName2}" "$session")
  cmd="printjson(sh.shardCollection('${sessionColName2}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  sessionColName3=$(getCollectionName "${dbName3}" "$session")
  cmd="printjson(sh.shardCollection('${sessionColName3}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}


  eventColName0=$(getCollectionName "${dbName0}" "$event")
  cmd="printjson(sh.shardCollection('${eventColName0}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  eventColName1=$(getCollectionName "${dbName1}" "$event")
  cmd="printjson(sh.shardCollection('${eventColName1}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  eventColName2=$(getCollectionName "${dbName2}" "$event")
  cmd="printjson(sh.shardCollection('${eventColName2}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}

  eventColName3=$(getCollectionName "${dbName3}" "$event")
  cmd="printjson(sh.shardCollection('${eventColName3}',{'app_user_id':'hashed'}));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  ${baseCmd}${cmd}


#  echo -e ${session}
#  echo -e ${event}
#  cmd=$cmd"sh.shardCollection("records.people",{zipcode:1});"
done

date
date >> ${one_time_log}

sendSummaryMail
