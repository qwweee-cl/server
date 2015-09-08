import subprocess
import datetime
import threading

app_keys = {"Perfect_And"       : "0368eb926b115ecaf41eff9a0536a332ef191417",
            "Perfect_iOS"       : "02ce3171f470b3d638feeaec0b3f06bd27f86a26",
            "YouCam_MakeUp_iOS" : "9219f32e8de29b826faf44eb9b619788e29041bb",
            "YouCam_MakeUp_And" : "75edfca17dfbe875e63a66633ed6b00e30adcb92",
            "YouCam_Perfect_iOS": "c277de0546df31757ff26a723907bc150add4254",
            "YouCam_Perfect_And": "e315c111663af26a53e5fe4c82cc1baeecf50599",
            #"YouCam_Snap_iOS"   : "bd3e6363ecfd09a86e8368c4ce901d8f2a11e1e4",
            #"YouCam_Sanp_And"   : "360c62109104411b1dbcbae9f4684581cd1bf0a3",
            #"YouCam_Sanp_Test"  : "5bdd437648c2d067c3dce506f8c22fe5421ed5a9",
            #"ImageChef_And"     : "26505e9590f0c036e02bcb4d5f6112798f424baa",
            #"PhotoDirector_iOS" : "e4f1ebacd105643ae331ef2f0e909b00694aefd5",
            #"PhotoDirectorF_And": "05c06552cda7756b02d0ea78a15f9f602b9e8b00", # free
            #"PhotoDirectorB_And": "de5a6b0dd9e24bc33fc4a0615db743f9d2db8190", # bundle
            #"PowerDirector_And" : "3c0d51e6ebd543345390297e77186287f3cfb43d",
            #"U_iOS"             : "d5b24af83418399bb422d387f4f895f32899c374",
            #"U_And"             : "b936dc8fb20effe0d2252509cf2914028d3b60f6",
            #"YCP_SourceNext"    : "fe11705e8bc9807c01424ace2dfb1576dca52581",
            }

col_names = {"Perfect_And"       : "raw_session_0368eb926b115ecaf41eff9a0536a332ef191417",
             "Perfect_iOS"       : "raw_session_02ce3171f470b3d638feeaec0b3f06bd27f86a26",
             "YouCam_MakeUp_iOS" : "raw_session_9219f32e8de29b826faf44eb9b619788e29041bb",
             "YouCam_MakeUp_And" : "raw_session_75edfca17dfbe875e63a66633ed6b00e30adcb92",
             "YouCam_Perfect_iOS": "raw_session_c277de0546df31757ff26a723907bc150add4254",
             "YouCam_Perfect_And": "raw_session_e315c111663af26a53e5fe4c82cc1baeecf50599",
             #"YouCam_Snap_iOS"   : "raw_session_bd3e6363ecfd09a86e8368c4ce901d8f2a11e1e4",
             #"YouCam_Sanp_And"   : "raw_session_360c62109104411b1dbcbae9f4684581cd1bf0a3",
             #"YouCam_Sanp_Test"  : "raw_session_5bdd437648c2d067c3dce506f8c22fe5421ed5a9",
             #"ImageChef_And"     : "raw_session_26505e9590f0c036e02bcb4d5f6112798f424baa",
             #"PhotoDirector_iOS" : "raw_session_e4f1ebacd105643ae331ef2f0e909b00694aefd5",
             #"PhotoDirectorF_And": "raw_session_05c06552cda7756b02d0ea78a15f9f602b9e8b00", # free
             #"PhotoDirectorB_And": "raw_session_de5a6b0dd9e24bc33fc4a0615db743f9d2db8190", # bundle
             #"PowerDirector_And" : "raw_session_3c0d51e6ebd543345390297e77186287f3cfb43d",
             #"U_iOS"             : "raw_session_d5b24af83418399bb422d387f4f895f32899c374",
             #"U_And"             : "raw_session_b936dc8fb20effe0d2252509cf2914028d3b60f6",
             #"YCP_SourceNext"    : "raw_session_fe11705e8bc9807c01424ace2dfb1576dca52581",
             }

