#!/bin/bash
. /usr/local/countly/api/maillist.sh
logpath="/usr/local/countly/log/dropDatabase/"
status=0
string="File Not Exist";
trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	mail -s "[Shard OEM ${oemName}] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
	exit 0
}

function sendExceptionMail() {
	mail -s "[Shard OEM ${oemName}] ${fullCurDate} MongoDB drop database exception (${string})" ${Gary} < ${one_time_log}
}

function sendSummaryMail() {
	mail -s "[Shard OEM ${oemName}] ${fullCurDate} Finish drop database" ${dropMongo} < ${one_time_log}
}

mongo="localhost:27017"
s3Path="/s3mnt/shard_backup/oem_hourly_data/"

fullCurDate=$(date -d "-7 days" +%Y%m%d)

if [ -z "$1" ]
then
  echo -e "use three days ago"
else
  fullCurDate=${1}
fi
curDate=$(date -d "-7 days" +%m%d)
curDate=$(date -d "${fullCurDate}" +%m%d)
echo -e ${curDate}
echo -e ${fullCurDate}

one_time_log="${logpath}${fullCurDate}_oem_log.log"

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
	oemName="${apps[${i}]}"
	one=${mongo}"/oem_${oemName}_raw"${curDate}"_00"
	two=${mongo}"/oem_${oemName}_raw"${curDate}"_01"
	three=${mongo}"/oem_${oemName}_raw"${curDate}"_02"
	four=${mongo}"/oem_${oemName}_raw"${curDate}"_03"

	echo -e ${one}
	echo -e ${two}
	echo -e ${three}
	echo -e ${four}

	s3One1=${s3Path}${fullCurDate}"_${oemName}_00.tgz"

	s3Two1=${s3Path}${fullCurDate}"_${oemName}_01.tgz"

	s3Three1=${s3Path}${fullCurDate}"_${oemName}_02.tgz"

	s3Four1=${s3Path}${fullCurDate}"_${oemName}_03.tgz"

	echo -e ${s3One1}
	echo -e ${s3Two1}
	echo -e ${s3Three1}
	echo -e ${s3Four1}

	fileExist=true

	if [ ! -f "${s3One1}" ]; then
		echo "${s3One1} file not exist" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -f "${s3Two1}" ]; then
		echo "${s3Two1} file not exist" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -f "${s3Three1}" ]; then
		echo "${s3Three1} file not exist" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -f "${s3Four1}" ]; then
		echo "${s3Four1} file not exist" >> ${one_time_log}
		fileExist=false
	fi
	status=1
	string="File Is Zero";

	if [ ! -s "${s3One1}" ]; then
		echo "${s3One1} file size is 0" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -s "${s3Two1}" ]; then
		echo "${s3Two1} file size is 0" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -s "${s3Three1}" ]; then
		echo "${s3Three1} file size is 0" >> ${one_time_log}
		fileExist=false
	fi
	if [ ! -s "${s3Four1}" ]; then
		echo "${s3Four1} file size is 0" >> ${one_time_log}
		fileExist=false
	fi

	echo -e ${fileExist}

	if [ "${fileExist}" = false ]; then
		echo "Not drop ${fullCurDate} database" >> ${one_time_log}
		sendExceptionMail
#		exit 0
	fi

	sizeOne1=$(du -b "${s3One1}" | cut -f 1)
	sizeTwo1=$(du -b "${s3Two1}" | cut -f 1)
	sizeThree1=$(du -b "${s3Three1}" | cut -f 1)
	sizeFour1=$(du -b "${s3Four1}" | cut -f 1)

	echo -e "${s3One1} : ${sizeOne1}" >> ${one_time_log}
	echo -e "${s3Two1} : ${sizeTwo1}" >> ${one_time_log}
	echo -e "${s3Three1} : ${sizeThree1}" >> ${one_time_log}
	echo -e "${s3Four1} : ${sizeFour1}" >> ${one_time_log}

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
done