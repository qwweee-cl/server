#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Clad YMK Event failed clad.cyberlink.com>/usr/local/countly/log/ymkEvent_batch.log" $(tail -20 /usr/local/countly/log/ymkEvent_batch.log)\
	| mail -s "Clad YMK Event Error Trap" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
	#sleep 1
	exit 0
}
echo "YMK Event pid is [$$]"

start=$(date +%Y-%m-%d_%H-%M)
exportMySqlPath="/mem/mysql_backup/"
s3MySqlPath="/s3mnt/test/mysql_backup/"
# get 1.5 months date
nowDate=$(date +%Y%m%d)
echo -e "nowDate=$nowDate"
beginDate=$(date -d "$nowDate - 1 months - 15 days" +%Y-%m-%d)
echo -e $beginDate

nowDate=$(date +%Y%m%d)
echo $nowDate
if [ -z "$1" ]; then
    echo "ymkEvent No argument supplied"
else
	nowDate=$1
fi
echo $nowDate

# save rawlog to mysql log
node saveMysql.js
#node processData.js

# 1. delete data that in update range
# 2. generate YMK Event dashboard data (insert_transfer_data_in & insert_transfer_data_not_in)
query="call YMKData.delete_transfer_data('$beginDate');
call YMKData.insert_transfer_data_in('$beginDate');
call YMKData.insert_transfer_data_not_in('$beginDate');"

#query="call YMKData1.delete_transfer_data('$beginDate');
#call YMKData1.insert_transfer_data_in('$beginDate');
#call YMKData1.insert_transfer_data_not_in('$beginDate');"

mysql -h 54.248.118.203 -u ymk -pcyberlinkymk -e "$query"
#mysql -h localhost -u root -pcyberlinkymk -e "$query"

exportMySqlPath="/mem/mysql_backup/"
s3MySqlPath="/s3mnt/db_backup/mysql_backup/"
echo $PWD
if [ ! -d "$exportMySqlPath" ]; then
	mkdir $exportMySqlPath
fi
if [ ! -d "$s3MySqlPath" ]; then
	echo "mkdir $s3MySqlPath"
	mkdir $s3MySqlPath
fi

# backup Transfer table data on mysql
cd $exportMySqlPath
echo $PWD
#mysqldump -h claddb -u ymk -pcyberlinkymk YMKData > ymk_backup.sql
cmd="mysqldump -h claddb -u ymk -pcyberlinkymk YMKData"
echo -e $cmd
$cmd > "ymk_backup_$nowDate.sql"
#tar czvf ymk_backup.tgz ymk_backup.sql
cmd="tar czvf ymk_backup_$nowDate.tgz ymk_backup_$nowDate.sql"
echo -e $cmd
$cmd
#cp ymk_backup.tgz /s3mnt/db_backup/mysql_backup/
cmd="cp ymk_backup_$nowDate.tgz $s3MySqlPath"
echo -e $cmd
$cmd
#rm ymk_backup.*
cmd="rm ymk_backup_$nowDate.*"
echo -e $cmd
$cmd

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Clad YMK Event run from $start to $end\n" $(tail -20 /usr/local/countly/log/ymkEvent_batch.log)\
| mail -s "[$nowDate]Clad YMK Event Finished" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com

