#!/bin/bash

path="/usr/local/countly/api/"
start_date=$(date -d "-6 hours" +%Y%m%d)
start_round="00"

if [ -z "$1" ]; then
    echo "shardMongoToMysqlUU No argument supplied"
else
	start_date=$1
fi

if [ -z "$2" ]; then
    echo "shardMongoToMysqlUU No argument supplied"
else
	start_round="$2"
fi

echo $start_date
echo $start_round

cd ${path}

## process mongodb to mysql in claddb2
cmd="/usr/local/countly/api/shardMongoToMysql.sh ${start_date} ${start_round} >> /usr/local/countly/log/mongoToMysql.log"
echo $cmd
$cmd 2>&1
