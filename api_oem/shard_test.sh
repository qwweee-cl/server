#!/bin/bash

log_path="/home/hadoop/logs"
working_dir="/home/hadoop/gary/production/countly/api"
mail_target=${AWS}}
one_day_log="$log_path/log_hourly_computation_$(date +%Y%m%d).log"

cd $working_dir

T="$(date +%s)"

interval=$((6*3600));
round_num=$(((24*60*60) / 10#$interval))
rawdata_dir="/s3mnt/db_backup/hourly_data"
start_date=""
start_round=""
start_time=""
end_time=""

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]
then
  echo -e "please add one paramater: (1 = shard1, 2 = shard2) (start date:2015-01-01) (start round:0~3)"
  exit 1
else
  appType=${1}
  start_date=$(date -d "$2" +%Y%m%d)
  start_round=$(printf "%02d" $3)	
fi
	echo -e ${start_date}
	echo -e ${start_round}

while true;
do
	one_day_log="$log_path/log_hourly_session_$(date +%Y%m%d).log"
	if [ -f "$one_day_log" ]; then
		echo "" >> $one_day_log
	else
		echo "Loop start: $(date +%Y-%m-%d)" > $one_day_log
	fi
	start_time=$((10#$(date -d "-6 hours" +%H)*3600+10#$(date -d "-6 hours" +%M)*60+10#$(date -d "-6 hours" +%S)))
	cur_round=$(printf "%02d" $((10#$start_time/10#$interval)))
	old_data="0"

	echo -e "Process $start_date, round:$start_round, old_data:$old_data" >> $one_day_log 2>&1
	echo -e "Start Time: $(date +%Y-%m-%d,%H:%M:%S)" >> $one_day_log 2>&1

	echo -e "End Time: $(date +%Y-%m-%d,%H:%M:%S)" >> $one_day_log 2>&1

	echo -e ${start_date}
	echo -e ${start_round}

	if [ "$start_round" == "03" ] && [ "$old_data" == "0" ]; then
		echo "Loop end: $(date +%Y-%m-%d)" >> $one_day_log
		#/usr/bin/mail -s "Hourly Computation Summary ($start_date)" $mail_target < $one_day_log
	fi

	#go next round
	start_round=$(printf "%02d" $((10#$start_round + 1)))	
	if [ $((10#$start_round)) -ge $(($round_num)) ]; then
		start_round="00"
		start_date=$(date -d "$start_date 1 days" +%Y%m%d)
	fi

	end_time=$(date +%s)
	next_start_time=$(date -d "$start_date" +%s)
	next_start_time=$((10#$next_start_time + ((10#$start_round+1) * 10#$interval)))
	sleep_time=$((10#$next_start_time - 10#$end_time))

	#wait for next round
	if [ $sleep_time -ge 0 ]; then
		echo -e "Sleep $sleep_time seconds" >> $one_day_log
		echo -e "Sleep 60 seconds" >> $one_day_log
		#sleep $sleep_time
		sleep 60
	fi
done