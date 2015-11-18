#!/bin/bash
. /usr/local/countly/api/maillist.sh
## this is for test
logpath="/home/ubuntu/countly-test/log/shardUU/"
## this is for test end

logpath="/usr/local/countly/log/shardUU/"
alllogpath="/usr/local/countly/log/"

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	echo -e "[Shard]Mongo to Mysql Error Please check log in claddb2.cyberlink.com>"\
	"${alllogpath}mongoToMysql.log" $(tail -20 ${alllogpath}mongoToMysql.log)\
	| mail -s "[Shard]Mongo to Mysql Error Trap" ${AWSM}
	exit 0
}

## this is for test
path="/home/ubuntu/countly-test/api"
gzipPath="/mem/tmp/hourlyUU_gzip/"
exportPath="/mem/tmp/hourlyUU_backup/"
## this is for test end

path="/usr/local/countly/api"
gzipPath="/mem/tmp/hourlyUU_gzip/"
exportPath="/mem/tmp/hourlyUU_backup/"

s3Path="/s3mnt/shard_backup/uu_backup/"
s3PathFillZero="/s3mnt/shard_backup/uu_backup_fill_zero/"
curdate=$(date -d "-7 hours" +%Y%m%d)
mysqldate=$(date -d "-7 hours" +%Y-%m-%d)
dbName="BcTest"
dbNameFillZero="Test"

start=$(date +%Y-%m-%d_%H-%M)

if [ ! -d "${exportPath}" ]; then
	mkdir ${exportPath}
fi
if [ ! -d "${gzipPath}" ]; then
	mkdir ${gzipPath}
fi

if [ ! -d "${s3Path}" ]; then
	echo "mkdir ${s3Path}"
	mkdir $s3Path
fi

if [ ! -d "${s3PathFillZero}" ]; then
	echo "mkdir ${s3PathFillZero}"
	mkdir $s3PathFillZero
fi

if [ -z "$1" ]; then
    echo "shardMongoToMysqlUU No argument supplied"
else
	curdate=$1
	mysqldate=$(date -d "${1}" +%Y-%m-%d)
fi

if [ -z "$2" ]; then
    echo "shardMongoToMysqlUU No argument supplied"
else
	start_round="$2"
fi

echo -e "process ${curdate} ${start_round}"

cd ${path}
pwd
## run get countly YCP, YMK new user, active user, session
cmd="/usr/bin/node --max-old-space-size=4096 shardSaveUU.js"
echo -e $cmd
$cmd >> ${logpath}${curdate}_uu.log 2>&1

## run clean YCN before 1027
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbName}.zero_1027_YCN();' >> ${logpath}compute_YCN_1027.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbName}.zero_1027_YCN();" >> ${logpath}compute_YCN_1027.log 2>&1

## run compute daily total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbName}.countlyIn_compute_totalu_daily();' >> ${logpath}compute_daily_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbName}.countlyIn_compute_totalu_daily('"${mysqldate}"');" >> ${logpath}compute_daily_all.log 2>&1

## run compute monthly total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbName}.countlyIn_compute_totalu_monthly();' >> ${logpath}compute_monthly_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbName}.countlyIn_compute_totalu_monthly('"${mysqldate}"');" >> ${logpath}compute_monthly_all.log 2>&1

## run compute weekly new user, session, total user
cmd="${path}/shard_weekly_compute.sh"
echo -e $cmd
${cmd} >> ${logpath}${curdate}_weelky.log

cd $exportPath
pwd
## dump HourlyBcTest database
cmd="/usr/bin/mysqldump -u root -pcyberlink#1 
${dbName} countlyIn > "${curdate}"_countlyIn.sql"
echo -e $cmd
/usr/bin/mysqldump -u root -pcyberlink#1 ${dbName} countlyIn > ${curdate}_countlyIn.sql

## tar dump data that HourlyBcTest databse
cmd="tar czvf ${gzipPath}"${curdate}"_countlyIn.tgz "${curdate}"_countlyIn.sql"
echo -e $cmd
$cmd

## rm dump data
cmd="rm "${curdate}"_countlyIn.sql"
echo -e $cmd
$cmd

## backup tar file to S3
cmd="cp ${gzipPath}"${curdate}"_countlyIn.tgz ${s3Path}"
echo -e $cmd
$cmd

## rm tar file
cmd="rm ${gzipPath}"${curdate}"_countlyIn.tgz"
echo -e $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "[Shard]Mongo to Mysql run from $start to $end\n" $(tail -20 ${alllogpath}mongoToMysql.log)\
| mail -s "[Shard]Claddb2 [${curdate}] Mongo to Mysql Finished" ${AWSM}

echo "=============== File Zero for 8081 ==============="
echo "=============== File Zero for 8081 ===============" >> ${logpath}${curdate}_uu.log 2>&1

start=$(date +%Y-%m-%d_%H-%M)

cd ${path}
pwd
## run get countly YCP, YMK new user, active user, session
cmd="/usr/bin/node --max-old-space-size=4096 shardSaveUU_Fill.js"
echo -e $cmd
$cmd >> ${logpath}${curdate}_uu.log 2>&1

## run clean YCN before 1027
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbNameFillZero}.zero_1027_YCN();' >> ${logpath}compute_YCN_1027.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbNameFillZero}.zero_1027_YCN();" >> ${logpath}compute_YCN_1027.log 2>&1

## run compute daily total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbNameFillZero}.countlyIn_compute_totalu_daily();' >> ${logpath}compute_daily_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbNameFillZero}.countlyIn_compute_totalu_daily('"${mysqldate}"');" >> ${logpath}compute_daily_all.log 2>&1

## run compute monthly total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL ${dbNameFillZero}.countlyIn_compute_totalu_monthly();' >> ${logpath}compute_monthly_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL ${dbNameFillZero}.countlyIn_compute_totalu_monthly('"${mysqldate}"');" >> ${logpath}compute_monthly_all.log 2>&1

## run compute weekly new user, session, total user
cmd="${path}/shard_weekly_compute_fill_zero.sh"
echo -e $cmd
${cmd} >> ${logpath}${curdate}_weelky.log

cd $exportPath
pwd
## dump HourlyBcTest database
cmd="/usr/bin/mysqldump -u root -pcyberlink#1 
${dbNameFillZero} countlyIn > "${curdate}"_countlyIn_fill_zero.sql"
echo -e $cmd
/usr/bin/mysqldump -u root -pcyberlink#1 ${dbNameFillZero} countlyIn > ${curdate}_countlyIn_fill_zero.sql

## tar dump data that HourlyBcTest databse
cmd="tar czvf ${gzipPath}"${curdate}"_countlyIn_fill_zero.tgz "${curdate}"_countlyIn_fill_zero.sql"
echo -e $cmd
$cmd

## rm dump data
cmd="rm "${curdate}"_countlyIn_fill_zero.sql"
echo -e $cmd
$cmd

## backup tar file to S3
cmd="cp ${gzipPath}"${curdate}"_countlyIn_fill_zero.tgz ${s3PathFillZero}"
echo -e $cmd
$cmd

## rm tar file
cmd="rm ${gzipPath}"${curdate}"_countlyIn_fill_zero.tgz"
echo -e $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "[Shard Fill Zero]Mongo to Mysql run from $start to $end\n" $(tail -20 ${alllogpath}mongoToMysql.log)\
| mail -s "[Shard Fill Zero]Claddb2 [${curdate}] Mongo to Mysql Finished" ${AWSM}
