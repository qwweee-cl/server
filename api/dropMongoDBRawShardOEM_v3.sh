#!/bin/bash
. /usr/local/countly/api/maillist.sh
logpath="/usr/local/countly/log/dropDatabase/"
status=0
string="File Not Exist";
trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	mail -s "[NewShard OEM ${oemName}][Wrong] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
	exit 0
}

function sendExceptionMail() {
	mail -s "[NewShard OEM ${oemName}][Wrong] ${fullCurDate} MongoDB drop database exception (${string})" ${Gary} < ${one_time_log}
}

function sendSummaryMail() {
	mail -s "[NewShard OEM ${oemName}] ${fullCurDate} Finish drop database" ${dropMongo} < ${one_time_log}
}

path="/usr/local/countly/api"
cd ${path}

mongo="localhost:30000"
s3Path="/s3mnt/shard_backup/oem_hourly_data_new/"
cmds3Path="s3://clcom2-countly/shard_backup/oem_hourly_data_new/"

fullCurDate=$(date -d "-6 days" +%Y%m%d)

if [ -z "$1" ]
then
  echo -e "use three days ago"
else
  fullCurDate=${1}
fi
curDate=$(date -d "-6 days" +%m%d)
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

	echo -e ${one}

	s3One1=${s3Path}${fullCurDate}"_${oemName}_00.tgz"
	s3One1=${cmds3Path}${fullCurDate}"_${oemName}_00.tgz"

	echo -e ${s3One1}

	existFile1=`/usr/local/bin/aws s3 ls ${s3One1} | wc -l`

	fileExist=true

	if [ ${existFile1} == "0" ]; then
		echo "${s3One1} file not exist" >> ${one_time_log}
		fileExist=false
	fi

#	if [ ! -f "${s3One1}" ]; then
#		echo "${s3One1} file not exist" >> ${one_time_log}
#		fileExist=false
#	fi
	status=1
	string="File Is Zero";

	duFile1=`/usr/local/bin/aws s3 ls ${s3One1} | awk '{ print $3 }'`

	if [ -z ${duFile1} ]; then
		echo "${s3One1} file size is 0" >> ${one_time_log}
		fileExist=false
	fi

#	if [ ! -s "${s3One1}" ]; then
#		echo "${s3One1} file size is 0" >> ${one_time_log}
#		fileExist=false
#	fi

	echo -e ${fileExist}

	if [ "${fileExist}" = false ]; then
		echo "Not drop ${fullCurDate} database" >> ${one_time_log}
		sendExceptionMail
		continue
#		exit 0
	fi

	sizeOne1=${duFile1}

	echo -e "${s3One1} : ${sizeOne1}" >> ${one_time_log}

	status=2
	string="Drop DB Exception";

	cmd="/usr/bin/mongo ${one} --eval printjson(db.dropDatabase());"
	echo $cmd >> ${one_time_log}
	$cmd >> ${one_time_log}

	status=3
	string="Finish";

	sendSummaryMail
done