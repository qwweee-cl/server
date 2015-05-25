#!/bin/bash

nohup /usr/local/countly/api/loopSessionBatch.sh >> /usr/local/countly/log/loopSessionMain1.log 2>&1 & echo $! > /tmp/loopSessionBatch1.pid

