#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

logpath="/usr/local/countly/log/shardKey/"
curdate=$(date +%Y%m%d)
one_time_log="${logpath}${curdate}_oem_log.log"

function error_exp
{
  curdate=$(date +%Y%m%d)
  one_time_log="${logpath}${curdate}_oem_log.log"
        echo -e "Create ${tomorrow} shard key error: $(cat ${one_time_log})"\
        | mail -s "[NewMongoDB OEM][Wrong] Create ${tomorrow} Shard Key Error Trap" ${AWSM}
  echo -e "Create Shard Key Error"
  exit 1
}

function getDBName() {
  dbName="oem_${3}_raw${1}_${2}"
  echo -e ${dbName}
}

function getCollectionName() {
  dbCollectionName=${1}"."${2}
  echo -e ${dbCollectionName}
}

function sendSummaryMail() {
  echo -e $(cat $one_time_log)\
  | mail -s "[NewMongoDB OEM] Create ${tomorrow} Shard Key Summary" ${AWSM}
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

cmd="node getOEMs.js"
echo -e $cmd >> ${one_time_log}
echo -e $cmd
string=`$cmd`
IFS=', ' read -a oems <<< "$string"

for (( j = 0 ; j < ${#oems[@]} ; j++ )) do
  dbName0=$(getDBName "${tomorrow}" "00" "${oems[$j]}")
  dbHost="localhost:30000"

  batchdb="${dbName0}"
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a" >> ${one_time_log}
  echo -e "node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392" >> ${one_time_log}
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a
  node ensureSessionIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392

  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a" >> ${one_time_log}
  echo -e "node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392" >> ${one_time_log}
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a
  node ensureEventIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392

done

date
date >> ${one_time_log}

sendSummaryMail
