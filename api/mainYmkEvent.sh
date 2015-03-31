#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Clad YMK Event failed clad.cyberlink.com>/usr/local/countly/log/ymk_event.log" $(tail -20 /usr/local/countly/log/ymk_event.log)\
	| mail -s "Clad YMK Event Error Trap" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
	#sleep 1
	exit 0
}

start=$(date +%Y-%m-%d_%H-%M)
# get 1.5 months date
nowDate=$(date +%Y%m%d)
echo -e "nowDate=$nowDate"
beginDate=$(date -d "$nowDate - 1 months - 15 days" +%Y-%m-%d)
echo -e $beginDate

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

# backup Transfer table data on mysql


end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Clad YMK Event run from $start to $end\n" $(tail -20 /usr/local/countly/log/ymk_event.log)\
| mail -s "Clad YMK Event Finished" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com

