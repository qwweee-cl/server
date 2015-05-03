#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Countly OEM Batch Error Please check log in clad.cyberlink.com>/usr/local/countly/log/oem_batch.log" $(tail -20 /usr/local/countly/log/oem_batch.log)\
	| mail -s "[test]Main Countly OEM Batch Error Trap" gary_huang@cyberlink.com,qwweee@gmail.com
	#sleep 1
	echo "Countly OEM Batch Error"
	exit 0
}
echo "Main Run OEM pid is [$$]"
path="/usr/local/countly/api"
gzipPath="/mem/mongo_gzip/"
exportPath="/mem/mongo_backup/"
s3Path="/s3mnt/test/raw_data/"
s3DashboardPath="/s3mnt/test/dashboard_data/"
s3OEMPath="/s3mnt/test/oem_raw_data/"
s3OEMDashboardPath="/s3mnt/test/oem_dashboard_data/"
mongo="localhost:27017"
dashboard="test-clad1:27017"
batchdb=""
curdate=$(date +%Y%m%d)
echo $curdate
if [ -z "$1" ]; then
    echo "runOEM No argument supplied"
else
	curdate=$1
fi
echo $curdate

rawdate=$curdate"_raw"
dashboarddate=$curdate"_countly"

## cat debug use
#path="/home/hadoop/gary/countly/api"
#dashboard="localhost:27017"
##

echo "==============================================================="
echo "======================Countly OEM Batch Start======================"
start=$(date +%Y-%m-%d_%H-%M)

cd $path

cmd="node getBatchOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a raw_apps <<< "$string"

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

## backup raw data
for (( i = 0 ; i < ${#raw_apps[@]} ; i++ )) do
	echo $i" "${raw_apps[$i]}
	
	cd $path
	cmd="/usr/bin/node $path/oemCreateIndex.js "${apps[$i]}
	echo -e $cmd
	$cmd
	## run batch
	cmd="/usr/bin/node $path/testNewBatchByOEM.js "${apps[$i]}
	echo $cmd
	$cmd
	## remove raw data
	## mongo test --eval "printjson(db.getCollectionNames())"
	cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
	echo $cmd
	#$cmd
done

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Countly OEM Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/oem_batch.log)\
| mail -s "[test]Main [$curdate]Countly OEM Batch Finished" gary_huang@cyberlink.com,qwweee@gmail.com
## zip backup file
#exit 0
#cd /home/hadoop/gary/countly/api/
#cmd="node oemCreateIndex.js"
#echo -e $cmd
#$cmd

#for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
	#echo $i" "${apps[$i]}
	# yadda yadda
#	cmd="node newBatchByOEM.js "${apps[$i]}
#	echo -e $cmd
	#$cmd
#done

#sudo restart countly-gary
