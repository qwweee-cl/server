import threading
import subprocess
import time
import sys
import os
import datetime
import AutoUtils as utils
from AutoUtils import app_keys as aKeys
from AutoUtils import executeCmd as execute
from AutoUtils import executeMultiCommand as exeMultiCmds
from AutoUtils import executeMultiCommandsWithDiffLog as exeMultiCmdsDiffLog

def saveSessionsToFiles(app_key, prefix, ext, parts):
    p = subprocess.Popen(['node', 'distinctSessions.js', app_key, prefix, ext, str(parts)],
                         shell=False,
                         stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE)

    while True:
        lineout = p.stdout.readline()
        if lineout: log(lineout)
        if not lineout: break
    
    while True: # if no output, use this block to check error.
        lineout = p.stderr.readline()
        if lineout: log("!!Err: " + lineout)
        if not lineout: break
            
def modifyConfigBatchDB(db_name):
    config = open('config.js', 'r')
    lines = config.readlines()
    config.close() # read lines and close
    idxBatchStr = -1
    for line in lines:
        if -1 != line.find('db_batch'):
            idxBatchStr = lines.index(line)
            break
    
    if -1 == idxBatchStr: return False
    
    listBatchStr = lines[idxBatchStr].split('"')
    listBatchStr[1] = ('"%s"' % db_name)
    lines[idxBatchStr] = "".join(listBatchStr)
    config = open('config.js', 'w') # open file again to write
    for line in lines: config.write(line)
    config.close()
    return True
        
def getFileName(prefix, index, ext):
    return os.path.join(os.getcwd(), 'RawSession', prefix + str(index) + ext)
    #return r'RawSession/' + prefix + str(index) + ext

#### main function to distinct sessions
def distinctSessions(and_key, ios_key, log):
    startTime = time.time()
    
    listCmds = []
    listCmds.append(['node', 'distinctSessions.js', and_key, '_sessions_and_', '.txt', str(TOTAL_USER_PART_AND)])
    listCmds.append(['node', 'distinctSessions.js', ios_key, '_sessions_ios_', '.txt', str(TOTAL_USER_PART_IOS)])
    exeMultiCmds(listCmds, log, False)
    
    endTime = time.time()
    log(("**** Time cost on Distinct Sessions = " + str(endTime-startTime) + " seconds\n"))
    
#### main function to calculate sessions
def calculateSessions(and_key, ios_key):
    listLogPath = []
    listCmds = []
    for i in xrange(0, TOTAL_USER_PART_AND):
        logPath = os.path.join(os.getcwd(), LOG_FOLDER, db_name + THREAD_NAME_PREFIX_AND + str(i))
        listLogPath.append(logPath)
        fileName = getFileName('_sessions_and_', i, ".txt")
        listCmds.append(['node', 'sessionNewBatch_v2.js', and_key, fileName])
    
    for i in xrange(0, TOTAL_USER_PART_IOS):
        logPath = os.path.join(os.getcwd(), LOG_FOLDER, db_name + THREAD_NAME_PREFIX_IOS + str(i))
        listLogPath.append(logPath)
        fileName = getFileName('_sessions_ios_', i, ".txt")
        listCmds.append(['node', 'sessionNewBatch_v2.js', ios_key, fileName])
        
    exeMultiCmdsDiffLog(listCmds, listLogPath, False)
    
####
    
LOG_FOLDER = "LogSessionMT"
    
TOTAL_USER_PART_AND = 10
TOTAL_USER_PART_IOS = 4
THREAD_NAME_PREFIX_AND = "_and_thread_"
THREAD_NAME_PREFIX_IOS = "_ios_thread_"

if __name__ == '__main__':
    # get db name from argument
    db_name = None if 0 == len(sys.argv) else sys.argv[1]
    optApps = "ALL" if 2 > len(sys.argv) else sys.argv[2] # YCP+YMK, PF, ALL(default)
    
    logPath = os.path.join(os.getcwd(), LOG_FOLDER, "sessionMT_"+db_name)
    logger = utils.CLogger(logPath)
    log = logger.log
    log("sessionMT begin.\n")
    startTime = time.time()

    # need to modify config.js to make sure distinct users and session calculation use right db
    if(not modifyConfigBatchDB(db_name)):
        log("Cannot modify batch db\n")
        logger = None
        exit(1)
    log("Modify batch db okay.\n")
    
    if("ALL" == optApps or "PF" == optApps):
        distinctSessions(aKeys["Perfect_And"], aKeys["Perfect_iOS"], log)
        calculateSessions(aKeys["Perfect_And"], aKeys["Perfect_iOS"])
    
    if("ALL" == optApps or "YCP+YMK" == optApps):
        distinctSessions(aKeys["YouCam_Perfect_And"], aKeys["YouCam_Perfect_iOS"], log)
        calculateSessions(aKeys["YouCam_Perfect_And"], aKeys["YouCam_Perfect_iOS"])
        
        distinctSessions(aKeys["YouCam_MakeUp_And"], aKeys["YouCam_MakeUp_iOS"], log)
        calculateSessions(aKeys["YouCam_MakeUp_And"], aKeys["YouCam_MakeUp_iOS"])

        distinctSessions(aKeys["YouCam_Nail_And"], aKeys["YouCam_Nail_iOS"], log)
        calculateSessions(aKeys["YouCam_Nail_And"], aKeys["YouCam_Nail_iOS"])

    endTime = time.time()
    log(("**** Finished. Time cost on sessionMT = " + str(endTime-startTime) + " seconds\n"))
