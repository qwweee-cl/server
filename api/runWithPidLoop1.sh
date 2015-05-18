#!/bin/bash

nohup /usr/local/countly/api/loopBackupRaw.sh > /usr/local/countly/log/loopBackupMain1.log 2>&1 & echo $! > /tmp/loopBackupRaw.pid

