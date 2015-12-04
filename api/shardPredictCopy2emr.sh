#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "[Shard to emr-test][session${index}] Prediction Copy to EMR fail"\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard to emr-test][session${index}] Prediction Copy to EMR Error Trap" ${mail_target}
  echo -e "Copy Prediction files error!"
  exit 1
}

function sendSummaryMail() {
  echo -e "Prediction logs ${mainLogFile} : "\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard to emr-test][session${index}] Prediction Copy to EMR Summary" ${mail_target}
}

mainLogFile="/usr/local/countly/log/shardPredictionEMR2.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
s3PredictionPath="/s3mnt/shard_backup/Prediction/"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Please execute with date(0101) and index(1 or 2) paramater"
  exit 0
fi

index="${2}"

cd ${working_dir}

for i in *.txt ; do
  regex="$1_543f37d0a62268c51e16d053"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_543f8693a9e5b7ed76000012"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_543f37eaa62268c51e16d0c3"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_543f866fa9e5b7ed76000011"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_5551e55cacdd571e2e000443"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_5552bf53acdd571e2e00044e"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_55d69ff33b254f9535d6059a"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_55d6a0123b254f9535d6142d"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_5631c5e92acfaf9818001bb1"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
  regex="$1_5631c60a2acfaf9818001bb2"
  if [[ "$i" =~ $regex ]]
  then
    echo -e "scp ${i} emr2:/data/owl/predict/data/2015${i}" >> ${mainLogFile}
    scp ${i} emr2:/data/owl/predict/data/2015${i}
  fi
done

sendSummaryMail
