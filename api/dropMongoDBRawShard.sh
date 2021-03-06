#!/bin/bash
. /usr/local/countly/api/maillist.sh
logpath="/usr/local/countly/log/dropDatabase/"
status=0
string="File Not Exist";
trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	mail -s "[Shard] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
	exit 0
}

function sendExceptionMail() {
	mail -s "[Shard] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
}

function sendSummaryMail() {
	mail -s "[Shard] ${fullCurDate} Finish drop database" ${dropMongo} < ${one_time_log}
}

mongo="localhost:27017"
s3Path="/s3mnt/db_backup/hourly_data/"

fullCurDate=$(date -d "-3 days" +%Y%m%d)

if [ -z "$1" ]
then
  echo -e "use three days ago"
else
  fullCurDate=${1}
fi
curDate=$(date -d "-3 days" +%m%d)
curDate=$(date -d "${fullCurDate}" +%m%d)
echo -e ${curDate}
echo -e ${fullCurDate}

one_time_log="${logpath}${fullCurDate}_log.log"

one=${mongo}"/countly_raw"${curDate}"_00"
two=${mongo}"/countly_raw"${curDate}"_01"
three=${mongo}"/countly_raw"${curDate}"_02"
four=${mongo}"/countly_raw"${curDate}"_03"

echo -e ${one}
echo -e ${two}
echo -e ${three}
echo -e ${four}

s3One1=${s3Path}${fullCurDate}"_raw_00_1.tgz"
s3One2=${s3Path}${fullCurDate}"_raw_00_2.tgz"

s3Two1=${s3Path}${fullCurDate}"_raw_01_1.tgz"
s3Two2=${s3Path}${fullCurDate}"_raw_01_2.tgz"

s3Three1=${s3Path}${fullCurDate}"_raw_02_1.tgz"
s3Three2=${s3Path}${fullCurDate}"_raw_02_2.tgz"

s3Four1=${s3Path}${fullCurDate}"_raw_03_1.tgz"
s3Four2=${s3Path}${fullCurDate}"_raw_03_2.tgz"

echo -e ${s3One1}
echo -e ${s3One2}
echo -e ${s3Two1}
echo -e ${s3Two2}
echo -e ${s3Three1}
echo -e ${s3Three2}
echo -e ${s3Four1}
echo -e ${s3Four2}

fileExist=true

if [ ! -f ${s3One1} ] || [ ! -f ${s3One2} ]; then
	echo "${s3One1} or ${s3One2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Two1} ] || [ ! -f ${s3Two2} ]; then
	echo "${s3Two1} or ${s3Two2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Three1} ] || [ ! -f ${s3Three2} ]; then
	echo "${s3Three1} or ${s3Three2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Four1} ] || [ ! -f ${s3Four2} ]; then
	echo "${s3Four1} or ${s3Four2} file not exist" >> ${one_time_log}
	fileExist=false
fi
status=1
string="File Is Zero";

if [ ! -s ${s3One1} ] || [ ! -s ${s3One2} ]; then
	echo "${s3One1} or ${s3One2} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ ! -s ${s3Two1} ] || [ ! -s ${s3Two2} ]; then
	echo "${s3Two1} or ${s3Two2} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ ! -s ${s3Three1} ] || [ ! -s ${s3Three2} ]; then
	echo "${s3Three1} or ${s3Three2} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ ! -s ${s3Four1} ] || [ ! -s ${s3Four2} ]; then
	echo "${s3Four1} or ${s3Four2} file size is 0" >> ${one_time_log}
	fileExist=false
fi

echo -e ${fileExist}

if [ ${fileExist} = false ]; then
	echo "Not drop ${fullCurDate} database" >> ${one_time_log}
	sendExceptionMail
	exit 0
fi

sizeOne1=$(du -b "${s3One1}" | cut -f 1)
sizeOne2=$(du -b "${s3One2}" | cut -f 1)
sizeTwo1=$(du -b "${s3Two1}" | cut -f 1)
sizeTwo2=$(du -b "${s3Two2}" | cut -f 1)
sizeThree1=$(du -b "${s3Three1}" | cut -f 1)
sizeThree2=$(du -b "${s3Three2}" | cut -f 1)
sizeFour1=$(du -b "${s3Four1}" | cut -f 1)
sizeFour2=$(du -b "${s3Four2}" | cut -f 1)

echo -e "${s3One1} : ${sizeOne1}" >> ${one_time_log}
echo -e "${s3One2} : ${sizeOne2}" >> ${one_time_log}
echo -e "${s3Two1} : ${sizeTwo1}" >> ${one_time_log}
echo -e "${s3Two2} : ${sizeTwo2}" >> ${one_time_log}
echo -e "${s3Three1} : ${sizeThree1}" >> ${one_time_log}
echo -e "${s3Three2} : ${sizeThree2}" >> ${one_time_log}
echo -e "${s3Four1} : ${sizeFour1}" >> ${one_time_log}
echo -e "${s3Four2} : ${sizeFour2}" >> ${one_time_log}

status=2
string="Drop DB Exception";

cmd="/usr/bin/mongo ${one} --eval printjson(db.dropDatabase());"
echo $cmd >> ${one_time_log}
$cmd >> ${one_time_log}

cmd="/usr/bin/mongo ${two} --eval printjson(db.dropDatabase());"
echo $cmd >> ${one_time_log}
$cmd >> ${one_time_log}

cmd="/usr/bin/mongo ${three} --eval printjson(db.dropDatabase());"
echo $cmd >> ${one_time_log}
$cmd >> ${one_time_log}

cmd="/usr/bin/mongo ${four} --eval printjson(db.dropDatabase());"
echo $cmd >> ${one_time_log}
$cmd >> ${one_time_log}

status=3
string="Finish";

sendSummaryMail
