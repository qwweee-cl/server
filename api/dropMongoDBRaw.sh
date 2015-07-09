#!/bin/bash
. /usr/local/countly/api/maillist.sh
logpath="/usr/local/countly/log/dropDatabase/"

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	echo -e "MongoDB drop ${fullCurDate} database exception"\
	| mail -s "[clad] MongoDB drop exception" ${dropMongo}
	exit 0
}

mongo="localhost:27017"
s3Path="/s3mnt/db_backup/hourly_data/"
curDate=$(date -d "-3 days" +%m%d)
fullCurDate=$(date -d "-3 days" +%Y%m%d)
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
s3Four2=${s3Path}${fullCurDate}"_raw_04_2.tgz"

echo -e ${s3One1}
echo -e ${s3One2}
echo -e ${s3Two1}
echo -e ${s3Two2}
echo -e ${s3Three1}
echo -e ${s3Three2}
echo -e ${s3Four1}
echo -e ${s3Four2}

fileExist=true

if [ ! -f ${s3One1} ] && [ ! -f ${s3One2} ]; then
	echo "${s3One1} or ${s3One2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Two1} ] && [ ! -f ${s3Two2} ]; then
	echo "${s3Two1} or ${s3Two2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Three1} ] && [ ! -f ${s3Three2} ]; then
	echo "${s3Three1} or ${s3Three2} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ! -f ${s3Four1} ] && [ ! -f ${s3Four2} ]; then
	echo "${s3Four1} or ${s3Four2} file not exist" >> ${one_time_log}
	fileExist=false
fi

echo -e ${fileExist}

if [ ${fileExist} = false ]; then
	echo "do not drop ${fullCurDate} database" >> ${one_time_log}
	echo -e "MongoDB does not drop ${fullCurDate} database" | mail -s "[clad] MongoDB drop database exception" ${dropMongo}
	exit 0
fi

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


mail -s "[clad] Finish drop database ${fullCurDate}" ${dropMongo} < ${one_time_log}
