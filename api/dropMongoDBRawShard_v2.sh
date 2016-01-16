#!/bin/bash
. /usr/local/countly/api/maillist.sh
logpath="/usr/local/countly/log/dropDatabase/"
status=0
string="File Not Exist";
trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	mail -s "[Shard New][Wrong] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
	exit 0
}

function sendExceptionMail() {
	mail -s "[Shard New][Wrong] ${fullCurDate} MongoDB drop database exception (${string})" ${dropMongo} < ${one_time_log}
}

function sendSummaryMail() {
	mail -s "[Shard New] ${fullCurDate} Finish drop database" ${dropMongo} < ${one_time_log}
}

path="/usr/local/countly/api"
cd ${path}

mongo="localhost:27017"
s3Path="/s3mnt/shard_backup/hourly_data/"
cmds3DashboardPath="/s3mnt/shard_backup/dashboard_data/"
cmds3Path="s3://clcom2-countly/shard_backup/hourly_data/"
cmds3Path="s3://clcom2-countly/test_backup/hourly_data/"

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
s3One3=${s3Path}${fullCurDate}"_raw_00_3.tgz"
s3One1=${cmds3Path}${fullCurDate}"_raw_00_1.tgz"
s3One2=${cmds3Path}${fullCurDate}"_raw_00_2.tgz"
s3One3=${cmds3Path}${fullCurDate}"_raw_00_3.tgz"

s3Two1=${s3Path}${fullCurDate}"_raw_01_1.tgz"
s3Two2=${s3Path}${fullCurDate}"_raw_01_2.tgz"
s3Two3=${s3Path}${fullCurDate}"_raw_01_3.tgz"
s3Two1=${cmds3Path}${fullCurDate}"_raw_01_1.tgz"
s3Two2=${cmds3Path}${fullCurDate}"_raw_01_2.tgz"
s3Two3=${cmds3Path}${fullCurDate}"_raw_01_3.tgz"

s3Three1=${s3Path}${fullCurDate}"_raw_02_1.tgz"
s3Three2=${s3Path}${fullCurDate}"_raw_02_2.tgz"
s3Three3=${s3Path}${fullCurDate}"_raw_02_3.tgz"
s3Three1=${cmds3Path}${fullCurDate}"_raw_02_1.tgz"
s3Three2=${cmds3Path}${fullCurDate}"_raw_02_2.tgz"
s3Three3=${cmds3Path}${fullCurDate}"_raw_02_3.tgz"

s3Four1=${s3Path}${fullCurDate}"_raw_03_1.tgz"
s3Four2=${s3Path}${fullCurDate}"_raw_03_2.tgz"
s3Four3=${s3Path}${fullCurDate}"_raw_03_3.tgz"
s3Four1=${cmds3Path}${fullCurDate}"_raw_03_1.tgz"
s3Four2=${cmds3Path}${fullCurDate}"_raw_03_2.tgz"
s3Four3=${cmds3Path}${fullCurDate}"_raw_03_3.tgz"

echo -e ${s3One1}
echo -e ${s3One2}
echo -e ${s3One3}
echo -e ${s3Two1}
echo -e ${s3Two2}
echo -e ${s3Two3}
echo -e ${s3Three1}
echo -e ${s3Three2}
echo -e ${s3Three3}
echo -e ${s3Four1}
echo -e ${s3Four2}
echo -e ${s3Four3}

existFile1_1=`aws s3 ls ${s3One1} | wc -l`
existFile1_2=`aws s3 ls ${s3One2} | wc -l`
existFile1_3=`aws s3 ls ${s3One3} | wc -l`
existFile2_1=`aws s3 ls ${s3Two1} | wc -l`
existFile2_2=`aws s3 ls ${s3Two2} | wc -l`
existFile2_3=`aws s3 ls ${s3Two3} | wc -l`
existFile3_1=`aws s3 ls ${s3Three1} | wc -l`
existFile3_2=`aws s3 ls ${s3Three2} | wc -l`
existFile3_3=`aws s3 ls ${s3Three3} | wc -l`
existFile4_1=`aws s3 ls ${s3Four1} | wc -l`
existFile4_2=`aws s3 ls ${s3Four2} | wc -l`
existFile4_3=`aws s3 ls ${s3Four3} | wc -l`

fileExist=true

if [ ${existFile1_1} == "0" ] || [ ${existFile1_2} == "0" ] || [ ${existFile1_3} == "0" ]; then
	echo "${s3One1} or ${s3One2} or ${s3One3} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ${existFile2_1} == "0" ] || [ ${existFile2_2} == "0" ] || [ ${existFile2_3} == "0" ]; then
	echo "${s3Two1} or ${s3Two2} or ${s3Two3} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ${existFile3_1} == "0" ] || [ ${existFile3_2} == "0" ] || [ ${existFile3_3} == "0" ]; then
	echo "${s3Three1} or ${s3Three2} or ${s3Three3} file not exist" >> ${one_time_log}
	fileExist=false
fi
if [ ${existFile4_1} == "0" ] || [ ${existFile4_2} == "0" ] || [ ${existFile4_3} == "0" ]; then
	echo "${s3Four1} or ${s3Four2} or ${s3Four3} file not exist" >> ${one_time_log}
	fileExist=false
fi

