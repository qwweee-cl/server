#!/bin/bash

cmd="node getApps.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"

for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
	#echo $i" "${apps[$i]}
	#cmd='mongo claddb:27017/countly --eval "db.app_users'${apps[$i]}'.ensureIndex({app_user_id:1});"'
	cmd='mongo cat:27017/countly --eval "db.app_users'${apps[$i]}'.ensureIndex({app_user_id:1})"'
	cmd='db.app_users'${apps[$i]}'.ensureIndex({app_user_id:1});'
	echo -e $cmd
	#$cmd
done