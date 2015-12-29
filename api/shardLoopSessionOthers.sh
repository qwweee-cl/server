#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "[Shard] Process Others Script${index} fail"\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Shard][session${index}] Process Others Script${index} Error Trap" ${mail_target}
  echo -e "Process Others Script${index} error!"
  exit 1
}

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
  echo "Please execute with dbname, index(1 or 2), start_date(20150101), start_round(00~03) paramater"
  exit 0
fi

dbname="${1}"
index="${2}"
start_date="${3}"
start_round="${4}"

mainLogFile="/usr/local/countly/log/shardSessionOthers${index}.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}

echo -e "after session${index} finished process session to do"

cd ${working_dir}
## execute prediction script
cmd="./shardPredictionBatch.sh ${dbname} ${index} ${start_date} ${start_round}"
echo -e "${cmd}" 2>&1 >> ${mainLogFile}
${cmd} 2>&1 >> ${mainLogFile}

cd ${working_dir}
## drop current processed local mongodb
cmd="./shardDropCurrentLocalMongodb.sh ${dbname} ${index} ${start_date} ${start_round}"
echo -e "${cmd}" 2>&1 >> ${mainLogFile}
${cmd} 2>&1 >> ${mainLogFile}