## use s3fs to get file information
#if [ ! -f ${s3One1} ] || [ ! -f ${s3One2} ]; then
#	echo "${s3One1} or ${s3One2} file not exist" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -f ${s3Two1} ] || [ ! -f ${s3Two2} ]; then
#	echo "${s3Two1} or ${s3Two2} file not exist" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -f ${s3Three1} ] || [ ! -f ${s3Three2} ]; then
#	echo "${s3Three1} or ${s3Three2} file not exist" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -f ${s3Four1} ] || [ ! -f ${s3Four2} ]; then
#	echo "${s3Four1} or ${s3Four2} file not exist" >> ${one_time_log}
#	fileExist=false
#fi
status=1
string="File Is Zero";

duFile1_1=`aws s3 ls ${s3One1} | awk '{ print $3 }'`
duFile1_2=`aws s3 ls ${s3One2} | awk '{ print $3 }'`
duFile1_3=`aws s3 ls ${s3One3} | awk '{ print $3 }'`
duFile2_1=`aws s3 ls ${s3Two1} | awk '{ print $3 }'`
duFile2_2=`aws s3 ls ${s3Two2} | awk '{ print $3 }'`
duFile2_3=`aws s3 ls ${s3Two3} | awk '{ print $3 }'`
duFile3_1=`aws s3 ls ${s3Three1} | awk '{ print $3 }'`
duFile3_2=`aws s3 ls ${s3Three2} | awk '{ print $3 }'`
duFile3_3=`aws s3 ls ${s3Three3} | awk '{ print $3 }'`
duFile4_1=`aws s3 ls ${s3Four1} | awk '{ print $3 }'`
duFile4_2=`aws s3 ls ${s3Four2} | awk '{ print $3 }'`
duFile4_3=`aws s3 ls ${s3Four3} | awk '{ print $3 }'`

if [ -z ${duFile1_1} ] || [ -z ${duFile1_2} ] || [ -z ${duFile1_3} ]; then
	echo "${s3One1} or ${s3One2} or ${s3One3} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ -z ${duFile2_1} ] || [ -z ${duFile2_2} ] || [ -z ${duFile2_3} ]; then
	echo "${s3Two1} or ${s3Two2} or ${s3Two3} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ -z ${duFile3_1} ] || [ -z ${duFile3_2} ] || [ -z ${duFile3_3} ]; then
	echo "${s3Three1} or ${s3Three2} or ${s3Three3} file size is 0" >> ${one_time_log}
	fileExist=false
fi
if [ -z ${duFile4_1} ] || [ -z ${duFile4_2} ] || [ -z ${duFile4_3} ]; then
	echo "${s3Four1} or ${s3Four2} or ${s3Four3} file size is 0" >> ${one_time_log}
	fileExist=false
fi

## use s3fs to get file information
#if [ ! -s ${s3One1} ] || [ ! -s ${s3One2} ]; then
#	echo "${s3One1} or ${s3One1} file size is 0" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -s ${s3Two1} ] || [ ! -s ${s3Two2} ]; then
#	echo "${s3Two1} or ${s3Two2} file size is 0" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -s ${s3Three1} ] || [ ! -s ${s3Three2} ]; then
#	echo "${s3Three1} or ${s3Three2} file size is 0" >> ${one_time_log}
#	fileExist=false
#fi
#if [ ! -s ${s3Four1} ] || [ ! -s ${s3Four2} ]; then
#	echo "${s3Four1} or ${s3Four2} file size is 0" >> ${one_time_log}
#	fileExist=false
#fi

echo -e ${fileExist}

if [ ${fileExist} = false ]; then
	echo "Not drop ${fullCurDate} database" >> ${one_time_log}
	sendExceptionMail
	exit 0
fi

sizeOne1=${duFile1_1}
sizeOne2=${duFile1_2}
sizeOne3=${duFile1_3}
sizeTwo1=${duFile2_1}
sizeTwo2=${duFile2_2}
sizeTwo3=${duFile2_3}
sizeThree1=${duFile3_1}
sizeThree2=${duFile3_2}
sizeThree3=${duFile3_3}
sizeFour1=${duFile4_1}
sizeFour2=${duFile4_2}
sizeFour3=${duFile4_3}

#sizeOne1=$(du -b "${s3One1}" | cut -f 1)
#sizeOne2=$(du -b "${s3One2}" | cut -f 1)
#sizeTwo1=$(du -b "${s3Two1}" | cut -f 1)
#sizeTwo2=$(du -b "${s3Two2}" | cut -f 1)
#sizeThree1=$(du -b "${s3Three1}" | cut -f 1)
#sizeThree2=$(du -b "${s3Three2}" | cut -f 1)
#sizeFour1=$(du -b "${s3Four1}" | cut -f 1)
#sizeFour2=$(du -b "${s3Four2}" | cut -f 1)

echo -e "${s3One1} : ${sizeOne1}" >> ${one_time_log}
echo -e "${s3One2} : ${sizeOne2}" >> ${one_time_log}
echo -e "${s3One3} : ${sizeOne3}" >> ${one_time_log}
echo -e "${s3Two1} : ${sizeTwo1}" >> ${one_time_log}
echo -e "${s3Two2} : ${sizeTwo2}" >> ${one_time_log}
echo -e "${s3Two3} : ${sizeTwo3}" >> ${one_time_log}
echo -e "${s3Three1} : ${sizeThree1}" >> ${one_time_log}
echo -e "${s3Three2} : ${sizeThree2}" >> ${one_time_log}
echo -e "${s3Three3} : ${sizeThree3}" >> ${one_time_log}
echo -e "${s3Four1} : ${sizeFour1}" >> ${one_time_log}
echo -e "${s3Four2} : ${sizeFour2}" >> ${one_time_log}
echo -e "${s3Four3} : ${sizeFour3}" >> ${one_time_log}

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
