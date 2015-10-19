#!/bin/bash
. /usr/local/countly/api/maillist.sh
trap 'error_exp'  ERR SIGINT SIGTERM

LOCKFILE="/tmp/shardSessionBatchOEM.pid"
pid=`cat ${LOCKFILE}`

function error_exp
{
	echo -e "[Shard OEM] OEM Backup Dashboard Error Please check log ${one_time_log}"\
	$(tail -20 ${one_time_log})\
	| mail -s "[Shard OEM] OEM Backup Dashboard Error Trap(${pid})" ${mail_target}
	exit 0
}
function sendSummaryMail() {
	echo -e $(tail -20 $one_time_log)\
	| mail -s "[Shard OEM] OEM Session1 Loop Backup Dashboard Summary" ${AWSM}
}

logpath="/usr/local/countly/log/shardOEMSession/"

## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mnt/mongodb/tmp/mongo_dashboard_gzip/"
exportPath="/mnt/mongodb/tmp/mongo_dashboard_backup/"
s3DashboardPath="/mnt/mongodb/tmp/s3_data/"
## this is for test end

path="/usr/local/countly/api_oem"
gzipPath="/mem/mongo_hourly_dashboard_gzip/"
exportPath="/mem/mongo_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/db_backup/hourly_data/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/db_backup/hourly_data/dashboard_data/"
batchdb=""
indexNum="1"

gzipPath="/mem/mongo_oem_hourly_dashboard_gzip/"
exportPath="/mem/mongo_oem_hourly_dashboard_backup/"
s3DashboardPath="/s3mnt/shard_backup/OEM/dashboard_data/"
DashboardCachePath="/mem/tmp/s3cache/clcom2-countly/shard_backup/OEM/dashboard_data/"



savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

curdate=$(date +%Y%m%d-%H%M)

one_time_log="${logpath}${curdate}_log.log"

## backup dashboard need
checkTime=$(date +%H%M)
checkDate=$(date +%j)
beforeBackupTime="0500"
backupTime="0900"
afterbackupTime="1200"
sleepTime=10800 # this is for clad2
currBackup=$(date +%j)
## backup dashboard need end

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi
if [ ! -d "${s3DashboardPath}" ]; then
	echo "mkdir ${s3DashboardPath}"
	mkdir ${s3DashboardPath}
fi

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

## this is for test
dashboarddb="countly_test"
dashboard="cladtest:27017"
## this is for test end

dashboarddb="countly"
dashboard="claddb2:27017"

savedate=$(date +%Y%m%d)
dashboarddate=${savedate}"_countly"

## echo backup start time
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
echo -e "Backup Program(${pid}) starts on `date +"%Y-%m-%d %T"`."

cd $path
backupDate="$(date +%Y%m%d-%H%M)"

for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
	oemName="${apps[${i}]}"
	dashboarddb="countly_${oemName}"
	dashboarddate="${savedate}_countly_${oemName}"
	cmd="node shardGetSessionRoundByOEM.js ${oemName}"
	echo -e ${cmd}
	string=`${cmd}`
	oemStatus=$string

	echo -e "backupDate  : ${backupDate}" >> $one_time_log
	echo -e "${apps[${i}]} Status  : ${oemStatus}" >> $one_time_log

	echo -e "backupDate  : ${backupDate}"
	echo -e "${apps[${i}]} Status  : ${oemStatus}"

	## save dashboard backup begin
	cmd="node shardUpdateDashBackupBeginByOEM.js ${backupDate} ${oemName} ${oemStatus}"
	echo -e ${cmd}
	string=`${cmd}`
	echo -e ${string}

	## process dashboard backup
	cd $exportPath
	## backup countly dashboard data
	## dump countly dashboard data
	cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$dashboarddate"
	echo $cmd
	$cmd
	## zip backup file
	cd $exportPath
	echo $PWD
	cmd="/bin/tar czf $gzipPath$dashboarddate.tgz ./"
	echo $cmd
	$cmd
	cmd="/bin/rm ./$dashboarddate -rf"
	echo $cmd
	$cmd
	## move dashboard zip file to s3
	if [ ! -d "$s3DashboardPath" ]; then
		echo "mkdir $s3DashboardPath"
		mkdir $s3DashboardPath
	fi
	cmd="/bin/cp $gzipPath$dashboarddate.tgz $s3DashboardPath"
	echo $cmd
	$cmd
	cmd="/bin/rm $gzipPath$dashboarddate.tgz"
	echo $cmd
	$cmd

	cmd="sudo rm ${DashboardCachePath} -rf"
	echo $cmd
	$cmd

	## save dashboard backup end
	cd $path
	cmd="node shardUpdateDashBackupEndByOEM.js ${backupDate}"
	echo -e ${cmd}
	string=`${cmd}`
	echo -e ${string}

	## echo backup stop time
	echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`." 2>&1 >> $one_time_log
	echo -e "Backup Program(${pid}) stops on `date +"%Y-%m-%d %T"`."
done

sendSummaryMail
exit 0