DB_URL = "localhost"
DB_PORT = "27017"
DB_HOST = DB_URL + ":" + DB_PORT

begin_Target_Date = datetime.date(2015, 6, 17)
end_Target_Date = datetime.date(2015, 6, 17)
delta_Date = datetime.timedelta(days=1)
number_Dates = 1 # number of dates in a target part

path_mem_disk = r"/mem/tmp"
path_dump_temp = r"/mem/tmp/backup"
path_s3_backup = r"/s3mnt/db_backup/countly_PF"
             
class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    PURPLE_UNDERLINE = '\033[95;4m'

class CCommandThread(threading.Thread):
    def __init__(self, cmd, log, bConsole=False):
        threading.Thread.__init__(self)
        self.cmd = cmd
        self.log = log
        self.bConsole = bConsole

    def run(self):
        executeCmd(self.cmd, self.log, self.bConsole)
    
class CLogger:
    def __init__(self, filePath):
        self.filePath = filePath
        self.logger = None
        self.__lock = threading.Lock()
        self.__acquire = self.__lock.acquire
        self.__release = self.__lock.release
        
    def __del__(self):
        self.logger.close()
        
    def log(self, message):
        now = datetime.datetime.now()
        now = now.strftime('%Y-%m-%d %H:%M:%S')
        
        self.__acquire()
        self.logger = open(self.filePath, 'a')
        self.logger.write(now + " " + message)
        self.logger.close()
        self.__release()
        
    def log_noD(self, message):
        self.__acquire()
        self.logger = open(self.filePath, 'a')
        self.logger.write(message)
        self.logger.close()
        self.__release()
        
def executeCmd(cmd, log, bConsole=False):
    log("Execute Command: " + " ".join(cmd) + "\n")
    if bConsole: print bcolors.WARNING + "Execute Command: " + bcolors.ENDC, cmd
    p = subprocess.Popen(cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdoutdata, stderrdata = p.communicate()
    
    if bConsole: print stdoutdata, stderrdata
    log(stdoutdata)
    log(stderrdata)
        
def getConfig(keyName):
    config = open('config.js', 'r')
    lines = config.readlines()
    config.close() # read lines and close
    idxBatchStr = -1
    for line in lines:
        if -1 != line.find(keyName):
            idxBatchStr = lines.index(line)
            break
    
    if -1 == idxBatchStr: return None
    listBatchStr = lines[idxBatchStr].split('"')
    return listBatchStr[1]

def getRawDB_Name(begin, end):
    return 'countly_raw_' + begin + '-' + end # countly_raw_20141104-20141104
    
def getBackupFileName(end):
    return 'end_on_' + end + '.tgz'# end_on_2014_11_04.tgz
    
def executeMultiCommand(listCmd, log, bConsole):
    aryThreads = []
    
    for cmd in listCmd:
        t = CCommandThread(cmd, log, bConsole)
        t.start()
        aryThreads.append(t)
    
    for thread in aryThreads:
        thread.join()
        
    aryThreads = None
    
def executeMultiCommandsWithDiffLog(listCmd, listLogFile, bConsole):
    aryThreads = []
    
    for cmd in listCmd:
        idx = listCmd.index(cmd)
        logger = CLogger(listLogFile[idx])
        t = CCommandThread(cmd, logger.log, bConsole)
        t.start()
        aryThreads.append(t)
    
    for thread in aryThreads:
        thread.join()
        
    aryThreads = None
    
def executeCmd_orig(cmd, log, bConsole=False):
    log("Execute Command: " + " ".join(cmd) + "\n")
    if bConsole: print bcolors.WARNING + "Execute Command: " + bcolors.ENDC, cmd
    p = subprocess.Popen(cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    while True:
        lineout = p.stdout.readline()
        if lineout: log(lineout)
        if lineout and bConsole: print lineout.replace("\n", "")
        else:
            print '[OWL]---> check !!'
            break
    
    while True:
        lineout = p.stderr.readline()
        if lineout: log(lineout)
        if lineout and bConsole: print lineout.replace("\n", "")
        else:
            print '[OWL]---> check  2!!'
            break
        
        
        
        
        
        