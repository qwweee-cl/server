#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e "[Shard] Prediction Rename fail"\
	| mail -s "[Shard] Prediction Rename Error Trap" ${mail_target}
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
s3PredictionPath="/s3mnt/shard_backup/Prediction/"

cd ${working_dir}

for i in *.txt ; do
  echo -e "cp ${i} ${s3PredictionPath}2015${i}" >> ${mainLogFile}
  cp ${i} ${s3PredictionPath}2015${i}
done

sendSummaryMail
