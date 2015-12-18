#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

logpath="/usr/local/countly/log/shardKey/"
curdate=$(date +%Y%m%d)
one_time_log="${logpath}${curdate}_check_log.log"
error=0

function error_exp
{
  error=1
}

function getDBName() {
  dbName="countly_raw"${1}"_"${2}
  echo -e ${dbName}
}

function sendSummaryMail() {
  echo -e $(cat $one_time_log)\
  | mail -s "[Check] Check ${tomorrow} Collections Exist Summary" ${AWSM}
}

function sendWrongMail() {
  echo -e "Wrong Check ${tomorrow} Collections Exist: "$(cat $one_time_log)\
  | mail -s "[Wrong] Check ${tomorrow} Collections Exist Error" ${AWSM}
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

dbName0=$(getDBName "${tomorrow}" "00")
#echo -e ${dbName0}
dbName1=$(getDBName "${tomorrow}" "01")
#echo -e ${dbName1}
dbName2=$(getDBName "${tomorrow}" "02")
#echo -e ${dbName2}
dbName3=$(getDBName "${tomorrow}" "03")
#echo -e ${dbName3}

cmd="node checkCollectionsShard1.js ${dbName0}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log
cmd="node checkCollectionsShard2.js ${dbName0}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log

cmd="node checkCollectionsShard1.js ${dbName1}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log
cmd="node checkCollectionsShard2.js ${dbName1}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log

cmd="node checkCollectionsShard1.js ${dbName2}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log
cmd="node checkCollectionsShard2.js ${dbName2}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log

cmd="node checkCollectionsShard1.js ${dbName3}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log
cmd="node checkCollectionsShard2.js ${dbName3}"
echo -e "${cmd}"
echo -e "${cmd}" >> ${one_time_log}
${cmd} 2>&1 >> $one_time_log

if [ $error -eq 0 ]; then
	sendSummaryMail
else
	sendWrongMail
fi

