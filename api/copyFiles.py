import os
import sys
import shutil
import tarfile
import time
import datetime
import AutoUtils as utils
from AutoUtils import col_names as cName
from AutoUtils import app_keys as aKeys
from AutoUtils import executeCmd as execute
from AutoUtils import executeMultiCommand as exeMultiCmds
    
# http://stackoverflow.com/questions/6058786/i-want-to-extract-a-tgz-file-and-extract-any-subdirectories-that-have-files-tha
def extract(tar_url, extract_path='.'):
    tar = tarfile.open(tar_url, 'r')
    for item in tar:
        tar.extract(item, extract_path)
        if item.name.find(".tgz") != -1 or item.name.find(".tar") != -1:
            extract(item.name, "./" + item.name[:item.name.rfind('/')])
            
def parseTargetDateStrFormSysArgv():
    ############################################
    # parse system arguments. BeginDate, EndDate
    # Date format: iso format, "%Y-%m-%d", e.g. 2014-01-02
    ############################################
    isoFormat = '%Y-%m-%d'
    delta_Date = datetime.timedelta(days=1)
    targetDateTime = []
    if 3 == len(sys.argv):
        beginDateTime = datetime.datetime.strptime(sys.argv[1], isoFormat)
        endDateTime = datetime.datetime.strptime(sys.argv[2], isoFormat)
        targetDateTime.append(beginDateTime)
        nextDateTime = beginDateTime + delta_Date
        while True:
            if nextDateTime <= endDateTime:
                targetDateTime.append(nextDateTime)
                nextDateTime += delta_Date
            else:
                break
    else:
        return []
        
    dateStringFormat = '%Y%m%d'
    targetDateString = [dateTime.strftime(dateStringFormat) for dateTime in targetDateTime]
    return targetDateString
            
##############################################################
           
RAW_BACKUP_PATH = r"/s3mnt/db_backup/raw_data"
#RAW_BACKUP_PATH = r"/s3mnt/db_backup/hourly_data"
LOG_FOLDER = "LogCopyFiles"
LOGGER = None

# after 2015-04-13, raw data format has been changed.
RAW_TWO_PART_DATE = "20150413" #datetime.date(2015, 4, 13)
RAW_HOURLY_DATE = "20150525" #datetime.date(2015, 5, 25)

# DB setting
DB_HOST = utils.DB_HOST

