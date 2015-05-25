#!/bin/bash

nohup /usr/local/countly/api/loopBackupRaw2.sh >> /usr/local/countly/log/loopBackupMain2.log 2>&1 & echo $! > /tmp/loopBackupRaw2.pid

