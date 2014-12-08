#!/bin/bash


path="/usr/local/countly/api"
gzipPath="/mem/mongo_gzip/"
exportPath="/mem/mongo_backup/"
s3Path="/s3fs/db_backup/raw_data/"
s3DashboardPath="/s3fs/db_backup/dashboard_data/"
s3OEMPath="/s3fs/db_backup/oem_raw_data/"
s3OEMDashboardPath="/s3fs/db_backup/oem_dashboard_data/"
mongo="localhost:27017"
dashboard="claddb:27017"
batchdb=""
curdate=$(date +%Y%m%d)
rawdate=$curdate"_raw"
dashboarddate=$curdate"_countly"

#path="/home/hadoop/gary/countly/api"
#dashboard="localhost:27017"

cd $path

cmd="node getRawOEMs.js"
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
	#$cmd
done
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
