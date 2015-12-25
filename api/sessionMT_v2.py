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
    if and_key:
        for i in xrange(0, TOTAL_USER_PART_AND):
            logPath = os.path.join(os.getcwd(), LOG_FOLDER, db_name + THREAD_NAME_PREFIX_AND + str(i))
            listLogPath.append(logPath)
            fileName = getFileName('_sessions_and_', i, ".txt")
            listCmds.append(['node', 'sessionNewBatch_v2.js', and_key, fileName])
    
    if ios_key:
        for i in xrange(0, TOTAL_USER_PART_IOS):
            logPath = os.path.join(os.getcwd(), LOG_FOLDER, db_name + THREAD_NAME_PREFIX_IOS + str(i))
            listLogPath.append(logPath)
            fileName = getFileName('_sessions_ios_', i, ".txt")
            listCmds.append(['node', 'sessionNewBatch_v2.js', ios_key, fileName])
        
    exeMultiCmdsDiffLog(listCmds, listLogPath, False)
    
####

def raiseExceptionAndExit(log):
    print "Prepare distinct session failed. Raise Exception."
    log("Prepare distinct session failed. Raise Exception.")
    raise ValueError('Did not parse all sessions.')
    exit(1)

class CCountSessionWorker(threading.Thread):
    def __init__(self, cmd):
        threading.Thread.__init__(self)
        self.cmd = cmd
        self.__nError = S_OK
        self.__dictSummary = {"Sessions":0, "Users":0}
        self.__logSummary = ""
        self.__logError = ""

    def run(self):
        print "Execute Command: " + " ".join(self.cmd) + "\n"
        p = subprocess.Popen(self.cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        while True:
            lineout = p.stdout.readline()
            if lineout:
                self.__logSummary += lineout
                if -1 != lineout.find("Total Session Count"):
                    self.__dictSummary["Sessions"] = lineout.split(": ")[1]
            
            else: break
        
        while True:
            lineout = p.stderr.readline()
            if lineout: self.__logError += lineout
            else: break
        
    def getSessionCount(self):
        return int(self.__dictSummary["Sessions"])
    def getError(self):
        return self.__nError
    def getSummaryLog(self):
        return self.__logSummary
    def getErrorLog(self):
        return self.__logError

def countSession(and_key, ios_key):
    workerAnd = CCountSessionWorker(['node', 'countSessions.js', and_key]) if and_key else None
    workerIOS = CCountSessionWorker(['node', 'countSessions.js', ios_key]) if ios_key else None
    if workerAnd: workerAnd.start()
    if workerIOS: workerIOS.start()
    if workerAnd: workerAnd.join()
    if workerIOS: workerIOS.join()
    return workerAnd.getSessionCount() if workerAnd else 0, workerIOS.getSessionCount() if workerIOS else 0
    
S_OK = 0
E_FAIL = 1
class CDistinctSessionWorker(threading.Thread):
    def __init__(self, app_key, file_name, skip_num, limit_num):
        threading.Thread.__init__(self)
        self.limit_num = limit_num
        self.cmd = ['node', 'distinctSessions.js', app_key, file_name, str(skip_num), str(limit_num)]
        self.__nError = S_OK
        self.__dictSummary = {"Sessions":0, "Users":0}
        self.__logSummary = ""
        self.__logError = ""

    def run(self):
        self.execute_cmd()
        # check session number got < 1% limit difference
        if abs(int(self.__dictSummary["Sessions"]) - self.limit_num) > self.limit_num * 0.01:
            time.sleep(5)
            self.execute_cmd()

    def execute_cmd(self):
        print "Execute Command: " + " ".join(self.cmd) + "\n"
        p = subprocess.Popen(self.cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        while True:
            lineout = p.stdout.readline()
            if lineout:
                self.__logSummary += lineout
                if -1 != lineout.find("Sessions Count"):
                    self.__dictSummary["Sessions"] = lineout.split(": ")[1]
                elif -1 != lineout.find("Users Count"):
                    self.__dictSummary["Users"] = lineout.split(": ")[1]
            
            else:
                # print "[Err] Cannot get output log for command: " + " ".join(self.cmd) + "\n"
                break
        
        while True:
            lineout = p.stderr.readline()
            if lineout: self.__logError += lineout
            else:
                # print "[Err] Cannot get error log for command: " + " ".join(self.cmd) + "\n"
                break
        
    def getSessionCount(self):
        return int(self.__dictSummary["Sessions"])
    def getUserCount(self):
        return int(self.__dictSummary["Users"])
    def getError(self):
        return self.__nError
    def getSummaryLog(self):
        return self.__logSummary
    def getErrorLog(self):
        return self.__logError
    
def generateDistinctSessionWorker(app_key, nTotalSessions, filePrefix, filePostfix, nFilePart):
    arySessionWorker = []
    nAvgSession = nTotalSessions / nFilePart
    for i in xrange(nFilePart):
        nSkipNumber = i * nAvgSession
        nLimitNumber = nAvgSession
        if i == nFilePart - 1: # last file, should take rest all sessions
            nLimitNumber = nTotalSessions - nSkipNumber
        #print "Index = %d, Skip = %d, Limit = %d" % (i, nSkipNumber, nLimitNumber)
        sFileName = getFileName(filePrefix, i, filePostfix)
        #print "File name = " + sFileName
        #listCmd = ['node', 'distinctSessions.js', app_key, sFileName, str(nSkipNumber), str(nLimitNumber)]
        #print "Command = ", listCmd
        #worker = CDistinctSessionWorker(listCmd)
        worker = CDistinctSessionWorker(app_key, sFileName, nSkipNumber, nLimitNumber)
        arySessionWorker.append(worker)
    return arySessionWorker
    
def prepareDistinctSession(and_key, ios_key, log):
    nAndSessionCnt, nIOSSessionCnt = countSession(and_key, ios_key)
    print "%d sessions for And %s\n%d sessions for iOS %s" % (nAndSessionCnt, and_key, nIOSSessionCnt, ios_key)
    log(("Session Count: %d for Android, %d for iOS." % (nAndSessionCnt, nIOSSessionCnt)))

    global TOTAL_USER_PART_AND
    global TOTAL_USER_PART_IOS
    TOTAL_USER_PART_AND = 12 if (nAndSessionCnt + nIOSSessionCnt > 150000) else 1
    TOTAL_USER_PART_IOS = 2 if (nAndSessionCnt + nIOSSessionCnt > 150000) else 1
    
    aryAllSessionWorker = []
    if and_key: aryAllSessionWorker += generateDistinctSessionWorker(and_key, nAndSessionCnt, "_sessions_and_", ".txt", TOTAL_USER_PART_AND)
    if ios_key: aryAllSessionWorker += generateDistinctSessionWorker(ios_key, nIOSSessionCnt, "_sessions_ios_", ".txt", TOTAL_USER_PART_IOS)
    #print "Length of session worker array = ", len(aryAllSessionWorker)
    
    # wait for all worker finish work.
    for worker in aryAllSessionWorker: worker.start()
    for worker in aryAllSessionWorker: worker.join()
    for worker in aryAllSessionWorker:
        #print worker.getSummaryLog()
        log(worker.getSummaryLog())
    
    nAccuAndSessions, nAccuIOSSessions = 0, 0
    nAccuAndUsers, nAccuIOSUsers = 0, 0
    if and_key:
        for i in xrange(TOTAL_USER_PART_AND):
            nAccuAndSessions += aryAllSessionWorker[i].getSessionCount()
            nAccuAndUsers += aryAllSessionWorker[i].getUserCount()
    if ios_key:
        reversedList = aryAllSessionWorker[::-1]
        for i in xrange(TOTAL_USER_PART_IOS):
            nAccuIOSSessions += reversedList[i].getSessionCount()
            nAccuIOSUsers += reversedList[i].getUserCount()
    
    print "Parsed %d sessions of And, %d sessions of iOS. Parsed %d users of And, %d users of iOS" % (nAccuAndSessions, nAccuIOSSessions, nAccuAndUsers, nAccuIOSUsers)
    log("Parsed %d sessions of And, %d sessions of iOS. Parsed %d users of And, %d users of iOS\n" % (nAccuAndSessions, nAccuIOSSessions, nAccuAndUsers, nAccuIOSUsers))
    
    if nAccuAndSessions != nAndSessionCnt or nAccuIOSSessions != nIOSSessionCnt:
        print "Sessions are not matched, something might go wrong."
        log("Sessions are not matched, something might go wrong.\n")
        return False
    return True
    
LOG_FOLDER = "LogSessionMT"
    
#TOTAL_USER_PART_AND = 12
TOTAL_USER_PART_AND = 12
TOTAL_USER_PART_IOS = 2
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
        # PF
        time.sleep(1200)
        bPrepareReady = prepareDistinctSession(aKeys["Perfect_And"], aKeys["Perfect_iOS"], log)
        if not bPrepareReady: raiseExceptionAndExit(log)
        calculateSessions(aKeys["Perfect_And"], aKeys["Perfect_iOS"])
        # BCS
        bPrepareReady = prepareDistinctSession(aKeys["BeautyCircle_And"], aKeys["BeautyCircle_iOS"], log)
        if not bPrepareReady: raiseExceptionAndExit(log)
        calculateSessions(aKeys["BeautyCircle_And"], aKeys["BeautyCircle_iOS"])

    if("ALL" == optApps or "YCP+YMK" == optApps):
        # YMK
        bPrepareReady = prepareDistinctSession(aKeys["YouCam_MakeUp_And"], aKeys["YouCam_MakeUp_iOS"], log)
        if not bPrepareReady: raiseExceptionAndExit(log)
        calculateSessions(aKeys["YouCam_MakeUp_And"], aKeys["YouCam_MakeUp_iOS"])
        # YCN
        bPrepareReady = prepareDistinctSession(aKeys["YouCam_Nail_And"], aKeys["YouCam_Nail_iOS"], log)
        if not bPrepareReady: raiseExceptionAndExit(log)
        calculateSessions(aKeys["YouCam_Nail_And"], aKeys["YouCam_Nail_iOS"])
        # YCP
        bPrepareReady = prepareDistinctSession(aKeys["YouCam_Perfect_And"], aKeys["YouCam_Perfect_iOS"], log)
        if not bPrepareReady: raiseExceptionAndExit(log)
        calculateSessions(aKeys["YouCam_Perfect_And"], aKeys["YouCam_Perfect_iOS"])
        
    endTime = time.time()
    log(("**** Finished. Time cost on sessionMT = " + str(endTime-startTime) + " seconds\n"))
