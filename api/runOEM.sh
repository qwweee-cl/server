#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "Countly OEM Batch Error Please check log in clad.cyberlink.com>/usr/local/countly/log/oem_batch.log" $(tail -20 /usr/local/countly/log/oem_batch.log)\
	| mail -s "Countly OEM Batch Error Trap" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
	#sleep 1
	echo "Countly OEM Batch Error"
	exit 0
}

path="/usr/local/countly/api"
gzipPath="/mem/mongo_gzip/"
exportPath="/mem/mongo_backup/"
s3Path="/s3mnt/db_backup/raw_data/"
s3DashboardPath="/s3mnt/db_backup/dashboard_data/"
s3OEMPath="/s3mnt/db_backup/oem_raw_data/"
s3OEMDashboardPath="/s3mnt/db_backup/oem_dashboard_data/"
s3GenericDashboardPath="/s3mnt/db_backup/generic_dashboard_data/"
mongo="localhost:27017"
dashboard="claddb:27017"
batchdb=""
curdate=$(date +%Y%m%d)
rawdate=$curdate"_raw"
dashboarddate=$curdate"_countly"

## cat debug use
#path="/home/hadoop/gary/countly/api"
#dashboard="localhost:27017"
##

echo "==============================================================="
echo "======================Countly OEM Batch Start======================"
start=$(date +%Y-%m-%d_%H-%M)

if [ ! -d "$s3OEMPath" ]; then
	echo "mkdir $s3OEMPath"
	mkdir $s3OEMPath
fi
if [ ! -d "$s3OEMDashboardPath" ]; then
	echo "mkdir $s3OEMDashboardPath"
	mkdir $s3OEMDashboardPath
fi
if [ ! -d "$s3GenericDashboardPath" ]; then
	echo "mkdir $s3GenericDashboardPath"
	mkdir $s3GenericDashboardPath
fi

cd $path

cmd="node getBatchOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a raw_apps <<< "$string"

cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

cmd="node getGeneric.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a generic <<< "$string"
echo -e $generic

## backup generic dashboard data
cd $path
echo $PWD
dashboarddb="$generic"
oemdashboarddate="generic_"$dashboarddate
## backup countly dashboard data
## dump countly dashboard data
cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$oemdashboarddate"
echo $cmd
$cmd
## zip backup file
cd $exportPath
echo $PWD
cmd="/bin/tar czf $gzipPath$oemdashboarddate.tgz ./"
echo $cmd
$cmd
cmd="/bin/rm ./$oemdashboarddate -rf"
echo $cmd
$cmd
## move dashboard zip file to s3
if [ ! -d "$s3GenericDashboardPath" ]; then
	echo "mkdir $s3GenericDashboardPath"
	mkdir $s3GenericDashboardPath$generic
fi
cmd="/bin/cp $gzipPath$oemdashboarddate.tgz $s3GenericDashboardPath"
echo $cmd
$cmd
cmd="/bin/rm $gzipPath$oemdashboarddate.tgz"
echo $cmd
$cmd

## backup raw data
for (( i = 0 ; i < ${#raw_apps[@]} ; i++ )) do
	echo $i" "${raw_apps[$i]}
	cd $path

	cmd="$s3OEMPath${apps[$i]}"
	if [ ! -d "$cmd" ]; then
		echo -e $cmd
		mkdir $cmd
	fi
	cmd="$s3OEMDashboardPath${apps[$i]}"
	if [ ! -d "$cmd" ]; then
		echo -e $cmd
		mkdir $cmd
	fi
	batchdb=${raw_apps[$i]}

	OEMrawdate=${apps[$i]}"_"$rawdate
	cmd="mongodump -h $mongo -db $batchdb -o $exportPath$OEMrawdate"
	echo $cmd
	$cmd
	## zip backup file
	cd $exportPath
	echo $PWD
	cmd="/bin/tar czf $gzipPath$OEMrawdate.tgz ./"
	echo $cmd
	$cmd
	cmd="/bin/rm ./$OEMrawdate -rf"
	echo $cmd
	$cmd
	## add index in database
	cd $path
	cmd="/usr/bin/node $path/oemCreateIndex.js "${apps[$i]}
	echo -e $cmd
	$cmd
	## run batch
	cmd="/usr/bin/node $path/newBatchByOEM.js "${apps[$i]}
	echo $cmd
	$cmd
	## move zip file to s3
	if [ ! -d "$s3OEMPath${apps[$i]}" ]; then
		echo "mkdir $s3Path"
		mkdir $s3Path
	fi
	cmd="/bin/cp $gzipPath$OEMrawdate.tgz $s3OEMPath${apps[$i]}"
	echo $cmd
	$cmd
	cmd="/bin/rm $gzipPath$OEMrawdate.tgz"
	echo $cmd
	$cmd

	cd $path
	echo $PWD
	dashboarddb="countly_${apps[$i]}"
	oemdashboarddate=${apps[$i]}"_"$dashboarddate
	## backup countly dashboard data
	## dump countly dashboard data
	cmd="mongodump -h $dashboard -db $dashboarddb -o $exportPath$oemdashboarddate"
	echo $cmd
	$cmd
	## zip backup file
	cd $exportPath
	echo $PWD
	cmd="/bin/tar czf $gzipPath$oemdashboarddate.tgz ./"
	echo $cmd
	$cmd
	cmd="/bin/rm ./$oemdashboarddate -rf"
	echo $cmd
	$cmd
	## move dashboard zip file to s3
	if [ ! -d "$s3OEMDashboardPath${apps[$i]}" ]; then
		echo "mkdir $s3OEMDashboardPath${apps[$i]}"
		mkdir $s3OEMDashboardPath${apps[$i]}
	fi
	cmd="/bin/cp $gzipPath$oemdashboarddate.tgz $s3OEMDashboardPath${apps[$i]}"
	echo $cmd
	$cmd
	cmd="/bin/rm $gzipPath$oemdashboarddate.tgz"
	echo $cmd
	$cmd
	## remove raw data
	## mongo test --eval "printjson(db.getCollectionNames())"
	cmd="/usr/bin/mongo $mongo/$batchdb --eval printjson(db.dropDatabase());"
	echo $cmd
	$cmd
done

end=$(date +%Y-%m-%d_%H-%M)
echo $start
echo $end
echo "==============================================================="
echo -e "Countly OEM Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/oem_batch.log)\
| mail -s "Countly OEM Batch Finished" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
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
