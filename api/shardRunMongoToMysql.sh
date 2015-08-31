#!/bin/bash

path="/usr/local/countly/api/"
curdate=$(date -d "-6 hours" +%Y%m%d)
echo $curdate

cd ${path}

## process mongodb to mysql in claddb2
cmd="/usr/local/countly/api/shardMongoToMysql.sh ${curdate} >> /usr/local/countly/log/mongoToMysql.log"
echo $cmd
$cmd 2>&1