if __name__ == '__main__':
    start_time = time.time()
    
    # get target date string YYYYMMDD
    listTargetDateStr = parseTargetDateStrFormSysArgv()
    if 0 == len(listTargetDateStr):
        print "copyFile, no target date, exit"
        exit(1)
    print "copyFile, List of target date string = ", listTargetDateStr
    
    logPath = os.path.join(os.getcwd(), LOG_FOLDER, "copyFiles_"+listTargetDateStr[0])
    LOGGER = utils.CLogger(logPath)
    log = LOGGER.log

    # create temp folder and copy tgz files into it
    tmpFolderName = listTargetDateStr[0] + "-" + listTargetDateStr[-1]
    tmpFolderPath = os.path.join(utils.path_mem_disk, tmpFolderName)
    
    if os.path.exists(tmpFolderPath):
        log(("[Err] Temp folder (%s) exists, return\n" % tmpFolderPath))
        exit(1)
    os.mkdir(tmpFolderPath)
    log(("Create temp folder = %s\n" % tmpFolderPath))
    
    DB_NAME = utils.getRawDB_Name(listTargetDateStr[0], listTargetDateStr[-1])
    
    # copy raw backup files to temp folder and extract
    for target in listTargetDateStr:
        log(("********** Begin for target: %s\n" % target))
        # make target folder in temp folder first
        os.mkdir(os.path.join(tmpFolderPath, target))
        
        # combine file path needed
        listRawFile = []
        """
        if target >= RAW_TWO_PART_DATE: # separate into two parts
            listRawFile.append(target + "_raw_1.tgz")
            listRawFile.append(target + "_raw_2.tgz")
        """
        if target >= RAW_HOURLY_DATE: # hourly data
            listRawFile.append(target + "_raw_00_1.tgz")
            listRawFile.append(target + "_raw_00_2.tgz")
            listRawFile.append(target + "_raw_01_1.tgz")
            listRawFile.append(target + "_raw_01_2.tgz")
            listRawFile.append(target + "_raw_02_1.tgz")
            listRawFile.append(target + "_raw_02_2.tgz")
            listRawFile.append(target + "_raw_03_1.tgz")
            listRawFile.append(target + "_raw_03_2.tgz")
        else:
            listRawFile.append(target + "_raw.tgz")
        
        for rawFile in listRawFile:
            srcPath = os.path.join(RAW_BACKUP_PATH, rawFile)
            dstPath = os.path.join(tmpFolderPath, target)
            
            # check rawFile exists or not
            if not os.path.exists(srcPath):
                log(("[Err] Source file: '%s' doesn't exist, continue.\n" % srcPath))
                continue
            
            # copy file
            log(("Copy file: '%s' to folder '%s'\n" % (srcPath, dstPath)))
            shutil.copy(srcPath, dstPath)
            
            # extract raw files
            log("Extract file: " + os.path.join(dstPath, rawFile) + "\n")
            extract(os.path.join(dstPath, rawFile), dstPath)
            
            # get extract folder, suppose these is only one folder after extract
            dbFolderPath = "" # /mem/tmp/yyyy_mmdd-mmdd/mmdd/yyyymmdd_raw_x
            for (dirpath, dirnames, filenames) in os.walk(dstPath):
                if dirpath == dstPath and 0 != len(dirnames):
                    dbFolderPath = os.path.join(dirpath, dirnames[0])
                    break
            log("DB folder path = " + dbFolderPath + "\n")
            
            dbPath = "" # /mem/tmp/yyyy_mmdd-mmdd/mmdd/yyyymmdd_raw/countly_rawX
            listCounlyFolder = os.listdir(dbFolderPath)
            if 1 != len(listCounlyFolder):
                log("[Err] More than one countly folder: " + listCounlyFolder + "\n")
                # need to find the one which is not empty
                for countly in listCounlyFolder:
                    dbPath = os.path.join(dbFolderPath, countly)
                    if len(os.list(dbPath)) > 0: # not empty
                        break
            else:
                dbPath = os.path.join(dbFolderPath, listCounlyFolder[0])
            log("DB path: " + dbPath + "\n")
            
            # do mongo restore
            # all apps
            #execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["YouCam_Perfect_And"], os.path.join(dbPath, cName["YouCam_Perfect_And"] +".bson")], LOGGER.log_noD)
            #execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["YouCam_Perfect_iOS"], os.path.join(dbPath, cName["YouCam_Perfect_iOS"] + ".bson")], LOGGER.log_noD)
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["YouCam_MakeUp_And"], os.path.join(dbPath, cName["YouCam_MakeUp_And"]  +".bson")], LOGGER.log_noD)
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["YouCam_MakeUp_iOS"], os.path.join(dbPath, cName["YouCam_MakeUp_iOS"]  + ".bson")], LOGGER.log_noD)
            
            # restore Perfect iOS
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["Perfect_iOS"], os.path.join(dbPath, cName["YouCam_MakeUp_iOS"]  + ".bson")], LOGGER.log_noD)
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["Perfect_iOS"], os.path.join(dbPath, cName["YouCam_Perfect_iOS"] + ".bson")], LOGGER.log_noD)
            # restore Perfect Android
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["Perfect_And"], os.path.join(dbPath, cName["YouCam_MakeUp_And"]  +".bson")], LOGGER.log_noD)
            execute(["mongorestore", "-h", DB_HOST, "-d", DB_NAME, "-c", cName["Perfect_And"], os.path.join(dbPath, cName["YouCam_Perfect_And"] +".bson")], LOGGER.log_noD)
            
            os.remove(os.path.join(dstPath, rawFile))
            shutil.rmtree(dbFolderPath)
        
        log("********** Copy File: end of target: " + target + "\n")
        log("********** Remove folder of target: " + target + "\n")
        shutil.rmtree(os.path.join(tmpFolderPath, target))
        # end of for loop #############
        
    ########################################
    # change app_key of PFT collections <call updateAppKey.js>
    """
    s_time = time.time()

    listCmds = []
    listCmds.append(["node", "updateAppKey.js", DB_HOST, DB_NAME, cName["Perfect_iOS"], aKeys["Perfect_iOS"]])
    listCmds.append(["node", "updateAppKey.js", DB_HOST, DB_NAME, cName["Perfect_And"], aKeys["Perfect_And"]])
    exeMultiCmds(listCmds, log, True)
    
    e_time = time.time()
    log(("********** time of update app key: %s seconds\n" % str(e_time - s_time)))
    """
    ########################################
    
    ########################################
    # ensure index <call ensureIndex.js>
    s_time = time.time()
    
    listCmds = []
    #listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["Perfect_iOS"]])
    #listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["Perfect_And"]])
    listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["YouCam_MakeUp_iOS"]])
    listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["YouCam_MakeUp_And"]])
    #listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["YouCam_Perfect_iOS"]])
    #listCmds.append(["node", "ensureIndex.js", DB_HOST, DB_NAME, cName["YouCam_Perfect_And"]])
    exeMultiCmds(listCmds, log, True)
    
    e_time = time.time()
    log(("********** time of ensuring index: %s seconds\n" % str(e_time - s_time)))
    ########################################
    
    # remove temp folder after all works done
    log(("********** Remove temp folder: %s\n" % tmpFolderPath))
    shutil.rmtree(tmpFolderPath)
    
    # remove s3cache
    log("********** Remove s3cache... \n")
    execute(["sudo", "rm", "-r", r"/mem/tmp/s3cache/clcom2-countly/db_backup/"], log, True)
    
    end_time = time.time()
    lapse_time = end_time - start_time
    log(("********** Total Time: %s min : %s sec" % (str(lapse_time / 60), str(lapse_time % 60))))
    
    LOGGER = None
    
    
            
            
            
            
            
            
            