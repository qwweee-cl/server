#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "error"
  echo -e "Execute Prediction Error ${mainLogFile} : "\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard][session${index}] Error Execute Prediction" ${mail_target}
  exit 0
}

function sendSummaryMail() {
  echo -e "summary"
  echo -e "Execute Prediction logs ${mainLogFile} : "\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard][session${index}] Execute Prediction on EMR Summary" ${mail_target}
}

mainLogFile="/usr/local/countly/log/shardPredictionBatch.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
S3LogFile="/usr/local/countly/log/shardPredictionS3.log"
EMRLogFile="/usr/local/countly/log/shardPredictionEMR.log"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Please execute with dbname and index(1 or 2) paramater"
  exit 0
fi

index="${2}"

cd ${working_dir}
string="$1"
regular="[0-9]{4}"
if [[ $string =~ $regular ]]; then 
  execDate="2015${BASH_REMATCH[0]}"
  shortDate="${BASH_REMATCH[0]}"
  echo ${execDate}
  echo ${execDate} >> ${mainLogFile}
fi

## execute copy prediction file to s3
cmd="./shardPredictCopy2S3.sh ${shortDate} $2"
echo -e "${cmd}" >> ${mainLogFile}
${cmd} ${shortDate} $2
## execute copy prediction file to emr2
cmd="./shardPredictCopy2emr.sh ${shortDate} $2"
echo -e "${cmd}" >> ${mainLogFile}
${cmd} ${shortDate} $2

if [ "$2" == "1" ]; then
  echo -e "Execute Prediction Scirpt"
  echo -e "Execute Prediction Scirpt" >> ${mainLogFile}
  cmd="ssh ubuntu@emr2 /home/ubuntu/predict/daily_predict_APP.sh ${execDate} >> /data/owl/predict/log/sshCallPredict.log"
  echo -e "${cmd}" >> ${mainLogFile}
  ${cmd}
  sendSummaryMail
fi
