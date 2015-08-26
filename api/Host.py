import os
import time
import threading
import subprocess
import datetime
import shutil
import AutoUtils as utils
from AutoUtils import executeCmd as execute
        
"""
def executeCmd(cmd, logger):
    #print "Execute Command: ", cmd
    log = logger.log
    log("Execute Command: " + " ".join(cmd) + "\n")
    p = subprocess.Popen(cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    while True:
        lineout = p.stdout.readline()
        if lineout: log(lineout)
        #if lineout: print lineout.replace("\n", "")
        else: break
    
    while True:
        lineout = p.stderr.readline()
        if lineout: log("!!Err: "+lineout)
        #if lineout: print lineout.replace("\n", "")
        else: break
"""
        
class WorkerThread(threading.Thread):
    def __init__(self, listTargetDate, bIgnoreCopy=False):
        threading.Thread.__init__(self)
        self.listTargetDate = listTargetDate
        self.threadName = "thread_" + listTargetDate[0].isoformat()
        self.bIgnoreCopy = bIgnoreCopy
        self.bCopyFinished = False
        #self.bCopyFinished = True
        
        logPath = os.path.join(os.getcwd(), log_folder, "host_" + self.listTargetDate[0].isoformat())
        self.logger = utils.CLogger(logPath)
        
    def run(self):
        if not self.bIgnoreCopy:
            self.copyFile()
        self.calculateSession()
        self.logger = None # close logger
            
    def copyFile(self):
        evtCopyFinish.wait()
        evtCopyFinish.clear()
        # calculate session with multi-thread
        # executeCmd(['python', 'copyFiles.py', self.listTargetDate[0].isoformat(), self.listTargetDate[-1].isoformat()], self.logger)
        execute(['python', 'copyFiles.py', self.listTargetDate[0].isoformat(), self.listTargetDate[-1].isoformat()], self.logger.log)
        evtCopyFinish.set()
        self.bCopyFinished = True
            
    def calculateSession(self):
        evtSessionFinish.wait()
        evtSessionFinish.clear()
        
        log = self.logger.log
        while not self.bCopyFinished:
            log("Copy file of target " + self.listTargetDate[0].isoformat() + "not finish and wait. \n")
            time.sleep(300)
        
        # calculate session
        db_name = utils.getRawDB_Name(self.listTargetDate[0].strftime('%Y%m%d'), self.listTargetDate[-1].strftime('%Y%m%d'))
        #executeCmd(['python', 'sessionMT.py', db_name], self.logger)
        execute(['python', 'sessionMT_v2.py', db_name], self.logger.log)
        
        # backup result
        dumpDB_Name = utils.getConfig('db:')
        dumpTmpPath = utils.path_dump_temp
        # executeCmd(['mongodump', '-d', dumpDB_Name, '-o', dumpTmpPath], self.logger)
        execute(['mongodump', '-d', dumpDB_Name, '-o', dumpTmpPath], self.logger.log)
        
        compressName = utils.getBackupFileName(self.listTargetDate[-1].strftime('%Y_%m_%d'))
        compressPath = os.path.join(dumpTmpPath, compressName)
        countlyFolder = os.path.join(dumpTmpPath, dumpDB_Name)
        # executeCmd(['tar', 'zcvf', compressPath, countlyFolder], self.logger)
        execute(['tar', 'zcvf', compressPath, countlyFolder], self.logger.log)
        
        s3mntPath = utils.path_s3_backup
        self.logger.log(("Copy %s to %s, and remove %s" % (compressPath, s3mntPath, countlyFolder)))
        shutil.copy(compressPath, s3mntPath)
        shutil.rmtree(countlyFolder)
        os.remove(compressPath)
        
        evtSessionFinish.set()
        
def getTargetDateList(startDate, numberDates, lastDate):
    listDates = []
    for i in xrange(numberDates):
        listDates.append(startDate + delta_Date * i)
    
    # first target is bigger than last, return []
    if listDates[0] > lastDate:
        return []
    
    for i in xrange(len(listDates)):
        if listDates[i] == lastDate:
            listDates = listDates[:i+1]
            break
            
    return listDates
        
evtCopyFinish = threading.Event()
evtSessionFinish = threading.Event()
evtCopyFinish.set()
evtSessionFinish.set()
        
begin_Target_Date = utils.begin_Target_Date
end_Target_Date = utils.end_Target_Date
delta_Date = utils.delta_Date
number_Dates = utils.number_Dates

listIgnoreCopyBegin = []

log_folder = "LogHost"

if __name__ == '__main__':   
    thread_1 = None
    thread_2 = None
    listTargetDates = getTargetDateList(begin_Target_Date, number_Dates, end_Target_Date)
    
    stopFilePath = os.path.join(os.getcwd(), 'StopHost')
    
    while True:
        if os.path.exists(stopFilePath):
            print "Host: Found stop file, please wait......"
            break
    
        # do works
        if not thread_1:
            bIgnoreCopy = (listTargetDates[0] in listIgnoreCopyBegin)
            thread_1 = WorkerThread(listTargetDates, bIgnoreCopy)
            thread_1.start()
            time.sleep(300)
        elif not thread_2:
            bIgnoreCopy = (listTargetDates[0] in listIgnoreCopyBegin)
            thread_2 = WorkerThread(listTargetDates, bIgnoreCopy)
            thread_2.start()
            time.sleep(300)
        else: # all threads are working, sleep and continue
            time.sleep(300) # check every 5 minutes
            if(not thread_1.isAlive()):
                thread_1 = None
            if(not thread_2.isAlive()):
                thread_2 = None
            continue
        
        # update target dates
        listTargetDates = getTargetDateList(listTargetDates[-1] + delta_Date, number_Dates, end_Target_Date)
        
        # check if all target dates has been finished.
        if len(listTargetDates) <= 0:
            print "Host: All target days are handled."
            break
            
    if (None != thread_1 or None != thread_2):
        print "Host: someone is working, please wait......"
        
    if thread_1:
        thread_1.join()
        
    if thread_2:
        thread_2.join()
        
    print "Host: jobs done! Have a nice day!!"
        
    
    
    
    
