#!/bin/bash

trap 'error_exp'  ERR SIGINT SIGTERM
function error_exp
{
	#echo -e "Daily BB data import failed. Please check log in elephant1>/home/hadoop/new_script/dashborad_script/logs/log_daily_bb_import.log\nLog scraps: "$(tail -10 ~/new_script/dashborad_script/logs/log_daily_bb_import.log)\
	#| mail -s "Daily BB data import exception" $dashboard_team
	echo -e "clad2 Countly OEM Batch Error Please check log in clad.cyberlink.com>/usr/local/countly/log/clad2_oem_batch.log" $(tail -20 /usr/local/countly/log/clad2_oem_batch.log)\
	| mail -s "Clad2 Countly OEM Batch Error Trap" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
	#sleep 1
	echo "Clad2 Countly OEM Batch Error"
	exit 0
}

path="/usr/local/countly/api"
gzipPath="/mem/mongo_gzip/"
exportPath="/mem/mongo_backup/"
s3Path="/s3mnt/db_backup/raw_data/"
s3DashboardPath="/s3mnt/db_backup/dashboard_data/"
s3OEMPath="/s3mnt/db_backup/clad2_raw/oem_raw_data/"
s3OEMDashboardPath="/s3mnt/db_backup/oem_dashboard_data/"
s3GenericDashboardPath="/s3mnt/db_backup/generic_dashboard_data/"
mongo="localhost:27017"
dashboard="claddb:27017"
remote="clad:27017"
remotedb=""
batchdb=""
curdate=$(date +%Y%m%d)
rawdate=$curdate"_raw"
dashboarddate=$curdate"_countly"

## cat debug use
#path="/home/hadoop/gary/countly/api"
#dashboard="localhost:27017"
#remote="cat:27017"
##

echo "==================================================================="
echo "==================Clad2 Countly OEM Batch Start===================="
start=$(date +%Y-%m-%d_%H-%M)

if [ ! -d "$s3OEMPath" ]; then
	echo "mkdir $s3OEMPath"
	mkdir $s3OEMPath
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

## backup raw data
for (( i = 0 ; i < ${#raw_apps[@]} ; i++ )) do
	echo $i" "${raw_apps[$i]}
	cd $path

	cmd="$s3OEMPath${apps[$i]}"
	if [ ! -d "$cmd" ]; then
		echo -e $cmd
		mkdir $cmd
	fi
	batchdb=${raw_apps[$i]}
	remotedb=${raw_apps[$i]}

	OEMrawdate=${apps[$i]}"_"$rawdate
	cmd="mongodump -h $mongo -db $batchdb -o $exportPath$OEMrawdate"
	echo $cmd
	$cmd

	echo $remotedb

	## restore db to remote db
	## mongorestore -h cat:27017 -d test_raw0 /mem/mongo_backup/20150225_raw/countly_raw0/
	cmd="mongorestore -h $remote -db $remotedb $exportPath$OEMrawdate/$batchdb"
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
echo -e "Clad2 Countly OEM Batch run from $start to $end\n" $(tail -20 /usr/local/countly/log/clad2_oem_batch.log)\
| mail -s "[$curdate]Clad2 Countly OEM Batch Finished" gary_huang@cyberlink.com,snow_chen@cyberlink.com,qwweee@gmail.com
exit 0
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
