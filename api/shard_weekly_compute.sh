#!/bin/bash

startdate='20140601'
enddate=$(date -d "-7 hours" +%Y%m%d)
dbName='BcTest'
hostName='localhost'

#enddate=$(date -d "-7 hours" +%Y%m%d)
#hostName='192.168.2.211'

echo -e ${enddate}
echo -e "$(( (7 + $(date -d "${enddate}" +%w) ) % 7 ))"

if [ $(( (7 + $(date -d "${enddate}" +%w) ) % 7 )) -eq 0 ]; then
    diffDays=1
    monday=$(date -d "${enddate}+${diffDays} days" +%Y%m%d)
else
    diffDays=$(($((7+$(date -d "${enddate}" +%w)-1))%7))
    monday=$(date -d "${enddate}-${diffDays} days" +%Y%m%d)
fi
echo -e "$diffDays"
dateSave=${monday}
echo -e ${monday}

sunday=$(date -d "${monday}-0 days" +%Y%m%d)
dateStart=${sunday}

saturday=$(date -d "${monday}+6 days" +%Y%m%d)
dateEnd=${saturday}

mysqlDateSave=$(date -d "${dateSave}" +%Y-%m-%d)
mysqlDateStart=$(date -d "${dateStart}" +%Y-%m-%d)
mysqlDateEnd=$(date -d "${dateEnd}" +%Y-%m-%d)

for ((;1;)); do
    if [[ ${dateStart} < ${startdate} ]]; then
            break
    fi
#    echo -e "monday: ${dateSave}"
#    echo -e "sunday: ${dateStart}"
#    echo -e "saturday: ${dateEnd}"

#    echo -e "mysqlMonday: ${mysqlDateSave}"
#    echo -e "mysqlSunday: ${mysqlDateStart}"
#    echo -e "mysqlSaturday: ${mysqlDateEnd}"

    cmd="mysql -h ${hostName} -u root -pcyberlink#1 -e \"CALL ${dbName}.countlyIn_compute_weekly_new_session('${mysqlDateSave}','${mysqlDateStart}','${mysqlDateEnd}');\""
    echo -e "${cmd}"
    mysql -h ${hostName} -u root -pcyberlink#1 -e "CALL ${dbName}.countlyIn_compute_weekly_new_session('${mysqlDateSave}','${mysqlDateStart}','${mysqlDateEnd}');"

    dateSave=$(date -d "${dateSave}-7 days" +%Y%m%d)
    dateStart=$(date -d "${dateStart}-7 days" +%Y%m%d)
    dateEnd=$(date -d "${dateEnd}-7 days" +%Y%m%d)

    mysqlDateSave=$(date -d "${dateSave}" +%Y-%m-%d)
    mysqlDateStart=$(date -d "${dateStart}" +%Y-%m-%d)
    mysqlDateEnd=$(date -d "${dateEnd}" +%Y-%m-%d)
done

for ((;1;)); do
    if [[ ${dateStart} > ${enddate} ]]; then
            break
    fi
#    echo -e "monday: ${dateSave}"
#    echo -e "sunday: ${dateStart}"
#    echo -e "saturday: ${dateEnd}"

#    echo -e "mysqlMonday: ${mysqlDateSave}"
#    echo -e "mysqlSunday: ${mysqlDateStart}"
#    echo -e "mysqlSaturday: ${mysqlDateEnd}"

    cmd="mysql -h ${hostName} -u root -pcyberlink#1 -e \"CALL ${dbName}.countlyIn_compute_totalu_weekly('${mysqlDateSave}','${mysqlDateStart}','${mysqlDateEnd}');\""
    echo -e ${cmd}
    mysql -h ${hostName} -u root -pcyberlink#1 -e "CALL ${dbName}.countlyIn_compute_totalu_weekly('${mysqlDateSave}','${mysqlDateStart}','${mysqlDateEnd}');"

    dateSave=$(date -d "${dateSave}+7 days" +%Y%m%d)
    dateStart=$(date -d "${dateStart}+7 days" +%Y%m%d)
    dateEnd=$(date -d "${dateEnd}+7 days" +%Y%m%d)

    mysqlDateSave=$(date -d "${dateSave}" +%Y-%m-%d)
    mysqlDateStart=$(date -d "${dateStart}" +%Y-%m-%d)
    mysqlDateEnd=$(date -d "${dateEnd}" +%Y-%m-%d)
done

