#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
#	echo -e "[Shard] Prediction Rename fail"\
#	| mail -s "[Shard] Prediction Rename Error Trap" ${mail_target}
	echo -e "Copy Prediction files error!"
	exit 1
}

function sendSummaryMail() {
	echo -e "Prediction logs ${mainLogFile} : "\
	$(tail -20 ${mainLogFile}) \
	| mail -s "[Shard] Prediction Rename Summary" ${AWSM}
}

mainLogFile="/usr/local/countly/log/shardPrediction.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
s3PredictionPath="/s3mnt/shard_backup/Old/"

cd ${working_dir}

for i in *.txt ; do
#  echo -e "cp ${i} ${s3PredictionPath}2015${i}" >> ${mainLogFile}
#  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
#  echo -e "${i##9219f32e8de29b826faf44eb9b619788e29041bb}"
#  echo -e "${i##e315c111663af26a53e5fe4c82cc1baeecf50599}"
#  echo -e "${i##c277de0546df31757ff26a723907bc150add4254}"
#  echo -e "${i##75edfca17dfbe875e63a66633ed6b00e30adcb92}"
#  if [[ "$i" =~ "[0-9]{4}_543f37d0a62268c51e16d053" ]]
#    then echo "match";
#  fi
  regex="[0-9]{4}_543f37d0a62268c51e16d053"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  regex="[0-9]{4}_543f8693a9e5b7ed76000012"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  regex="[0-9]{4}_543f37eaa62268c51e16d0c3"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  regex="[0-9]{4}_543f866fa9e5b7ed76000011"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  regex="[0-9]{4}_5551e55cacdd571e2e000443"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  regex="[0-9]{4}_5552bf53acdd571e2e00044e"
  if [[ "$i" =~ $regex ]]
  then
    echo "matches"
  echo -e "cp ${i} ${s3PredictionPath}2015${i}"
    cp ${i} ${s3PredictionPath}2015${i}
  fi
  
#  cp ${i} ${s3PredictionPath}2015${i}
done


