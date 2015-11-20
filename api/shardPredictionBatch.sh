#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "error"
  echo -e "Execute Prediction Error ${mainLogFile} : "\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard][session${index}] Error Execute Prediction" ${mail_target}
  exit 1
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

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
  echo "Please execute with dbname, index(1 or 2), start_date(20150101), start_round(00~03) paramater"
  exit 0
fi
echo "Prediction start: $(date +%Y-%m-%d)" >> "$mainLogFile"

index="${2}"
start_date="${3}"
start_round="${4}"

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

## execute copy prediction file to emr
cmd="./shardPredictCopy2emr_host.sh ${shortDate} $2"
echo -e "${cmd}" >> ${mainLogFile}
${cmd} ${shortDate} $2

if [ "$2" == "2" ]; then
  echo -e "update prediction status (session2) ${start_date}_${start_round}"
  echo -e "update prediction status (session2) ${start_date}_${start_round}" 2>&1 >> "$mainLogFile"
  cmd="node shardUpdateSessionPrediction.js 2 ${start_date}_${start_round}"
  echo ${cmd} 2>&1 >> ${mainLogFile}
  $cmd
fi

if [ "$2" == "1" ]; then
  while true;
  do
    cmd="node shardGetSession2Prediction.js"
    echo -e ${cmd} 2>&1 >> "$mainLogFile"
    string=`${cmd}`
    #echo -e ${string}
    session2Prediction=${string}
    echo -e "${session2Prediction} : ${start_date}_${start_round}" 2>&1 >> "$mainLogFile"

    if [ "${session2Prediction}" != "${start_date}_${start_round}" ]; then
      echo -e "no data sleep 1 minutes ...." 2>&1 >> "$mainLogFile" 
      sleep 65
      continue
    else
      echo -e "${start_date}_${start_round} finished, do next" 2>&1 >> "$mainLogFile"
      break
    fi
  done

  cd ${working_dir}
### process mongodb to mysql in claddb
  cmd="ssh ubuntu@claddb2 /usr/local/countly/api/shardRunMongoToMysql.sh ${start_date} ${start_round} >> /usr/local/countly/log/mongoToMysql.log"
  echo $cmd
  $cmd 2>&1

  echo -e "Execute Prediction Scirpt"
  echo -e "Execute Prediction Scirpt" >> ${mainLogFile}
  echo "Prediction start emr_host: $(date '+%Y-%m-%d %H:%M')" >> "$mainLogFile"
  cmd="ssh ubuntu@emr /home/ubuntu/predict/daily_predict_APP.sh ${start_date} >> /data/owl/predict/log/sshCallPredict.log"
  echo -e "${cmd}" >> ${mainLogFile}
  ${cmd}
  echo "Prediction end emr_host: $(date '+%Y-%m-%d %H:%M')" >> "$mainLogFile"

  echo "Prediction start emr_test: $(date '+%Y-%m-%d %H:%M')" >> "$mainLogFile"
  cmd="ssh ubuntu@emr2 /home/ubuntu/predict/daily_predict_APP.sh ${start_date} ${start_round} >> /data/owl/predict/log/sshCallPredict.log"
  echo -e "${cmd}" >> ${mainLogFile}
  ${cmd}
  echo "Prediction end emr_test: $(date '+%Y-%m-%d %H:%M')" >> "$mainLogFile"

  echo "Update Prediction finished Flag to MySQL" >> "$mainLogFile"
  cd ${working_dir}
  cmd="node shardUpdateSessionDateRound.js ${start_date}_${start_round}"
  echo -e "${cmd}" >> ${mainLogFile}
  ${cmd}

  sendSummaryMail
fi
