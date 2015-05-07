#!/bin/bash


trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	echo -e "Mongo to Mysql Error Please check log in clad.cyberlink.com>"\
	"/usr/local/countly/log/mongoToMysql.log" $(tail -20 /usr/local/countly/log/mongoToMysql.log)\
	| mail -s "Mongo to Mysql Error Trap" gary_huang@cyberlink.com,qwweee@gmail.com
	exit 0
}

##
##
path="/usr/local/countly/api"
gzipPath="/mnt_other/tmp/UU_gzip/"
exportPath="/mnt_other/tmp/UU_backup/"
s3Path="/s3mnt/db_backup/UU_backup/"
curdate=$(date +%Y%m%d)
mysqldate=$(date +%Y-%m-%d)

start=$(date +%Y-%m-%d_%H-%M)

if [ ! -d "$exportPath" ]; then
	mkdir $exportPath
fi
if [ ! -d "$gzipPath" ]; then
	mkdir $gzipPath
fi

if [ ! -d "$s3Path" ]; then
	echo "mkdir $s3Path"
	mkdir $s3Path
fi

if [ -z "$1" ]; then
    echo "mongoToMysqlUU No argument supplied"
else
	curdate=$1
	mysqldate=$(date -d "${1}" +%Y-%m-%d)
fi
echo $curdate

cd $path
pwd
## run get countly YCP, YMK new user, active user, session
cmd="/usr/bin/node --max-old-space-size=10240 saveUU.js"
echo -e $cmd
$cmd >> /usr/local/countly/log/${curdate}_uu.log 2>&1

## run compute daily total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL BcTest.countlyIn_compute_totalu_daily();' >> /usr/local/countly/log/compute_daily_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL BcTest.countlyIn_compute_totalu_daily('"$mysqldate"');" >> /usr/local/countly/log/compute_daily_all.log 2>&1

## run compute monthly total user
cmd="/usr/bin/mysql -u root -pcyberlink#1 -e 
'CALL BcTest.countlyIn_compute_totalu_monthly();' >> /usr/local/countly/log/compute_monthly_all.log"
echo -e $cmd
/usr/bin/mysql -u root -pcyberlink#1 -e "CALL BcTest.countlyIn_compute_totalu_monthly('"$mysqldate"');" >> /usr/local/countly/log/compute_monthly_all.log 2>&1

cd $exportPath
pwd
## dump BcTest database
cmd="/usr/bin/mysqldump -u root -pcyberlink#1 
BcTest countlyIn > "$curdate"_countlyIn.sql"
echo -e $cmd
/usr/bin/mysqldump -u root -pcyberlink#1 BcTest countlyIn > ${curdate}_countlyIn.sql

## tar dump data that BcTest databse
cmd="tar czvf $gzipPath"$curdate"_countlyIn.tgz "$curdate"_countlyIn.sql"
echo -e $cmd
$cmd

## rm dump data
cmd="rm "$curdate"_countlyIn.sql"
echo -e $cmd
$cmd

## backup tar file to S3
cmd="cp $gzipPath"$curdate"_countlyIn.tgz $s3Path"
echo -e $cmd
$cmd

## rm tar file
cmd="rm $gzipPath"$curdate"_countlyIn.tgz"
echo -e $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Mongo to Mysql run from $start to $end\n" $(tail -20 /usr/local/countly/log/mongoToMysql.log)\
| mail -s "Claddb [$curdate]Mongo to Mysql Finished" gary_huang@cyberlink.com,qwweee@gmail.com
