#!/bin/bash

nohup /usr/local/countly/api/loopSessionBatch2.sh >> /usr/local/countly/log/loopSessionMain2.log 2>&1 & echo $! > /tmp/loopSessionBatch2.pid

