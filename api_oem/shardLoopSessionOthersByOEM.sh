#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "[Shard OEM] Process Others Script${index} fail"\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard OEM][session${index}] Process Others Script${index} Error Trap" ${mail_target}
  echo -e "Process Others Script${index} error!"
}

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Please execute with dbname and index(1 or 2) paramater"
  exit 0
fi

dbname="${1}"
index="${2}"

mainLogFile="/usr/local/countly/log/shardSessionOthers${index}.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}

echo -e "after session${index} finished process oem session to do"

cd ${working_dir}
## execute prediction script
#cmd="./shardPredictionBatch.sh ${dbname} ${index}"
#echo -e "${cmd} 2>&1 >> ${mainLogFile}"
#${cmd} 2>&1 >> ${mainLogFile}
