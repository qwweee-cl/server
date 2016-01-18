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
  #printf '%s\n' "${apps_id[@]}"
  baseCmd="/usr/bin/mongo --eval "
  cmd=""
  dbName0=$(getDBName "${tomorrow}" "00" "${oems[$j]}")
  #echo -e ${dbName0}
  cmd="printjson(sh.enableSharding('${dbName0}'));"
  echo -e ${baseCmd}${cmd} >> ${one_time_log}
  echo -e ${baseCmd}${cmd}
  ${baseCmd}${cmd}

#  dbName1=$(getDBName "${tomorrow}" "01" "${oems[$j]}")
  #echo -e ${dbName1}
#  cmd="printjson(sh.enableSharding('${dbName1}'));"
#  echo -e ${baseCmd}${cmd} >> ${one_time_log}
#  ${baseCmd}${cmd}

#  dbName2=$(getDBName "${tomorrow}" "02" "${oems[$j]}")
  #echo -e ${dbName2}
#  cmd="printjson(sh.enableSharding('${dbName2}'));"
#  echo -e ${baseCmd}${cmd} >> ${one_time_log}
#  ${baseCmd}${cmd}

#  dbName3=$(getDBName "${tomorrow}" "03" "${oems[$j]}")
  #echo -e ${dbName3}
#  cmd="printjson(sh.enableSharding('${dbName3}'));"
#  echo -e ${baseCmd}${cmd} >> ${one_time_log}
#  ${baseCmd}${cmd}

  for (( i = 0 ; i < ${#apps_id[@]} ; i++ )) do
    cmd=""
    session="raw_session_"${apps_id[$i]}
    event="raw_event_"${apps_id[$i]}
    sessionColName0=$(getCollectionName "${dbName0}" "$session")
    cmd="printjson(sh.shardCollection('${sessionColName0}',{'app_user_id':'hashed'}));"
    echo -e ${baseCmd}${cmd} >> ${one_time_log}
    ${baseCmd}${cmd}

#    sessionColName1=$(getCollectionName "${dbName1}" "$session")
#    cmd="printjson(sh.shardCollection('${sessionColName1}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}

#    sessionColName2=$(getCollectionName "${dbName2}" "$session")
#    cmd="printjson(sh.shardCollection('${sessionColName2}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}

#    sessionColName3=$(getCollectionName "${dbName3}" "$session")
#    cmd="printjson(sh.shardCollection('${sessionColName3}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}


    eventColName0=$(getCollectionName "${dbName0}" "$event")
    cmd="printjson(sh.shardCollection('${eventColName0}',{'app_user_id':'hashed'}));"
    echo -e ${baseCmd}${cmd} >> ${one_time_log}
    ${baseCmd}${cmd}

#    eventColName1=$(getCollectionName "${dbName1}" "$event")
#    cmd="printjson(sh.shardCollection('${eventColName1}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}

#    eventColName2=$(getCollectionName "${dbName2}" "$event")
#    cmd="printjson(sh.shardCollection('${eventColName2}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}

#    eventColName3=$(getCollectionName "${dbName3}" "$event")
#    cmd="printjson(sh.shardCollection('${eventColName3}',{'app_user_id':'hashed'}));"
#    echo -e ${baseCmd}${cmd} >> ${one_time_log}
#    ${baseCmd}${cmd}


  #  echo -e ${session}
  #  echo -e ${event}
  #  cmd=$cmd"sh.shardCollection("records.people",{zipcode:1});"
  done

  dbHost="localhost:27017"

  batchdb="${dbName0}"
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a" >> ${one_time_log}
  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392" >> ${one_time_log}
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_488fea5101de4a8226718db0611c2ff2daeca06a
  node ensureIndex.js ${dbHost} ${batchdb} raw_session_7cd568771523a0621abff9ae3f95daf3a8694392

#  batchdb="${dbName1}"
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e

#  batchdb="${dbName2}"
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e

#  batchdb="${dbName3}"
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af" >> ${one_time_log}
#  echo -e "node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e" >> ${one_time_log}
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_c277de0546df31757ff26a723907bc150add4254
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_9219f32e8de29b826faf44eb9b619788e29041bb
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_0368eb926b115ecaf41eff9a0536a332ef191417
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_895ef49612e79d93c462c6d34abd8949b4c849af
#  node ensureIndex.js ${dbHost} ${batchdb} raw_session_ecc26ef108c821f3aadc5e283c512ee68be7d43e
done

date
date >> ${one_time_log}

sendSummaryMail
