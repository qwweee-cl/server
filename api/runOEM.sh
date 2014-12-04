#!/bin/bash

cd /home/hadoop/gary/countly/api/
cmd="node getOEMs.js"
echo -e $cmd
string=`$cmd`
IFS=', ' read -a apps <<< "$string"
#echo $array
for (( i = 0 ; i < ${#apps[@]} ; i++ )) do
echo $i" "${apps[$i]}
# yadda yadda
cmd="node newBatchByOEM.js "${apps[$i]}
echo -e $cmd
$cmd
done

#sudo restart countly-gary
