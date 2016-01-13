#!/bin/bash
. /usr/local/countly/api/maillist.sh

trap 'error_exp'  ERR SIGINT SIGTERM

function error_exp
{
	echo -e $(cat $one_day_log)\
	| mail -s "[Wrong][ShardNew] Session${indexNum} ${startDate}_${startRound} S3 to Local Mongodb Trap" ${AWSM}
	exit 1
}

function sendSummaryMail() {
	echo -e $(cat $one_day_log)\
	| mail -s "[ShardNew] Session${indexNum} ${startDate}_${startRound} S3 to Local Mongodb Summary" ${AWSM}
}

log_path="/usr/local/countly/log/shardSession"
working_dir="/usr/local/countly/api"
mail_target=${AWSM}
one_day_log="$log_path/new_log_mongotolocal_$(date +%Y%m%d).log"

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
  echo -e "please add one paramater: date(20151212) round(00~03) dbName(countly_raw1212_00) index (1 or 2)"
  exit 1
else
  startDate="${1}"
  startRound="${2}"
  dbName="${3}"
  indexNum="${4}"
fi

if [ ${indexNum} -eq "1" ]; then
  echo -e "index1 untar ymk, ycn, ycp"
  untarFiles="--wildcards *session_e315c111663af26a53e5fe4c82cc1baeecf50599* *session_c277de0546df31757ff26a723907bc150add4254* *session_75edfca17dfbe875e63a66633ed6b00e30adcb92* *session_9219f32e8de29b826faf44eb9b619788e29041bb* *session_895ef49612e79d93c462c6d34abd8949b4c849af* *session_ecc26ef108c821f3aadc5e283c512ee68be7d43e* "
else
  echo -e "index2 untar pf, bcs"
  untarFiles="--wildcards *session_0368eb926b115ecaf41eff9a0536a332ef191417* *session_02ce3171f470b3d638feeaec0b3f06bd27f86a26* *session_488fea5101de4a8226718db0611c2ff2daeca06a* *session_7cd568771523a0621abff9ae3f95daf3a8694392* "
fi

downloadPath="/mem/download_mongodb/"
untarPath="/data/untar_mongodb/"

if [ ! -d "${downloadPath}" ]; then
	mkdir ${downloadPath}
fi
if [ ! -d "${untarPath}" ]; then
	mkdir ${untarPath}
fi

shard1FileName="${startDate}_raw_${startRound}_1.tgz"

echo -e "${shard1FileName}"

s3DownloadPath="s3://clcom2-countly/shard_backup/hourly_data/"

echo -e "${s3DownloadPath}${shard1FileName}"

echo -e "S3 to Local Mongodb Start on `date +"%Y-%m-%d %T"`." 2>&1 >> ${one_day_log}
echo -e "S3 to Local Mongodb Start on `date +"%Y-%m-%d %T"`."

## download file use aws cli from s3 to local shard1FileName
cmd="aws s3 cp ${s3DownloadPath}${shard1FileName} ${downloadPath}${shard1FileName}"
echo -e "${cmd}" 2>&1 >> ${one_day_log}
${cmd} 2>&1 >> ${one_day_log}

## untar shard1FileName to untarPath
cmd="tar xzf ${downloadPath}${shard1FileName} -C ${untarPath} ${untarFiles}"
echo -e "${cmd}" 2>&1 >> ${one_day_log}
${cmd} 2>&1 >> ${one_day_log}

## rm shard1FileName download file
cmd="rm -rf ${downloadPath}${shard1FileName}"
echo -e "${cmd}" 2>&1 >> ${one_day_log}
${cmd} 2>&1 >> ${one_day_log}

## mongorestore files to local mongodb
cmd="mongorestore -d ${dbName} ${untarPath}${startDate}_raw_${startRound}_1/${dbName}"
echo -e "${cmd}" 2>&1 >> ${one_day_log}
${cmd} 2>&1 >> ${one_day_log}

## rm untar files
cmd="rm -rf ${untarPath}${startDate}_raw_${startRound}_1"
echo -e "${cmd}" 2>&1 >> ${one_day_log}
${cmd} 2>&1 >> ${one_day_log}

echo -e "S3 to Local Mongodb End on `date +"%Y-%m-%d %T"`." 2>&1 >> ${one_day_log}
echo -e "S3 to Local Mongodb End on `date +"%Y-%m-%d %T"`."

sendSummaryMail
