#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
  echo -e "[Old] Process Others Script2 fail"\
  $(tail -20 ${mainLogFile}) \
  | mail -s "[Old][clad${index}] Process Others Script2 Error Trap" ${mail_target}
  echo -e "Process Others Script2 error!"
}

mainLogFile="/usr/local/countly/log/hourlySessionOthers2.log"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}

echo -e "after clad2 finished process session to do"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Please execute with dbname and index(1 or 2) paramater"
  exit 0
fi

dbname="${1}"
index="${2}"

cd ${working_dir}
## execute prediction script
cmd="./predictionBatch.sh ${dbname} ${index}"
echo -e "${cmd} 2>&1 >> ${mainLogFile}"
${cmd} 2>&1 >> ${mainLogFile}
