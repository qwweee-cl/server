var http = require('http'),
  cluster = require('cluster'),
  os = require('os'),
  url = require('url'),
  common = require('./utils/common.js'),
  exec = require('child_process').exec,
  jsonQuery = require('json-query'),
  moment = require('moment-timezone'),
  workerEnv = {},
  oemMaps = [],
  appKeyMaps = [],
  oemCount = 0,
  appKeyCount = 0,
  fs = require('fs'),
  crypto = require('crypto'),
  privateKey = fs.readFileSync('/home/ubuntu/shell/countly_private.pem'),
  publicKey = fs.readFileSync('/home/ubuntu/shell/countly_public.pem'),
  countlyApi = {
    data: {
      usage: require('./parts/data/usage.js'),
      fetch: require('./parts/data/fetch.js'),
      events: require('./parts/data/events.js')
    },
    mgmt: {
      users: require('./parts/mgmt/users.js'),
      apps: require('./parts/mgmt/apps.js')
    }
  },
  appKey = require('./appKey.js'),
  androidAutoAppkey = require('./appkey_config/countly_auto_android_json_code.json'),
  iOSAutoAppkey = require('./appkey_config/countly_auto_ios_json_code.json');

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

//////////////////////////////////
var kafakStatus = 0;
var checkCount = 120;
var kafka = require('kafka-node');
var Producer = kafka.Producer;//kafka.HighLevelProducer;//kafka.Producer;
var Client = kafka.Client;

//var zkList = '172.31.27.186:2181,172.31.27.187:2181,172.31.27.188:2181';  // bootstrap.servers
//var zkList = '172.31.16.236:2181,172.31.16.237:2181,172.31.16.238:2181,172.31.16.239:2181';  // bootstrap.servers
var zkList = '172.31.25.82:2181,172.31.30.167:2181,172.31.29.255:2181,172.31.26.160:2181';  // bootstrap.servers
var timeToRetryConnection = 12 * 1000; // 12 seconds
var reconnectInterval = null;
var kafkaErrorCount = 0;
var kafkaErrorMaxCount = 10000;
var errorContext = "";
var kafkaCheckTimeout = 1 * 60 * 60 * 1000;
var failMailList = "hendry_wu@perfectcorp.com,gary_huang@perfectcorp.com";
var failMailListAdmin = "gary_huang@perfectcorp.com";

var client = new Client(zkList);

//var p = argv.p || 0; // default is 0
//var a = argv.a || 0; // no compress
var producer = new Producer(client, {requireAcks: 1});
var partitionNum = 6;
var randomCnt = 0;
var randomCntOEM = 0;
var randomCntABTesting = 0;
var randomCntOthers = 0;
var cando = false;
//var YCP_And_count = 0;
//var workerID;
//var isProducerReady = false;


var nokafkaErrorCount = 0;
var nokafkaerrorContext = "";
var isNoKafka = true;
var kafkaList = '172.31.25.82:9092,172.31.30.167:9092,172.31.29.255:9092,172.31.26.160:9092';  // bootstrap.servers

var noKafka = require('no-kafka');
var noKafkaProducer = new noKafka.Producer({
  requiredAcks: 1,
  clientId: 'producer',
  connectionString: kafkaList,
  asyncCompression: false
});


var bf = require('bloomfilter'),
  BloomFilter = bf.BloomFilter,
  userTableFilter = null,
  tmpuserCount = 0,
  checkBloomFilter = true,
  isUpdating = false;

const cassandra = require('cassandra-driver');
const cassandraOption = {
  contactPoints: ['172.31.27.165', '172.31.27.166', '172.31.27.167', '172.31.27.168'],
  keyspace: 'countly_activities'
};
const query = 'SELECT device_id, is_for_web_filter FROM bc_trend_ab_user;';
var ABTestTopicName = 'ABTesting';

const mysql = require('mysql-libmysqlclient');
var host = 'cogons-db-new.czkpdhvixbu3.ap-northeast-1.rds.amazonaws.com';
var user = 'abtest';
var password = 'abtest';
var database = 'ABTest';
var enableABTesting = true;

var chunkSize = 100000;
var countQuery = "SELECT count(*) as total FROM ABTest.bc_trend_ab_user WHERE is_for_web_filter = true;";
var chunkQuery = 'SELECT device_id FROM ABTest.bc_trend_ab_user WHERE is_for_web_filter = true LIMIT ' + chunkSize;


var schedule = require('node-schedule'),
  job = schedule.scheduleJob('00 03 */1 * *', function () {
    console.log('Call update ABTesting Table!');
    //updateABTestingTable();
    updateABTestingRandom();
  });


var topicList = ['Node_Event_BCS_And', 'Node_Event_BCS_iOS', 'Node_Event_OtherApp',
  'Node_Event_YCN_And', 'Node_Event_YCN_iOS', 'Node_Event_YCP_And',
  'Node_Event_YCP_iOS', 'Node_Event_YMK_And', 'Node_Event_YMK_iOS',
  'Node_Session_BCS_And', 'Node_Session_BCS_iOS', 'Node_Session_OtherApp',
  'Node_Session_YCN_And', 'Node_Session_YCN_iOS', 'Node_Session_YCP_And',
  'Node_Session_YCP_iOS', 'Node_Session_YMK_And', 'Node_Session_YMK_iOS',
  'Node_Session_YCL_And', 'Node_Session_YCL_iOS', 'Node_Event_YCL_And',
  'Node_Event_YCL_iOS', 'Node_Session_YMC_And', 'Node_Session_YMC_iOS',
  'Node_Session_YCF_And', 'Node_Session_YCF_iOS', 'Node_Session_YCC_And',
  'Node_Session_YCC_iOS', 'Node_Event_YMC_And', 'Node_Event_YMC_iOS',
  'Node_Event_YCF_And', 'Node_Event_YCF_iOS', 'Node_Event_YCC_And',
  'Node_Event_YCC_iOS', 'Node_Session_YMKL_iOS', 'Node_Event_YMKL_iOS',
  'Node_Session_YCS_And', 'Node_Session_YCS_iOS', 'Node_Event_YCS_And',
  'Node_Event_YCS_iOS',
  'OEM_session', 'OEM_event', 'CheckSum', 'ABTesting', '_UMAH_YMK_And',
  '_UMAH_YMK_iOS', '_UMAH_YCP_And', '_UMAH_YCP_iOS',
  'Node_Session_Amway_And', 'Node_Session_Amway_iOS', 'Node_Event_Amway_And', 'Node_Event_Amway_iOS',
  'Node_Session_Belcorp_Skincare_And', 'Node_Event_Belcorp_Skincare_And',
  'Node_Session_Aphrodite_And', 'Node_Session_Aphrodite_iOS', 'Node_Event_Aphrodite_And', 'Node_Event_Aphrodite_iOS',
  'Node_Session_MaryKay_China_And', 'Node_Session_MaryKay_China_iOS', 'Node_Event_MaryKay_China_And', 'Node_Event_MaryKay_China_iOS',
  'Node_Session_Macy_And', 'Node_Session_Macy_iOS', 'Node_Event_Macy_And', 'Node_Event_Macy_iOS',
  'Node_Session_Chanelvmulips_And', 'Node_Session_Chanelvmulips_iOS', 'Node_Event_Chanelvmulips_And', 'Node_Event_Chanelvmulips_iOS',
  'Node_Session_Belcorp_And', 'Node_Event_Belcorp_And',
  'Node_Session_SDK', 'Node_Event_SDK',
  'Node_Session_YCV_And', 'Node_Event_YCV_And',
  'Node_Session_YCVBeauty_iOS', 'Node_Event_YCVBeauty_iOS',
  'Node_Session_YCVBeauty_And', 'Node_Event_YCVBeauty_And',
  'Node_Session_BrandMode_And', 'Node_Session_BrandMode_iOS', 'Node_Event_BrandMode_And', 'Node_Event_BrandMode_iOS',
  'Node_Session_YMK4B_And', 'Node_Session_YMK4B_iOS', 'Node_Event_YMK4B_And', 'Node_Event_YMK4B_iOS',
  'Node_Session_YMK4BTrial_And', 'Node_Session_YMK4BTrial_iOS', 'Node_Event_YMK4BTrial_And', 'Node_Event_YMK4BTrial_iOS',
  'Node_Session_YMK4BBrand_And', 'Node_Session_YMK4BBrand_iOS', 'Node_Event_YMK4BBrand_And', 'Node_Event_YMK4BBrand_iOS',
  'Node_Session_DandG_And', 'Node_Session_DandG_iOS', 'Node_Event_DandG_And', 'Node_Event_DandG_iOS',
  'Node_Session_AmwayCN_AEC_iOS', 'Node_Event_AmwayCN_AEC_iOS', 'Node_Session_YCT_iOS', 'Node_Event_YCT_iOS',
  'Node_Event_WCM_Web',
  'Node_Event_YCP_CN_And', 'Node_Event_YCP_CN_iOS', 'Node_Event_YMK_CN_And', 'Node_Event_YMK_CN_iOS',
  'Node_Session_YCP_CN_And', 'Node_Session_YCP_CN_iOS', 'Node_Session_YMK_CN_And', 'Node_Session_YMK_CN_iOS',
];

function producerReady() {
  var date = new Date();
  console.log("ready: " + date.toString());
  isProducerReady = true;
  producer.createTopics(topicList, false, function (err, data) {
    console.log("createTopic: " + data);
    if (err) {
      console.log("ERROR: " + err);
      kafkaErrorCount++;
      errorContext += (JSON.stringify(err) + "\r\n");
      if (kafkaErrorCount && (kafkaErrorCount % kafkaErrorMaxCount == 0)) {
        //kafkaErrorCount = 0;
        //errorContext = "";
        console.log("Kafka Exception Send Mail");
        var cmd = 'echo "' + errorContext + '" | mail -s "Kafka Exception Count ' + kafkaErrorCount + ' times" ' + failMailList;
        exec(cmd, function (error, stdout, stderr) {
          if (error)
            console.log(error);
        });
      }
    }
    noKafkaProducer.init().then(function () {
      console.log("no-kafka Producer Ready");
      cando = true;
      mainfunc();
    });
    //cando = true;
  });
  if (reconnectInterval != null) {
    clearTimeout(reconnectInterval);
    reconnectInterval = null;
  }
};

function producerError(err) {
  var date = new Date();
  console.log("perror: " + date.toString());
  producer.close();
  client.close();
  console.log('producer error', err);
  cando = false;
  if (reconnectInterval == null) { // Multiple Error Events may fire, only set one connection retry.
    reconnectInterval =
      setTimeout(function () {
        console.log("reconnect is called in producer error event");
        client = new Client(zkList);
        producer = new Producer(client, {requireAcks: 1});
        producer.on('ready', producerReady);

        producer.on('error', producerError);

        client.on('error', clientError);
      }, timeToRetryConnection);
  }
  //process.exit(1);
};

function clientError(err) {
  var date = new Date();
  console.log("cerror: " + date.toString());
  producer.close();
  client.close();
  console.log('client error', err);
  if (reconnectInterval == null) { // Multiple Error Events may fire, only set one connection retry.
    reconnectInterval =
      setTimeout(function () {
        console.log("reconnect is called in producer error event");
        client = new Client(zkList);
        producer = new Producer(client, {requireAcks: 1});
        producer.on('ready', producerReady);

        producer.on('error', producerError);

        client.on('error', clientError);
      }, timeToRetryConnection);
  }
  //process.exit(1);
};


producer.on('ready', producerReady);

producer.on('error', producerError);

client.on('error', clientError);
//////////////////////////////////

var appMap = {
//			"Perfect_And"       : "0368eb926b115ecaf41eff9a0536a332ef191417" : {appName: "PF", appOS: "And"}, // Perfect_And
//			"Perfect_iOS"       : "02ce3171f470b3d638feeaec0b3f06bd27f86a26" : {appName: "PF", appOS: "iOS"}, // Perfect_iOS
  "d10ca4b26d3022735f3c403fd3c91271eb3054b0": {appName: "Test", appOS: "And"}, // Test
  "9219f32e8de29b826faf44eb9b619788e29041bb": {appName: "YMK", appOS: "iOS"}, // YouCam_MakeUp_iOS
  "75edfca17dfbe875e63a66633ed6b00e30adcb92": {appName: "YMK", appOS: "And"}, // YouCam_MakeUp_And
  "c277de0546df31757ff26a723907bc150add4254": {appName: "YCP", appOS: "iOS"}, // YouCam_Perfect_iOS
  "e315c111663af26a53e5fe4c82cc1baeecf50599": {appName: "YCP", appOS: "And"}, // YouCam_Perfect_And
  "895ef49612e79d93c462c6d34abd8949b4c849af": {appName: "YCN", appOS: "And"}, // YouCam_Nail_And
  "ecc26ef108c821f3aadc5e283c512ee68be7d43e": {appName: "YCN", appOS: "iOS"}, // YouCam_Nail_iOS
  "488fea5101de4a8226718db0611c2ff2daeca06a": {appName: "BCS", appOS: "And"}, // BeautyCircle_And
  "7cd568771523a0621abff9ae3f95daf3a8694392": {appName: "BCS", appOS: "iOS"}, // BeautyCircle_iOS
  "0a9928b86e75195094cac739c1f0dbd6d5660ad6": {appName: "YCL", appOS: "And"}, // YouCam_Live_And
  "32201f63d36dcf07963ed97727a3dc3019e0e458": {appName: "YCL", appOS: "iOS"}, // YouCam_Live_iOS
  "58624be20f93c99117c83fc4efb13e3db2b54c17": {appName: "YMC", appOS: "And"}, // YouCam_Makeup_China_And
  "d2892f0d5485a7a5818b267d369b674669d1b415": {appName: "YMC", appOS: "iOS"}, // YouCam_Makeup_China_iOS
  "093ceb063bc69ffe79af7852a715f95fd91547f2": {appName: "YCF", appOS: "And"}, // YouCam_Fun_And
  "9d23f2108e703661545fe60336ab5e4ef120b189": {appName: "YCF", appOS: "iOS"}, // YouCam_Fun_iOS
  "82694c09eb10f576b12645cad667dc2c740db1a0": {appName: "YCC", appOS: "And"}, // YouCam_Collage_And
  "3aa2b6516f3d9ea559561a8c3bca1fe0b8a96371": {appName: "YCC", appOS: "iOS"}, // YouCam_Collage_iOS
  "582c471bbd055a81b554c7d74658f1ad017e8c2b": {appName: "YMKL", appOS: "iOS"}, // YouCam_Collage_iOS
  "fa9cbde99587e00afcbd7a9c834e78b5185b8065": {appName: "YCS", appOS: "And"}, // YouCam_Store_Android
  "9357f63f387a02872cae14f8539b37cc37404727": {appName: "YCS", appOS: "iOS"}, // YouCam_Store_iOS
  "9f093278d98ad4159a6df2f29d021e6e34649747": {appName: "Amway", appOS: "And"}, // Amway_Android
  "1a89a46c0465a15ce57f3709ca01c2c9fb36feb4": {appName: "Amway", appOS: "iOS"}, // Amway_iOS
  "f3d19fb71368070ae82c297aac2326d068e72ffa": {appName: "YMK_CN", appOS: "And"}, // YouCam_MakeUp_CN_And
  "96a43b9b8bff3cf212e8fcb797158d276a0f4369": {appName: "YMK_CN", appOS: "iOS"}, // YouCam_MakeUp_CN_iOS
  "203c5f37c4a6617cb65791547115f480169674b6": {appName: "YCP_CN", appOS: "And"}, // YouCam_Perfect_CN_And
  "d67447cebd490c3df91a614698dc7782520dfedb": {appName: "YCP_CN", appOS: "iOS"}, // YouCam_Perfect_CN_iOS
  "ab8ada3e1f156663453cee32debe3292fba834ae": {appName: "Belcorp_Skincare", appOS: "And"}, // Belcorp_Skinkcare_Android
  "b9bf6664c33ca7d55ba347f652abe1bc9ef39378": {appName: "BrandMode", appOS: "And"}, // BrandMode_Android
  "12c6646571c9cf9f7ecb00b4af3ca3ecc49635eb": {appName: "BrandMode", appOS: "iOS"}, // BrandMode_iOS
  "fb0af88d7f5fb1e26e9da63c4339fe94a097eab1": {appName: "YMK4B", appOS: "And"}, // YMK4B_Android
  "461299f3d378fc762c56d003e98ae5f02fd52d60": {appName: "YMK4B", appOS: "iOS"}, // YMK4B_iOS
  "93f0d4501694758e34a9fbf9f97e17d0a999ab8a": {appName: "YMK4BTrial", appOS: "And"}, // YMK4BTrial_Android
  "d0713956948af94d4c53e348c2cb6d816a3c2925": {appName: "YMK4BTrial", appOS: "iOS"}, // YMK4BTrial_iOS
  "43259ebca3c2c882f2ee9e39a679b6e6fd00f552": {appName: "YMK4BBrand", appOS: "And"}, // YMK4BBrand_Android
  "bf6bad03e0833e6e432a74136a01809bb3b980d4": {appName: "YMK4BBrand", appOS: "iOS"}, // YMK4BBrand_iOS
  "fd129a84a9ae650fb18837e6cba7b69c6ec358da": {appName: "AmwayCN_AEC", appOS: "iOS"}, // AmwayCN_AEC_iOS
  "6993b74968d8ecdaa3b3c633beca800de732381a": {appName: "YCV", appOS: "And"}, // YouCamVideo_Android
  "ddaba760aee9df94441fd71b2a33428747e40510": {appName: "YCVBeauty", appOS: "And"}, // YouCamVideoBeauty_Android_
  "163d0a7e3466314d812085f7c515c3509f638dfd": {appName: "YCVBeauty", appOS: "iOS"}, // YouCamVideoBeauty_iOS
  "54e26029b464a4a2d15ccfd237049c94db09ca36": {appName: "YCT", appOS: "iOS"}, // YouCamToolkit_iOS
  "ffa4f1f6c8f0fe9bc6784e5d0a1093ef76e8aa69": {appName: "DandG", appOS: "And"}, // D&G_Android
  "9e5d79f015916093f83e365db4860d756cdc7625": {appName: "DandG", appOS: "iOS"}, // D&G_iOS
  "251ff0b79d64016f72896891275fed15caa231f8": {appName: "Aphrodite", appOS: "And", sdk: true}, // Aphrodite_Android
  "c210e235a2dd64d7625b793443de2d7ab2424ae3": {appName: "Aphrodite", appOS: "iOS", sdk: true}, // Aphrodite_iOS
  "3c8be6a417c8e010ca308f1764bcb1542ce737b2": {appName: "MaryKay_China", appOS: "And", sdk: true}, // MaryKay_China_Android
  "b3f2a6b45d6e85c800fc1fdd0bc1661e078abc7d": {appName: "MaryKay_China", appOS: "iOS", sdk: true}, // MaryKay_China_iOS
  "c663695f82953a2cf08a62708abee819017547ad": {appName: "Macy", appOS: "And", sdk: true}, // Macy_Android
  "1a5148404c93125d08471786048b963753bec867": {appName: "Macy", appOS: "iOS", sdk: true}, // Macy_iOS
  "84493bce19fc2f47ea01f137c039aee409307ef6": {appName: "Chanelvmulips", appOS: "And", sdk: true}, // Chanelvmulips_Android
  "91100044a443e63ef1dc5e445bbdcf6780540be9": {appName: "Chanelvmulips", appOS: "iOS", sdk: true}, // Chanelvmulips_iOS
  "e77207f42d0ad8aa92dee64a95aa55e3168f3b87": {appName: "Belcorp", appOS: "And", sdk: true}, // Belcorp_Android
  "7f23cfce180b8cd241bfddf4a82e71e336b14202": {appName: "Ulta_APP", appOS: "And", sdk: true}, // Ulta_APP_Android
  "6be0c77c08be6f58e2a7cee41f6c733bd82fe7c3": {appName: "Ulta_APP", appOS: "iOS", sdk: true}, // Ulta_APP_iOS
  "10a2326746ab6fc6c8ddbfd9d8315e816e9e7d69": {appName: "Samsung_APP", appOS: "And", sdk: true}, // Samsung_APP_Android
  "caf0ed4568d6dcadfc5273f2c5aa2946f86b67aa": {appName: "Samsung_APP", appOS: "iOS", sdk: true}, // Samsung_APP_iOS
  "b98f3c641eb239348cb5662eb02d933e825a4cb2": {appName: "Shopee_APP", appOS: "And", sdk: true}, // Sopee_APP_Android
  "e3889727fadd953c085920b85086d09b402822d4": {appName: "Shopee_APP", appOS: "iOS", sdk: true}, // Sopee_APP_iOS
  "e2cc30cc2c6dda6ab8b86c32cce36b0edc44a0ac": {appName: "Sephora_APP", appOS: "And", sdk: true}, // Sephora_APP_Android
  "69ac8776819cd12613987fccaeb71cf751fd15dd": {appName: "Sephora_APP", appOS: "iOS", sdk: true}, // Sephora_APP_iOS
  "a041f6e19d9f9716ac1cf3d2ac87e17db243b8b0": {appName: "NuSkin_APP", appOS: "iOS", sdk: true}, // NuSkin_APP_iOS
  "e59b623a8e311c7a35ea144053d2c476c57a3806": {appName: "Baidu_SDK", appOS: "And", sdk: true}, // Baidu_SDK_Android
  "8dab8b556e5efc5d712cc91435dd74e9da595f63": {appName: "Baidu_SDK", appOS: "iOS", sdk: true}, // Baidu_SDK_iOS
  "3ef5d0a9840e2c33208b893dac3d708471e28fe7": {appName: "Henkel_APP", appOS: "iOS", sdk: true}, // Henkel_APP_iOS
  "2e33f3e5161308a187044506104933fbbf516df7": {appName: "Nordstrom_APP", appOS: "And", sdk: true}, // Nordstrom_APP_Android
  "e53d5025b76090841518eedeffcb313e797daf85": {appName: "Nordstrom_APP", appOS: "iOS", sdk: true}, // Nordstrom_APP_iOS
  "c2bb6f4c426fb1407aa346728db51946f1be40cf": {appName: "Coty_APP", appOS: "And", sdk: true}, // Coty_APP_Android
  "c193e49bf09900c6c46cdd85ad05737177941a3f": {appName: "LG_Mobile_APP", appOS: "And", sdk: true}, // LG_Mobile_APP_Android
  "6c086f89df896b5286817e871783f803ffc51eae": {appName: "Amway_CN_makeup_APP", appOS: "And", sdk: true}, // Amway_CN_makeup_APP_Android
  "e8c4410fdfa48614b5f625ed70814d9720388aa3": {appName: "Amway_CN_skincare_APP", appOS: "And", sdk: true}, // Amway_CN_skincare_APP_Android
  "f0ed22c36da25717000a38ea568c0da640dbc887": {appName: "Amway_CN_makeup_SDK", appOS: "iOS", sdk: true}, // Amway_CN_makeup_SDK_iOS
  "5e954ee93b5c921638fda22870942115b06a9b7f": {appName: "Target_APP", appOS: "And", sdk: true}, // Target_APP_Android
  "02c5193b372dfab39153d908643ab193fec45671": {appName: "Target_APP", appOS: "iOS", sdk: true}, // Target_APP_iOS
  "1af5ddb03103baed28f5493e2da04cada6de295d": {appName: "Alibaba_APP", appOS: "And", sdk: true}, // Alibaba_APP_Android
  "092e4252ae62b245c789721a0d4e8c170645d824": {appName: "Alibaba_APP", appOS: "iOS", sdk: true}, // Alibaba_APP_iOS
  "bbfc85c7f10800792d984d5250b2066dcd24a016": {appName: "Golden_Scent_makeup_APP", appOS: "And", sdk: true}, // Golden_Scent_makeup_APP_Android
  "86c5197458e4afeec7542bccc3cec3c5652ecea7": {appName: "Golden_Scent_makeup_APP", appOS: "iOS", sdk: true}, // Golden_Scent_makeup_APP_iOS
  "b880f78e2183cab2344f19e6d6f1317592fcfdf2": {appName: "Golden_Scent_skincare_APP", appOS: "And", sdk: true}, // Golden_Scent_skincare_APP_Android
  "d841ec9fc04673a3940894ff5fb1e7d95b172df2": {appName: "Golden_Scent_skincare_APP", appOS: "iOS", sdk: true}, // Golden_Scent_skincare_APP_iOS
  "b6d12a2f9483efeaa4880c92949474be61cd109a": {appName: "SeneGence_SDK", appOS: "And", sdk: true}, // SeneGence_SDK_Android
  "89347fa159e30a29b54809f6c464b7509d2caa5c": {appName: "SeneGence_SDK", appOS: "iOS", sdk: true}, // SeneGence_SDK_iOS
  "f1241c08fb759b14405ddf6b8a63dc9083e4b10c": {appName: "TomFord_SDK", appOS: "iOS", sdk: true}, // TomFord_SDK_iOS
  "239070f48984a19e8abde56d31016bfc5e9fd96d": {appName: "Sephora_CN_SDK", appOS: "And", sdk: true}, // Sephora_CN_SDK_Android
  "d2ad67eacfecc86925686137f0ad4ae3e5a70a02": {appName: "Sephora_CN_SDK", appOS: "iOS", sdk: true}, // Sephora_CN_SDK_iOS
  "33e7733dbb3bf2e24e29c4bd0f1f740feafb5f52": {appName: "MAC_CN_SDK", appOS: "iOS", sdk: true}, // MAC_CN_SDK_iOS
  "eaa598f317b5c720e89710804ee34fb106d31d03": {appName: "Huawei_Makeup_SDK", appOS: "And", sdk: true}, // Huawei_Makeup_SDK_Android
  "e430b40c28cdbe74f7bc7f59c3726c99a086d814": {appName: "Estee_Lauder_global_SDK", appOS: "iOS", sdk: true}, // Estee_Lauder_global_SDK_iOS
  "13383acd7323d028f28be6bd682dd8f4c8e5996d": {appName: "Flipkart_India_SDK", appOS: "And", sdk: true}, // Flipkart_India_SDK_Android
  "a6cd88e0cc40c31632f41571ee3bf7f4234405cc": {appName: "Chanel_Eyewear_SDK", appOS: "iOS", sdk: true}, // Chanel_Eyewear_SDK_iOS
  "db1fe5367ff4421d5e65aa0bb52c6a341a7126e8": {appName: "D_And_G_SDK", appOS: "iOS", sdk: true}, // D&G_SDK_iOS
  "2b1e7099d6dfff7938348c41cb8d1704e3a677cd": {appName: "Showroom_SDK", appOS: "iOS", sdk: true}, // Showroom_SDK_iOS
  "37aab770e0c93593fd06c6bfcf65a6545a022836": {appName: "China_Mobile_SDK", appOS: "And", sdk: true}, // China_Mobile_SDK_And
  "52e6f4ca531d973114364772666bdafa3aa5204a": {appName: "MAC_SDK", appOS: "iOS", sdk: true}, // MAC_SDK_iOS
  "9e2fc2f29d7ebc17b0be8be21b861c6b267a862a": {appName: "Sally_Beauty_SDK", appOS: "And", sdk: true}, // Sally_Beauty_SDK_And
  "965acda917a2d8b780bca163163458186de0c258": {appName: "Sally_Beauty_SDK", appOS: "iOS", sdk: true}, // Sally_Beauty_SDK_iOS
  "c92608f1d6fe19cdb99545af6ad4051c271655ac": {appName: "Tapcart_SDK", appOS: "iOS", sdk: true}, // Tapcart_SDK_iOS
  "2cfdbb56a214a13014a0b08423c8f39e66d258c0": {appName: "Neutrogena_SDK", appOS: "And", sdk: true}, // Neutrogena_SDK_And
  "944a6288ab6405bdef01d4c4d49d619403b23cab": {appName: "Neutrogena_SDK", appOS: "iOS", sdk: true}, // Neutrogena_SDK_iOS
  "c247f4b1892676a2d90b5b96be20e924832bcaad": {appName: "Pinterest_SDK", appOS: "And", sdk: true}, // Pinterest_SDK_And
  "40ada45b2e57a93eb7dab340352514fbd76a3680": {appName: "Pinterest_SDK", appOS: "iOS", sdk: true}, // Pinterest_SDK_iOS
  "3b1b6f2de82a7e0cf77fdf642aece5a151303dbb": {appName: "Jiali_CN_SDK", appOS: "And", sdk: true}, // Jiali_CN_SDK_And
  "52e8e886796e2fd79ad62f5a5512ad471e594c83": {appName: "Jiali_CN_SDK", appOS: "iOS", sdk: true}, // Jiali_CN_SDK_iOS
  "99a584e7d0ce0fa9277e614d61c8b814a2d6d909": {appName: "NordStom_VV_SDK", appOS: "And", sdk: true}, // NordStrom_VV_SDK_And
  "95b264464cd21e7f084dc169a624114f61681473": {appName: "FiNC_SDK", appOS: "And", sdk: true}, // FiNC_SDK_And
  "d6b321e4afb2bdec35c1cb6c4b779d7e52a9b770": {appName: "FiNC_SDK", appOS: "iOS", sdk: true}, // FiNC_SDK_iOS
  "020813e047513d2137ad9727d593712b0f68c3a0": {appName: "TomFord_CN_SDK", appOS: "iOS", sdk: true}, // TomFord_CN_SDK_iOS
  "aee89108117e13131dd856559ed20f52d8710590": {appName: "AmazingLashStudio_SDK", appOS: "And", sdk: true}, // AmazingLashStudio_SDK_And
  "b6799324da67a2727cc7ceffa3acf4822a091d2f": {appName: "AmazingLashStudio_SDK", appOS: "iOS", sdk: true}, // AmazingLashStudio_SDK_iOS
  "8466d287b0afdfe80df10a0ccfd55efb4b8644f9": {appName: "NTT_JP_SDK", appOS: "And", sdk: true}, // NTT_JP_SDK_And
  "7f2e1083f7f5f7c686679e4a522d6b4f7ebac34f": {appName: "NTT_JP_SDK", appOS: "iOS", sdk: true}, // NTT_JP_SDK_iOS
  "32e2d24bd53c37f91ce5d33f6a6b40a6320c37f6": {appName: "Chanel_Eyewear_SDK", appOS: "And", sdk: true}, // Chanel_Eyewear_SDK_And
  "b0a8189bdb410616b855a15e5b7a80975da92a96": {appName: "LG_Electronics_SDK", appOS: "And", sdk: true}, // LG_Electronics_SDK_And
  "87d479c76d9a6f75db9a9a07a20c5a6f649db4e1": {appName: "LG_Electronics_SDK", appOS: "iOS", sdk: true}, // LG_Electronics_SDK_iOS
  "488dbc1e7acdf4dd4db283161d9b341c5d4f8ed4": {appName: "MAC_RED_SDK", appOS: "And", sdk: true}, // MAC_RED_SDK_And
  "442f04d7d3cf49e3303cb183ccc43ea4e24968af": {appName: "MAC_RED_SDK", appOS: "iOS", sdk: true}, // MAC_RED_SDK_iOS
  "f8b4be54ee38cc8ccc39b77ee1065c9d29da8b26": {appName: "Icon_Skincare_SDK", appOS: "And", sdk: true}, // Icon_Skincare_SDK_And
  "767d5ea611ac01b38f87b87e3a59e0473cd2a019": {appName: "Icon_Hair_color_SDK", appOS: "And", sdk: true}, // Icon_Hair_color_SDK_And
  "5554ac343cc1b0f9b48ea881553126cd8320a6de": {appName: "EL_CareOS_SDK", appOS: "And", sdk: true}, // EL_CareOS_SDK_And
  "94feb6fef74ff08ac266ad8fa9535e08dac23737": {appName: "AmorePacificHQ_KR_SDK", appOS: "And", sdk: true}, // AmorePacificHQ_KR_SDK_And
  "4d9619fe88545c3bf235e31fb467d637918e1cb3": {appName: "AmorePacificHQ_KR_SDK", appOS: "iOS", sdk: true}, // AmorePacificHQ_KR_SDK_iOS
  "740f5f030fe2b94eeadef71f77606868fc34a3ff": {appName: "WCM", appOS: "Web"} // WCM_Web
};

/// import auto generate android appkey

for (var index in androidAutoAppkey) {
  var item = androidAutoAppkey[index];
  appMap[item.appKey] = {appName: item.appName, appOS: item.appOS, sdk: item.sdk};
}

/// import auto generate ios appkey

for (var index in iOSAutoAppkey) {
  var item = iOSAutoAppkey[index];
  appMap[item.appKey] = {appName: item.appName, appOS: item.appOS, sdk: item.sdk};
}

//console.log(appMap);


function getTopicName(header, appkey) {
  var topicName = "";
  for (var key in appMap) {
    if (appkey.indexOf(key) >= 0) {
      topicName = header + "_" + appMap[key].appName + "_" + appMap[key].appOS;
      return topicName;
    }
  }
  topicName = header + "_OtherApp";
  return topicName;
}

function getNodeTopicName(header, appkey) {
  var topicName = "";
  for (var key in appMap) {
    if (appkey.indexOf(key) >= 0) {
      if (appMap[key].sdk) {
        topicName = "Node_" + header + "_SDK";
      } else {
        topicName = "Node_" + header + "_" + appMap[key].appName + "_" + appMap[key].appOS;
      }
      return topicName;
    }
  }
  topicName = "Node_" + header + "_OtherApp";
  return topicName;
}

function kafkaCB(err, result) {
  if (err) {
    kafkaErrorCount++;
    errorContext += (JSON.stringify(err) + "\r\n");
    console.log("ERROR: " + err);
    console.log("result: " + JSON.stringify(result));
    //producer.close();
    //client.close();
    if (kafkaErrorCount && (kafkaErrorCount % kafkaErrorMaxCount == 0)) {
      //kafkaErrorCount = 0;
      //errorContext = "";
      console.log("Kafka Exception Send Mail");
      var cmd = 'echo "' + errorContext + '" | mail -s "Kafka Exception Count ' + kafkaErrorCount + ' times" ' + failMailList;
      exec(cmd, function (error, stdout, stderr) {
        if (error)
          console.log(error);
      });
    }
  }
}

function sendKafka(data, key, isSession) {
  var topicName = getNodeTopicName((isSession ? "Session" : "Event"), key);
  randomCnt = ((++randomCnt) % partitionNum);
  var deviceID = data.device_id;
  var checkABTest = false;
  if (cando) {
    //console.log(JSON.stringify(data));
    if (!isNoKafka) {
      producer.send([
        {topic: topicName, partition: (randomCnt % partitionNum), messages: JSON.stringify(data)}
      ], kafkaCB);
    } else {
      noKafkaProducer.send({
          topic: topicName,
          partition: (randomCnt % partitionNum),
          message: {
            value: JSON.stringify(data)
          }
        },
        {
          retries: {
            attempts: 60,
            delay: 1000
          }
        }).then(function (result) {
        result.forEach(function (entry) {
          if (entry.error) {
            console.log("ERROR: " + entry.error);
            nokafkaErrorCount++;
            nokafkaerrorContext += (JSON.stringify(err) + "\r\n");
            if (nokafkaErrorCount && (nokafkaErrorCount % kafkaErrorMaxCount == 0)) {
              console.log("no-Kafka Exception Send Mail");
              var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "no-Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
              exec(cmd, function (error, stdout, stderr) {
                if (error)
                  console.log(error);
              });
            }
          }
        });
        //console.log(result);
      });
      if (checkBloomFilter) {
        if (GLOBAL.userTableFilter) {
          checkABTest = GLOBAL.userTableFilter.test(deviceID);
          if (checkABTest) {
            randomCntABTesting = ((++randomCntABTesting) % partitionNum);
            noKafkaProducer.send({
                topic: ABTestTopicName,
                partition: (randomCntABTesting % partitionNum),
                message: {
                  value: JSON.stringify(data)
                }
              },
              {
                retries: {
                  attempts: 60,
                  delay: 1000
                }
              }).then(function (result) {
              result.forEach(function (entry) {
                if (entry.error) {
                  console.log("ERROR: " + entry.error);
                  nokafkaErrorCount++;
                  nokafkaerrorContext += (JSON.stringify(err) + "\r\n");
                  if (nokafkaErrorCount && (nokafkaErrorCount % kafkaErrorMaxCount == 0)) {
                    console.log("no-Kafka Exception Send Mail");
                    var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "no-Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
                    exec(cmd, function (error, stdout, stderr) {
                      if (error)
                        console.log(error);
                    });
                  }
                }
              });
              //console.log(result);
            });
          }
        }
      }
    }
  }
}

function sendOthersKafka(data, key, isSession) {
  var topicName = "CheckSum";
  randomCntOthers = ((++randomCntOthers) % partitionNum);
  if (cando) {
    //console.log(JSON.stringify(data));
    if (!isNoKafka) {
      producer.send([
        {topic: topicName, partition: (randomCntOthers % partitionNum), messages: JSON.stringify(data)}
      ], kafkaCB);
    } else {
      noKafkaProducer.send({
          topic: topicName,
          partition: (randomCntOthers % partitionNum),
          message: {
            value: JSON.stringify(data)
          }
        },
        {
          retries: {
            attempts: 60,
            delay: 1000
          }
        }).then(function (result) {
        result.forEach(function (entry) {
          if (entry.error) {
            console.log("ERROR: " + entry.error);
            nokafkaErrorCount++;
            nokafkaerrorContext += (JSON.stringify(err) + "\r\n");
            if (nokafkaErrorCount && (nokafkaErrorCount % kafkaErrorMaxCount == 0)) {
              console.log("no-Kafka Exception Send Mail");
              var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "no-Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
              exec(cmd, function (error, stdout, stderr) {
                if (error)
                  console.log(error);
              });
            }
          }
        });
        //console.log(result);
      });
    }
  }
}

function sendUMAHKafka(data, key, isSession, topicName) {
  var topicName = topicName;
  randomCntOthers = ((++randomCntOthers) % partitionNum);
  if (cando) {
    //console.log(JSON.stringify(data));
    if (!isNoKafka) {
      producer.send([
        {topic: topicName, partition: (randomCntOthers % partitionNum), messages: JSON.stringify(data)}
      ], kafkaCB);
    } else {
      noKafkaProducer.send({
          topic: topicName,
          partition: (randomCntOthers % partitionNum),
          message: {
            value: JSON.stringify(data)
          }
        },
        {
          retries: {
            attempts: 60,
            delay: 1000
          }
        }).then(function (result) {
        result.forEach(function (entry) {
          if (entry.error) {
            console.log("ERROR: " + entry.error);
            nokafkaErrorCount++;
            nokafkaerrorContext += (JSON.stringify(err) + "\r\n");
            if (nokafkaErrorCount && (nokafkaErrorCount % kafkaErrorMaxCount == 0)) {
              console.log("no-Kafka Exception Send Mail");
              var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "no-Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
              exec(cmd, function (error, stdout, stderr) {
                if (error)
                  console.log(error);
              });
            }
          }
        });
        //console.log(result);
      });
    }
  }
}

function getOEMTopicName(header, appkey) {
  var topicName = "";
  for (var key in appMap) {
    if (key == 'd10ca4b26d3022735f3c403fd3c91271eb3054b0') continue;
    if (appkey.indexOf(key) >= 0) {
      topicName = header;
      return topicName;
    }
  }
  topicName = "OEM_others";
  return topicName;
}

function sendOEMKafka(data, key, isSession) {
  var topicName = getOEMTopicName((isSession ? "OEM_session" : "OEM_event"), key);
  if (topicName == "OEM_others") {
    return;
  }
  randomCntOEM = ((++randomCntOEM) % partitionNum);
  if (cando) {
    //console.log(JSON.stringify(data));
    if (!isNoKafka) {
      producer.send([
        {topic: topicName, partition: (randomCntOEM % partitionNum), messages: JSON.stringify(data)}
      ], kafkaCB);
    } else {
      noKafkaProducer.send({
          topic: topicName,
          partition: (randomCntOEM % partitionNum),
          message: {
            value: JSON.stringify(data)
          }
        },
        {
          retries: {
            attempts: 60,
            delay: 1000
          }
        }).then(function (result) {
        result.forEach(function (entry) {
          if (entry.error) {
            console.log("ERROR: " + entry.error);
            nokafkaErrorCount++;
            nokafkaerrorContext += (JSON.stringify(err) + "\r\n");
            if (nokafkaErrorCount && (nokafkaErrorCount % kafkaErrorMaxCount == 0)) {
              console.log("no-Kafka Exception Send Mail");
              var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "no-Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
              exec(cmd, function (error, stdout, stderr) {
                if (error)
                  console.log(error);
              });
            }
          }
        });
        //console.log(result);
      });
    }
  }
}

function sendKafkaRest(data, key, isSession) {
  var topicName = getTopicName((isSession ? "Session" : "Event"), key);
  common.kafka.topic(topicName).produce(JSON.stringify(data), function (err, res) {
    //console.log("res: " + JSON.stringify(res));
    if (err) {
      console.log("ERROR: " + err);
    }
  });
  return;
  //console.log(JSON.stringify(data));
  var eventMap = "";
  if (data.events) {
    if (data.app_key) {
      var isMatched = false;
      for (var key in appMap) {
        if (data.app_key.indexOf(key) >= 0) {
          eventMap += appMap[key].appName + "\t"; // F_APP_NAME
          eventMap += appMap[key].appOS + "\t"; // F_OS
          isMatched = true;
          break;
        }
      }
      if (!isMatched) {
        eventMap += "" + "\t"; // F_APP_NAME
        eventMap += "" + "\t"; // F_OS
      }
    } else {
      eventMap += "" + "\t"; // F_APP_NAME
      eventMap += "" + "\t"; // F_OS
    }

    eventMap += (data.id ? data.id : "NULL") + "\t"; // F_ID
    eventMap += (data.app_key ? data.app_key : "") + "\t";
    eventMap += (data.app_user_id ? data.app_user_id : "") + "\t";
    eventMap += (data.device_id ? data.device_id : "") + "\t";
    eventMap += (data.ip_address ? data.ip_address : "") + "\t";
    //var time = moment.tz(data.timestamp * 1000, "America/Denver").format("HH:mm:ss");
    //var day = moment.tz(data.timestamp * 1000, "America/Denver").format("YYYY-MM-DD");
    eventMap += (data.timestamp ? moment.tz(data.timestamp * 1000, "America/Denver").format("YYYY-MM-DD") : "") + "\t"; // F_TIMESTAMP_DAY
    eventMap += (data.timestamp ? moment.tz(data.timestamp * 1000, "America/Denver").format("HH:mm:ss") : "") + "\t"; // F_TIMESTAMP_TIME
    eventMap += (data.country ? data.country : "") + "\t";
    //console.log(eventMap);

    if (!data.metrics) {
      //console.log("mo metrics");
      //console.log(JSON.stringify(data));
      return;
    }
    eventMap += (data.metrics._carrier ? data.metrics._carrier : "") + "\t";
    eventMap += (data.metrics._device ? data.metrics._device : "") + "\t";
    eventMap += (data.metrics._os_version ? data.metrics._os_version : "") + "\t";
    eventMap += (data.metrics._locale ? data.metrics._locale : "") + "\t";
    eventMap += (data.metrics._app_version ? data.metrics._app_version : "") + "\t";
    eventMap += (data.metrics._resolution ? data.metrics._resolution : "") + "\t";
    eventMap += (data.metrics._os ? data.metrics._os : "") + "\t";

    if (data.vendor) {
      var len = Object.keys(data.vendor).length;
      var vender = "";
      var c = 0;
      for (var key in data.vendor) {
        c++;
        vender += key + ":" + data.vendor[key];
        if (c < len) {
          vender += ",";
        }
      }
      eventMap += vender + "\t";
    } else {
      eventMap += "" + "\t";
    }

    if (data.events) {
      for (var i in data.events) {
        var x = "";
        x += (data.events[i].key ? data.events[i].key : "") + "\t";
        x += (data.events[i].sum != "undefined" ? data.events[i].sum : "") + "\t";
        x += (data.events[i].count != "undefined" ? data.events[i].count : "") + "\t";
        x += (data.events[i].timestamp ? moment.tz(data.events[i].timestamp * 1000, "America/Denver").format("YYYY-MM-DD") : "") + "\t";		// E_TIMESTAMP_DAY
        x += (data.events[i].timestamp ? moment.tz(data.events[i].timestamp * 1000, "America/Denver").format("HH:mm:ss") : "") + "\t";		// E_TIMESTAMP_TIME
        //		console.log(x);
        if (data.events[i].segmentation) {
          var len = Object.keys(data.events[i].segmentation).length;
          var segment = "";
          var c = 0;
          for (var key in data.events[i].segmentation) {
            c++;
            segment += key + "#" + data.events[i].segmentation[key];
            if (c < len) {
              segment += ",";
            }
          }
        }
        //console.log(x + segment);
        var send = eventMap + x + segment;
        //console.log("[normal] send to kafka " + send);
        common.kafka.topic("topic_webservice_normal").produce(send, function (err, res) {
          //console.log("res: " + JSON.stringify(res));
          if (err) {
            console.log("ERROR: " + err);
          }
        });
      }
    }
  } else {
    //console.log("no events");
  }

  //common.kafka.topic("elly").produce(JSON.stringify(data));
}

function logDbError(err, res) {
  if (err) {
    console.log('DB operation error');
    console.log(err);
  } else {
    console.log("Everything is OK");
  }
}

function insertRawColl(coll, eventp, params, isSession) {
  var dealNumber = "";
  var oem = false;
  var currDate = new Date();
  var checkOEM = null;
  //console.log('insert collection name:'+coll);
  eventp.app_key = params.qstring.app_key;
  //eventp.app_id = params.app_id;
  //eventp.appTimezone = params.appTimezone;
  //eventp.app_cc = params.app_cc;
  eventp.app_user_id = params.app_user_id;
  eventp.device_id = params.qstring.device_id;
  eventp.timestamp = params.qstring.timestamp;
  if (eventp.timestamp < 0) {
    eventp.timestamp = (currDate / 1000 | 0);
  }
  eventp.tz = params.qstring.tz;
  eventp.ip_address = params.ip_address;
  eventp.dbtimestamp = Math.round(currDate / 1000);
//    common.computeGeoInfo(eventp);
  if (params.qstring.new_user) {
    eventp.new_user = params.qstring.new_user;
  }
  if (params.qstring.qmwd_active_user) {
    eventp.qmwd_active_user = params.qstring.qmwd_active_user;
  }
  if (params.qstring.session_id) {
    eventp.session_id = params.qstring.session_id;
  }
  if (params.qstring.session_id_idx) {
    eventp.session_id_idx = params.qstring.session_id_idx;
  }
  if (params.qstring.vendor_info) {
    //console.log(JSON.stringify(params.qstring.vendor_info, null, 2));
    eventp.vendor = params.qstring.vendor_info;
    oem = true;
    //dealNumber = eventp.vendor.deal_no;
    srNumber = eventp.vendor.sr_no_ori;
    if (srNumber) {
      checkOEM = jsonQuery(['[sr_no=?]', srNumber], {data: oemMaps}).value;
      if (!checkOEM) {
        oem = false;
        //console.log("not in oem table :"+dealNumber);
      } else {
        //console.log("in oem table :"+dealNumber);
        // check start and end (timestamp per sec)
        dealNumber = checkOEM.deal_no;
        if (eventp.timestamp) {
          if (checkOEM.start && checkOEM.start > eventp.timestamp) {
            //console.log("before start oem false");
            oem = false;
          } else {
            if (checkOEM.end && checkOEM.end < eventp.timestamp) {
              //console.log("after end oem false");
              oem = false;
            } else {
              //console.log("before end oem true");
            }
          }
        } else {
          //console.log("no timestamp oem false");
          oem = false;
        }
        if (!dealNumber) {
          oem = false;
        }
      }
    } else {
      oem = false;
    }
  }
  //console.log('[db insert]:%j', eventp);
  if (!eventp.app_key) {
    console.log('Null app_key.');
    console.log(eventp.ip_address);
    return;
  }
  if (!eventp.device_id) {
    console.log('Null device_id, app key: ' + eventp.app_key);
    console.log(eventp.ip_address);
    return;
  }
  if (eventp.app_key.length != 40) {
    console.log("app_key length too long (!=40)");
    console.log(eventp.ip_address);
    console.log(eventp.app_key);
    if (eventp.app_key)
      console.log(eventp.app_key.length);
    common.returnMessage(params, 200, 'Success');
    return;
  }

  common.computeGeoInfo(eventp);
  var appkey = eventp.app_key;
  var checkAppKey = jsonQuery(['[key=?]', appkey], {data: appKeyMaps}).value;
  if (!checkAppKey) {
    console.log(eventp.ip_address);
    console.log(eventp.country);
    console.log(eventp.app_key + " not in appKeyMaps!!!!!");
    common.returnMessage(params, 200, 'Success');
    return;
  }

  if (!(eventp.app_key == appKey.key["Perfect_And"] || eventp.app_key == appKey.key["Perfect_iOS"])) {
    //sendKafkaRest(eventp, eventp.app_key, isSession);
    // if (0)
    {
      if (!params.verifiy) {
        if (params.qstring.header) {
          eventp.header = params.qstring.header;
          eventp.src = params.qstring.src;
        }
        sendOthersKafka(eventp, eventp.app_key, isSession);
      } else {
        sendKafka(eventp, eventp.app_key, isSession);
//                if (0)
        {
          if (params.errorHeader) {
            sendUMAHKafka(eventp, eventp.app_key, isSession, params.topicName);
          }
        }
      }
    }
  }

  if (oem) {
    if (0) {
      var oemdb = common.getOEMRawDB(dealNumber);
      if (oemdb) {
        oemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      } else {
        console.log("can not get OEM database : (" + dealNumber + ")");
        oemdb = common.getErrorDB();
        oemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      }
    }
    if (0) {
      var shardoemdb = common.getShardOEMRawDB(eventp.app_key, dealNumber, currDate);
      if (shardoemdb) {
        shardoemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      } else {
        console.log("can not get OEM database : (" + dealNumber + ")");
        shardoemdb = common.getErrorDB();
        shardoemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      }
    }
    if (0) {
      var newShardoemdb = common.getNewShardOEMRawDB(eventp.app_key, dealNumber, currDate);
      if (newShardoemdb) {
        newShardoemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      } else {
        console.log("can not get OEM database : (" + dealNumber + ")");
        newShardoemdb = common.getErrorDB();
        newShardoemdb.collection(coll).insert(eventp, function (err, res) {
          if (err) {
            console.log('DB operation error');
            console.log(err);
          }
        });
      }
    }
    if (1) {
      var eventpOEM = eventp;
      if (!(checkOEM.deal_no == 'intex' || checkOEM.deal_no == 'medion')) {
        eventpOEM = JSON.parse(JSON.stringify(eventp));
        eventpOEM.store_name = checkOEM.deal_no;
        sendOEMKafka(eventpOEM, eventpOEM.app_key, isSession);
      }
      var oemdb = common.getNewOEMRawDB(eventpOEM.app_key, dealNumber, currDate);
      if (oemdb) {
        oemdb.collection(coll).insert(eventpOEM, function (err, res) {
          if (err) {
            console.log('OEM DB operation error');
            console.log(err);
          }
        });
      } else {
        console.log("can not get OEM database : (" + dealNumber + ")");
        oemdb = common.getErrorDB();
        oemdb.collection(coll).insert(eventpOEM, function (err, res) {
          if (err) {
            console.log('OEM DB operation error');
            console.log(err);
          }
        });
      }
    }
  } else {
    //common.db_raw.collection(coll).insert(eventp, function(err, res) {
    /*
            common.getRawDB(eventp.app_key).collection(coll).insert(eventp, function(err, res) {
                if (err) {
                    console.log('DB operation error');
                    console.log(err);
                }
            });
    */
    if (0) {
      common.getHourlyRawDB(eventp.app_key).collection(coll).insert(eventp, function (err, res) {
        if (err) {
          console.log('DB operation error');
          console.log(err);
        }
      });
    }
  }
  if (0) {
    common.getShardRawDB(eventp.app_key, currDate).collection(coll).insert(eventp, function (err, res) {
      if (err) {
        console.log('DB Shard operation error');
        console.log(err);
      }
    });
  }
  if (0) {
    if (!params.verifiy) {
      if (params.qstring.header) {
        eventp.header = params.qstring.header;
        eventp.src = params.qstring.src;
      }
      common.shard_others.collection(coll).insert(eventp, function (err, res) {
        if (err) {
          console.log('DB Shard operation error');
          console.log(err);
        }
      });
    } else {
      common.getNewShardRawDB(eventp.app_key, currDate).collection(coll).insert(eventp, function (err, res) {
        if (err) {
          console.log('DB Shard operation error');
          console.log(err);
        }
      });
    }

  }
  // if (0)
  /*
      {
          if (!params.verifiy) {
              if (params.qstring.header) {
                  eventp.header = params.qstring.header;
                  eventp.src = params.qstring.src;
              }
              sendOthersKafka(eventp, eventp.app_key, isSession);
              common.shard_others.collection(coll).insert(eventp, function(err, res) {
                  if (err) {
                      console.log('DB Shard operation error');
                      console.log(err);
                  }
              });
          }
      }
  */
}

function insertRawEvent(coll, params) {
  var eventp = {};
  if (params.qstring.metrics) {
    eventp.metrics = params.qstring.metrics;
  }
  if (params.qstring.session_id) {
    eventp.session_id = params.qstring.session_id;
  }
  if (params.qstring.session_id_idx) {
    eventp.session_id_idx = params.qstring.session_id_idx;
  }
  eventp.events = params.events;
//    if (params.qstring.header) {
//        eventp.header = params.qstring.header;
//    }
  insertRawColl(coll, eventp, params, 0);
}

function insertRawSession(coll, params) {
  var eventp = {};
  if (params.qstring.metrics) {
    //if (params.qstring.begin_session) {
    eventp.metrics = params.qstring.metrics;
    //}
  }
  if (params.qstring.session_id) {
    eventp.session_id = params.qstring.session_id;
  }
  if (params.qstring.session_id_idx) {
    eventp.session_id_idx = params.qstring.session_id_idx;
  }
  eventp.begin_session = params.qstring.begin_session;
  eventp.end_session = params.qstring.end_session;
  eventp.session_duration = params.qstring.session_duration;
//    if (params.qstring.header) {
//        eventp.header = params.qstring.header;
//    }
  insertRawColl(coll, eventp, params, 1);
}

var listAppKeyToPerfect_And = [appKey.key["YouCam_MakeUp_And"],
    appKey.key["YouCam_Perfect_And"],
    appKey.key["YouCam_Nail_And"],
    appKey.key["BeautyCircle_And"],
    appKey.key["YouCam_Live_And"]],
  listAppKeyToPerfect_iOS = [appKey.key["YouCam_MakeUp_iOS"],
    appKey.key["YouCam_Perfect_iOS"],
    appKey.key["YouCam_Nail_iOS"],
    appKey.key["BeautyCircle_iOS"],
    appKey.key["YouCam_Live_iOS"]];
// Checks app_key from the http request against "apps" collection.
// This is the first step of every write request to API.
function validateAppForWriteAPI(params) {
  if (params.qstring.app_key == '17a82958af48fdd76801a15991b2cafa1f0bcf92') {
    common.returnMessage(params, 200, 'Success');
    return;
  }

  if (params.events) {
    insertRawEvent(common.rawCollection['event'] + params.qstring.app_key, params);
  }

  if (params.qstring.begin_session || params.qstring.end_session || params.qstring.session_duration) {
    insertRawSession(common.rawCollection['session'] + params.qstring.app_key, params);
    /*
            // also insert to Perfect if app is YCP or YMK
            if(-1 != listAppKeyToPerfect_And.indexOf(params.qstring.app_key)) {
                var tmpParams = {
                    'qstring': {'app_key':appKey.key["Perfect_And"]},
                    'res':params.res,
                    'app_user_id':params.app_user_id,
                    'ip_address':params.ip_address,
                    'verifiy':true
                };
                for(var key in params.qstring) { // copy all property in qstring except app_key
                    if(key != 'app_key')
                        tmpParams.qstring[key] = params.qstring[key];
                }

                insertRawSession(common.rawCollection['session']+appKey.key["Perfect_And"], tmpParams);
            }

            if(-1 != listAppKeyToPerfect_iOS.indexOf(params.qstring.app_key)) {
                var tmpParams = {
                    'qstring': {'app_key':appKey.key["Perfect_iOS"]},
                    'res':params.res,
                    'app_user_id':params.app_user_id,
                    'ip_address':params.ip_address,
                    'verifiy':true
                };
                for(var key in params.qstring) { // copy all property in qstring except app_key
                    if(key != 'app_key')
                        tmpParams.qstring[key] = params.qstring[key];
                }
                insertRawSession(common.rawCollection['session']+appKey.key["Perfect_iOS"], tmpParams);
            }
    */
  }

  common.returnMessage(params, 200, 'Success');
  /*
      common.db.collection('apps').findOne({'key':params.qstring.app_key}, function(err,app) {
    if (err || !app) {
              common.returnMessage(params, 401, 'App does not exist');
        if (err) console.log(err);
        else console.log('app not found : '+params.qstring.app_key);
        return;
    }

          //console.log(params);
          params.app_id = app['_id'];
    params.appTimezone = app['timezone'];
    params.app_cc = app['country'];
          if (params.events) {
              insertRawEvent(common.rawCollection['event']+app['_id'], params);
          }

          if (params.qstring.begin_session || params.qstring.end_session || params.qstring.session_duration) {
              insertRawSession(common.rawCollection['session']+app['_id'], params);
          }

          common.returnMessage(params, 200, 'Success');
      });
  */
}

function validateUserForWriteAPI(callback, params) {
  common.db.collection('members').findOne({'api_key': params.qstring.api_key}, function (err, member) {
    if (!member || err) {
      common.returnMessage(params, 401, 'User does not exist');
      return false;
    }

    params.member = member;
    callback(params);
  });
}

function validateUserForDataReadAPI(params, callback, callbackParam) {
  common.db.collection('members').findOne({'api_key': params.qstring.api_key}, function (err, member) {
    if (!member || err) {
      common.returnMessage(params, 401, 'User does not exist');
      return false;
    }

    if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
      common.returnMessage(params, 401, 'User does not have view right for this application');
      return false;
    }

    common.db.collection('apps').findOne({'_id': common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
      if (!app) {
        common.returnMessage(params, 401, 'App does not exist');
        return false;
      }

      params.app_id = app['_id'];
      params.appTimezone = app['timezone'];
      params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp, params.qstring.tz);

      if (callbackParam) {
        callback(callbackParam, params);
      } else {
        callback(params);
      }
    });
  });
}

function validateUserForMgmtReadAPI(callback, params) {
  common.db.collection('members').findOne({'api_key': params.qstring.api_key}, function (err, member) {
    if (!member || err) {
      common.returnMessage(params, 401, 'User does not exist');
      return false;
    }

    params.member = member;
    callback(params);
  });
}

function getIpAddress(req) {
  var ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;

  /* Since x-forwarded-for: client, proxy1, proxy2, proxy3 */
  return ipAddress.split(',')[0];
}

function findAndRemoveKey(array, value) {
  //console.log('findAndRemoveKey');
  for (var index = 0; index < array.length;) {
    if (array[index].key == value) {
      //Remove from array
      array.splice(index, 1);
      //console.log("remove");
    } else {
      //console.log("no remove");
      index++;
    }
  }
}

function updateOEMTable(callback) {
  common.db.collection('oems').find().toArray(function (err, data) {
    var tmpoemCount = 0;
    var tmpoemMaps = [];
    tmpoemMaps.length = 0;
    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].sr_no.length; j++) {
        oemData = {};
        oemData.deal_no = data[i].deal_no;
        oemData.start = data[i].start;
        oemData.end = data[i].end;
        oemData.sr_no = data[i].sr_no[j];
        tmpoemMaps[tmpoemCount] = oemData;
        tmpoemCount++;
      }
    }
    workerEnv["OEMS"] = JSON.stringify(tmpoemMaps);
    console.log("update oem-length:" + data.length);
    var now = new Date();
    var oems = workerEnv["OEMS"];
    oemMaps.length = 0;
    oemMaps = JSON.parse(oems);
    console.log('update OEM table ==========================' + now + '= length:' + oemMaps.length + '=========================');
    //console.log(oemMaps);
    if (callback) {
      callback();
    }
  });
}

function updateAppsTable(callback) {
  common.db.collection('apps').find().toArray(function (err, data) {
    var tmpappsCount = 0;
    var tmpappsMaps = [];
    tmpappsMaps.length = 0;
    for (var i = 0; i < data.length; i++) {
      appKeyData = {};
      appKeyData.key = data[i].key;
      tmpappsMaps[tmpappsCount] = appKeyData;
      tmpappsCount++;
    }
    workerEnv["APPS"] = JSON.stringify(tmpappsMaps);
    console.log("update appKey-length:" + data.length);
    var now = new Date();
    var apps = workerEnv["APPS"];
    appKeyMaps.length = 0;
    appKeyMaps = JSON.parse(apps);
    console.log('update apps key table ==========================' + now + '= length:' + appKeyMaps.length + '=========================');
    /*
            for (var i = 0; i < workerCount; i++) {
                //workerEnv["workerID"] = i;
                cluster.fork(workerEnv);
            }
    */
    if (callback) {
      callback();
    }
  });
}

function checkKafkaStatus() {
  //console.log("check Kafka Status: "+kafakStatus);
  producer.createTopics(['check'], false, function (err, data) {
    //console.log("createTopic: " + data);
    if (err) {
      kafakStatus++;
      console.log("ERROR: " + err + " " + kafakStatus);
      return;
    }
    producer.send([
      {topic: "check", messages: "1"}
    ], function (err, result) {
      if (err) {
        console.log("ERROR: " + err);
        kafakStatus++;
        return;
      }
      //console.log("result: " + JSON.stringify(result));
      kafakStatus = 0;
    });
  });
  if (kafakStatus >= checkCount) {
    var exec = require('child_process').exec;
    var cmd = 'sudo stop countly-supervisor';
    exec(cmd, function (error, stdout, stderr) {
      // command output is in stdout
      if (error) {
        console.log(error);
      }
    });
  }
}

function funcResetKafkaErrorCount() {
  if (1) {
    if (kafkaErrorCount) {
      console.log("Kafka Exception Send Mail");
      var cmd = 'echo "' + errorContext + '" | mail -s "Kafka Exception Count ' + kafkaErrorCount + ' times" ' + failMailList;
      exec(cmd, function (error, stdout, stderr) {
        if (error)
          console.log("kafka send mail error: " + error);
      });
    }
    kafkaErrorCount = 0;
    errorContext = "";
  } else {
    if (nokafkaErrorCount) {
      console.log("nokafkaErrorCount: " + nokafkaErrorCount);
      console.log("no-Kafka Exception Send Mail");
      var cmd = 'echo "' + nokafkaerrorContext + '" | mail -s "Kafka Exception Count ' + nokafkaErrorCount + ' times" ' + failMailList;
      exec(cmd, function (error, stdout, stderr) {
        if (error)
          console.log("no-kafka send mail error: " + error);
      });
    }
    nokafkaErrorCount = 0;
    nokafkaerrorContext = "";
  }
}

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function updateABTestingRandom() {
  var randomNum = getRandomInt(1, 20);
  console.log("updateABTesting with sleeping random " + randomNum + " time!!!");
  setTimeout(function () {
    updateABTestingTable();
  }, (randomNum * 30000));
}

function updateABTestingTable() {
  if (!enableABTesting) {
    console.log('Disable ABTesting!!');
    return;
  }
  if (isUpdating) {
    console.log('Updating so break');
    return;
  }
  isUpdating = true;
  var totalCount = 0;
  var periods = 0;
  var mysqlClientSync = mysql.createConnectionSync(host, user, password, database);
  var handleCount = mysqlClientSync.querySync(countQuery);
  if (!handleCount) {
    // send mail to admin, can't query mysql
    console.log("[ERROR] " + (new Date()).toString() + " mysql handle can't use!!!");
    var cmd = 'echo "' + errorContext + '" | mail -s "[Countly ABTestTable] update fail!!!!" ' + failMailListAdmin;
    exec(cmd, function (error, stdout, stderr) {
      if (error)
        console.log("updateABTesting Table send mail error: " + error);
    });
    //return;
  }
  var resultCount = handleCount.fetchAllSync();
  totalCount = resultCount[0].total;
  periods = Math.ceil(totalCount / chunkSize);

  bloomConf = JSON.parse(fs.readFileSync('/usr/local/countly/api/bloomfilter.conf', 'utf8'));
  tmpuserCount = 0;
  var tmpFilter = new BloomFilter(bloomConf.elements, bloomConf.hashfunc);
  var start = new Date();
  console.log('Start update ABTesting User Table: %s', start.toString());
  for (var i = 0; i < periods; i++) {
    var offset = i * chunkSize;
    var tmpQuery = chunkQuery + ' OFFSET ' + offset;
    var handleOffset = mysqlClientSync.querySync(tmpQuery);
    var resultOffset = handleOffset.fetchAllSync();
    for (var j = 0; j < resultOffset.length; j++) {
      tmpFilter.add(resultOffset[j].device_id);
      tmpuserCount++;
    }
  }
  console.log('TMP BloomFilter add finished : %d', tmpuserCount);
  GLOBAL.userTableFilter = tmpFilter;
  var end = new Date();
  var diff = end.getTime() - start.getTime();
  console.log('End update ABTesting User Table: %s', end.toString());
  console.log('Update Time: %d', (diff / 1000));
  console.log('update ABTesting table ==========================' + end + '= length:' + tmpuserCount + '=========================');
  isUpdating = false;
  mysqlClientSync.closeSync()
  return;
  /*
      if (isUpdating) {
          console.log('Updating so break');
          return;
      }
      isUpdating = true;
      bloomConf = JSON.parse(fs.readFileSync('/usr/local/countly/api/bloomfilter.conf', 'utf8'));
      tmpuserCount = 0;
      var tmpFilter = new BloomFilter(bloomConf.elements, bloomConf.hashfunc);
      var cassandraClient = new cassandra.Client(cassandraOption);
      var start = new Date();
      console.log('Start update ABTesting User Table: %s', start.toString());
      cassandraClient.eachRow(query, [], { autoPage : true, fetchSize : 20000 },
      function(n, row) {
  //        if (!row.is_for_web_filter) {
          if (row.is_for_web_filter) {
              tmpFilter.add(row.device_id);
              tmpuserCount++;
          }
      },
      function (err, result) {
          if (result) {
              console.log('TMP BloomFilter add finished : %d', tmpuserCount);
              GLOBAL.userTableFilter = tmpFilter;
              var end = new Date();
              var diff = end.getTime() - start.getTime();
              console.log('End update ABTesting User Table: %s', end.toString());
              console.log('Update Time: %d', (diff/1000));
              console.log('update ABTesting table =========================='+end+'= length:'+tmpuserCount+'=========================');
          }
          if (err) {
              console.log('Error : %s', err.toString());
              console.log('updated records : %d', count);
              // send mail
              console.log("Update BloomFilter Error Send Mail");
              var cmd = 'echo "'+err.toString()+'" | mail -s "Update BloomFilter Error" '+failMailList;
              exec(cmd, function(error, stdout, stderr) {
                  if(error)
                      console.log(error);
              });
          }
          cassandraClient.shutdown(function (err,result) {
              console.log('error : '+err);
              console.log('result : '+result);
          });
          isUpdating = false;
          return;
      });
      return;
  */
  /*
      tmpuserCount = 0;
      tmpFilter = new BloomFilter(elements, hashfunc);
      common.db.collection('ABTesting').find({},{batchSize:1000}).each(function(err, data) {
          if (!data) {
              console.log("ABTesting Length: "+tmpuserCount);
              var now = new Date();
              GLOBAL.userTableFilter = tmpFilter;
              console.log('update ABTesting table =========================='+now+'= length:'+tmpuserCount+'=========================');
              return;
          }
          tmpFilter.add(data.user_id);
          tmpuserCount++;
      });
  */
}

function mainfunc() {

  if (cluster.isMaster) {
    var now = new Date();
    console.log('start api ==========================' + now + '==========================');
    //var workerCount = (common.config.api.workers)? common.config.api.workers : os.cpus().length;
    var workerCount = os.cpus().length;

    common.db.collection('oems').find().toArray(function (err, data) {
      for (var i = 0; i < data.length; i++) {
        //var oemdb1 = common.getOEMRawDB(data[i].deal_no);
        //var oemdb2 = common.getOEMDB(data[i].deal_no);
        //console.log(oemdb1.tag);
        //console.log(oemdb2.tag);
        for (var j = 0; j < data[i].sr_no.length; j++) {
          oemData = {};
          oemData.deal_no = data[i].deal_no;
          oemData.start = data[i].start;
          oemData.end = data[i].end;
          oemData.sr_no = data[i].sr_no[j];
          oemMaps[oemCount] = oemData;
          oemCount++;
        }
      }
      workerEnv["OEMS"] = JSON.stringify(oemMaps);
      console.log("oem-length:" + data.length);
      if (!workerCount) {
        //workerCount = (common.config.api.workers)? common.config.api.workers : os.cpus().length;
        workerCount = os.cpus().length;
      }

      for (var i = 0; i < workerCount; i++) {
        cluster.fork(workerEnv);
      }
      /*
              common.db.collection('apps').find().toArray(function(err, data) {
                  for (var i = 0 ; i < data.length ; i ++) {
                      appKeyData = {};
                      appKeyData.key = data[i].key;
                      appKeyMaps[appKeyCount] = appKeyData;
                      appKeyCount++;
                  }
                  workerEnv["APPS"] = JSON.stringify(appKeyMaps);
                  console.log("appKey-length:"+data.length);

              });
      */
      /*
              for (var i = 0; i < workerCount; i++) {
                  //workerEnv["workerID"] = i;
                  cluster.fork(workerEnv);
              }
      */
    });

    cluster.on('exit', function (worker) {
      console.log("cluster refork!!!!!!!!");
      cluster.fork(workerEnv);
    });

    setInterval(function () {
      /** update workerEnv OEM tables data **/
      checkKafkaStatus();
    }, 5000);

    setInterval(function () {
      /** update workerEnv OEM tables data **/
      funcResetKafkaErrorCount();
    }, kafkaCheckTimeout);

  } else {
    var oems = process.env['OEMS'];
    //var apps = process.env['APPS'];
    //workerID = process.env['WorkerID'];
    oemMaps.length = 0;
    oemMaps = JSON.parse(oems);
    appKeyMaps.length = 0;
    //appKeyMaps = JSON.parse(apps);
    updateAppsTable(childFunction);
  }

  function childFunction() {
    console.log("init update oem-length:" + oemMaps.length);
    console.log("init update app-length:" + appKeyMaps.length);
    //console.log(cluster.isMaster);
    //console.log(worker);
    var baseTimeOut = 3600000;
    updateABTestingTable();

    setInterval(function () {
      /** update workerEnv OEM tables data **/
      updateOEMTable(null);
      updateAppsTable(null);
    }, baseTimeOut);

    setInterval(function () {
      /** update workerEnv OEM tables data **/
      funcResetKafkaErrorCount();
    }, kafkaCheckTimeout);
    //console.log(oemMaps);

    http.Server(clientHttp).listen(common.config.api.port, common.config.api.host || '');
  }

  function clientHttp(req, res) {

    var urlParts = url.parse(req.url, true),
      queryString = urlParts.query,
      paths = urlParts.pathname.split("/"),
      apiPath = "",
      params = {
        'qstring': queryString,
        'res': res
      };

    if (queryString.app_id && queryString.app_id.length != 24) {
      console.log('Invalid parameter "app_id"');
      console.log('===========================================================');
      console.log(JSON.stringify(params));
      console.log('===========================================================');
      common.returnMessage(params, 200, 'Success');
      return false;
    }

    if (queryString.user_id && queryString.user_id.length != 24) {
      console.log('Invalid parameter "user_id"');
      console.log('===========================================================');
      console.log(JSON.stringify(params));
      console.log('===========================================================');
      common.returnMessage(params, 200, 'Success');
      return false;
    }

    for (var i = 1; i < paths.length; i++) {
      if (i > 2) {
        break;
      }

      apiPath += "/" + paths[i];
    }

    switch (apiPath) {
      case '/batch': {
        //common.returnMessage(params, 401, 'Run Batch by app key is not support.');
        //return;
        var appkey = queryString.app_key;
        if (!appkey) {
          common.returnMessage(params, 401, 'App does not exist :' + appkey);
          console.log("app does not exist:" + appkey);
          return false;
        }
        common.db.collection('apps').findOne({'key': params.qstring.app_key}, function (err, app) {
          if (err || !app) {
            common.returnMessage(params, 401, 'App does not exist :' + appkey);
            if (err) console.log(err);
            else console.log('app not found');
            return false;
          }
          var appid = app['_id'];
          try {
            process.chdir('/usr/local/countly/api');
            //console.log('New directory: ' + process.cwd());
          } catch (err) {
            console.log('chdir: ' + err);
          }
          var cmd = "node newBatch.js " + appkey + " >> /usr/local/countly/log/" + appkey + "_gen.log 2>&1";
          console.log("cmd:" + cmd);
          common.returnMessage(params, 200, 'Success cmd:' + cmd);
          exec(cmd, function (error, stdout, stderr) {
            //console.log('stdout: ' + stdout);
            //console.log('stderr: ' + stderr);
            if (error) {
              console.log('exec error: ' + error);
            }
            console.log('process finished');
            return true;
          });
          return true;
        });
        //console.log('batch command!');
        break;
      }
      case '/oembatch': {
        //common.returnMessage(params, 401, 'Run Batch by app key is not support.');
        //return;
        var appkey = queryString.app_key;
        if (!appkey) {
          common.returnMessage(params, 401, 'App does not exist :' + appkey);
          console.log("app does not exist:" + appkey);
          return false;
        }
        common.db.collection('apps').findOne({'key': params.qstring.app_key}, function (err, app) {
          if (err || !app) {
            common.returnMessage(params, 401, 'App does not exist :' + appkey);
            if (err) console.log(err);
            else console.log('app not found');
            return false;
          }
          var appid = app['_id'];
          try {
            process.chdir('/usr/local/countly/api');
            //console.log('New directory: ' + process.cwd());
          } catch (err) {
            console.log('chdir: ' + err);
          }
          var cmd = "node newBatchByOEM.js oem " + appkey + " >> /usr/local/countly/log/" + appkey + "_oem.log 2>&1";
          console.log("cmd:" + cmd);
          common.returnMessage(params, 200, 'Success cmd:' + cmd);
          exec(cmd, function (error, stdout, stderr) {
            //console.log('stdout: ' + stdout);
            //console.log('stderr: ' + stderr);
            if (error) {
              console.log('exec error: ' + error);
            }
            console.log('process finished');
            return true;
          });
          return true;
        });
        //console.log('batch command!');
        break;
      }
      case '/i/bulk': {

        var requests = queryString.requests,
          appKey = queryString.app_key;

        if (requests) {
          try {
            requests = JSON.parse(requests);
          } catch (SyntaxError) {
            console.log('Parse bulk JSON failed');
            console.log('source:' + queryString);
          }
        } else {
          //common.returnMessage(params, 400, 'Missing parameter "requests"');
          common.returnMessage(params, 200, 'Success');
          console.log('Send 200 Success');
          return false;
        }

        for (var i = 0; i < requests.length; i++) {

          if (!requests[i].app_key && !appKey) {
            continue;
          }

          var tmpParams = {
            'app_id': '',
            'app_cc': '',
            'ip_address': requests[i].ip_address,
            'country': requests[i].country_code || 'Unknown',
            'city': requests[i].city || 'Unknown',
            'app_key': requests[i].app_key || appKey,
            'device_id': requests[i].device_id,
            'metrics': requests[i].metrics,
            'events': requests[i].events,
            'session_duration': requests[i].session_duration,
            'begin_session': requests[i].begin_session,
            'end_session': requests[i].end_session,
            'timestamp': requests[i].timestamp
          };

          if (!tmpParams.device_id) {
            continue;
          } else {
            tmpParams.app_user_id = common.crypto.createHash('sha1').update(tmpParams.app_key + tmpParams.device_id + "").digest('hex');
          }

          if (tmpParams.metrics) {
            if (tmpParams.metrics["_carrier"]) {
              tmpParams.metrics["_carrier"] = tmpParams.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
              });
            }

            if (tmpParams.metrics["_os"] && tmpParams.metrics["_os_version"]) {
              tmpParams.metrics["_os_version"] = tmpParams.metrics["_os"][0].toLowerCase() + tmpParams.metrics["_os_version"];
            }
          }

          validateAppForWriteAPI(tmpParams);
        }

        common.returnMessage(params, 200, 'Success');
        break;
      }
      case '/i/users': {
        if (params.qstring.args) {
          try {
            params.qstring.args = JSON.parse(params.qstring.args);
          } catch (SyntaxError) {
            console.log('Parse ' + apiPath + ' JSON failed');
            console.log('source:' + params.qstring.args);
          }
        }

        if (!params.qstring.api_key) {
          //common.returnMessage(params, 400, 'Missing parameter "api_key"');
          common.returnMessage(params, 200, 'Success');
          console.log('Send 200 Success');
          return false;
        }

        switch (paths[3]) {
          case 'create':
            validateUserForWriteAPI(countlyApi.mgmt.users.createUser, params);
            break;
          case 'update':
            validateUserForWriteAPI(countlyApi.mgmt.users.updateUser, params);
            break;
          case 'delete':
            validateUserForWriteAPI(countlyApi.mgmt.users.deleteUser, params);
            break;
          default:
            //common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update or /delete');
            common.returnMessage(params, 200, 'Success');
            console.log('Send 200 Success');
            break;
        }

        break;
      }
      case '/i/apps': {
        if (params.qstring.args) {
          try {
            params.qstring.args = JSON.parse(params.qstring.args);
          } catch (SyntaxError) {
            console.log('Parse ' + apiPath + ' JSON failed');
            console.log('sources:' + params.qstring.args);
          }
        }

        if (!params.qstring.api_key) {
          //common.returnMessage(params, 400, 'Missing parameter "api_key"');
          common.returnMessage(params, 200, 'Success');
          console.log('Send 200 Success');
          return false;
        }

        switch (paths[3]) {
          case 'create':
            validateUserForWriteAPI(countlyApi.mgmt.apps.createApp, params);
            break;
          case 'update':
            validateUserForWriteAPI(countlyApi.mgmt.apps.updateApp, params);
            break;
          case 'delete':
            validateUserForWriteAPI(countlyApi.mgmt.apps.deleteApp, params);
            break;
          case 'reset':
            validateUserForWriteAPI(countlyApi.mgmt.apps.resetApp, params);
            break;
          default:
            //common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
            common.returnMessage(params, 200, 'Success');
            console.log('Send 200 Success');
            break;
        }

        break;
      }
      case '/i': {
        params.ip_address = getIpAddress(req);
        var tmp_str = "";
        if (params.qstring) {
          try {
            tmp_str = JSON.parse(JSON.stringify(params.qstring));
          } catch (SyntaxError) {
            var now = new Date();
            console.log('Parse qstring JSON failed' + '==========' + now + '==========');
            console.log('source:' + tmp_str);
            common.returnMessage(params, 400, 'Parse qstring JSON failed');
            console.log('Send 400 Success');
            return false;
          }
        }
        if (params.qstring.app_key == '17a82958af48fdd76801a15991b2cafa1f0bcf92') {
          common.returnMessage(params, 200, 'Success');
          return;
        }
        if (params.qstring.app_key == 'ipsentry') {
          common.returnHtml(params, 200, 'Success');
          return;
        }

        if (!params.qstring.app_key || !params.qstring.device_id) {
          var now = new Date();
          console.log('Missing parameter "app_key" or "device_id"' + '==========' + now + '==========');
          console.log("IP: " + params.ip_address);
          console.log(params.qstring);
          common.returnMessage(params, 200, 'Success');
          console.log("Send 200 Success");
          return false;
        }
        if (params.qstring.app_key.length != 40) {
          console.log("app_key length too long (!=40)");
          console.log(params.ip_address);
          console.log(params.qstring.app_key);
          if (params.qstring.app_key)
            console.log(params.qstring.app_key.length);
          common.returnHtml(params, 200, 'Success');
          return;
        }
        params.qstring.app_key = params.qstring.app_key.replace('"', '');
        params.qstring.app_key = params.qstring.app_key.replace('{', '');
        params.qstring.app_key = params.qstring.app_key.replace(':', '');
        params.qstring.app_key = params.qstring.app_key.replace('}', '');
        // Set app_user_id that is unique for each user of an application.
        params.app_user_id = common.crypto.createHash('sha1').update(params.app_key + params.qstring.device_id + "").digest('hex');

        if (params.qstring.metrics) {
          try {
            params.qstring.metrics = JSON.parse(params.qstring.metrics);

            if (params.qstring.metrics["_carrier"]) {
              params.qstring.metrics["_carrier"] = params.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
              });
            }

            if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
              params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
            }

          } catch (SyntaxError) {
            var now = new Date();
            console.log('Parse metrics JSON failed' + '==========' + now + '==========');
            console.log(JSON.stringify(params.qstring));
            common.returnMessage(params, 200, 'Success');
            console.log('Send 200 Success');
            return false;
          }
        }

        if (params.qstring.vendor_info) {
          try {
            params.qstring.vendor_info = JSON.parse(params.qstring.vendor_info);
          } catch (SyntaxError) {
            var now = new Date();
            console.log('Parse vendor_info JSON failed' + '==========' + now + '==========');
            console.log(JSON.stringify(params.qstring));
            common.returnMessage(params, 200, 'Success');
            console.log('Send 200 Success');
            return false;
          }
        }

        if (params.qstring.events) {
          try {
            var jsonData = JSON.parse(params.qstring.events);
            /*
            if (jsonData) {
                if (jsonData.length == 1 && jsonData[0].key &&
                    jsonData[0].key == '_UMA_ID') {
                    common.returnMessage(params, 200, 'Success');
                    //console.log('Send 200 Success');
                    return true;
                }
                findAndRemoveKey(jsonData, '_UMA_ID');
                if (jsonData.length == 0) {
                    //console.log("be removed, so no events");
                    common.returnMessage(params, 200, 'Success');
                    //console.log('Send 200 Success');
                    return true;
                }
            }
            */
            params.events = jsonData;
            if (params.qstring.app_key == '740f5f030fe2b94eeadef71f77606868fc34a3ff') {
                var hostname = req.headers.referer || req.headers.origin || req.headers['x-real-ip'] || req.headers.host || '';
                console.log("@@@@@ hostname: ", hostname);
                for (var i = 0 ; i < params.events.length ; i ++) {
                    params.events[i].segmentation['hostname'] = hostname;
                }
            }
          } catch (SyntaxError) {
            var now = new Date();
            console.log('Parse events JSON failed' + '==========' + now + '==========');
            console.log('source:' + JSON.stringify(params.qstring));
            common.returnMessage(params, 200, 'Success');
            console.log('Send 200 Success');
            return false;
          }
        }

        params.verifiy = true;
        params.errorHeader = false;
//                if (0) 
        {
          if (req.headers['uma-h']) {
            var verifyStr = req.url.replace(/\/i\?/g, "");
            var sign = req.headers['uma-h'];
            var verifier = crypto.createVerify('sha256');
            verifier.update(verifyStr);
            params.verifiy = verifier.verify(publicKey, sign, 'base64');
            params.qstring.header = sign;
            params.qstring.src = verifyStr;
          } else {
            // do something to check
            // YMK Android and iOS
            //if (params.qstring.app_key == '75edfca17dfbe875e63a66633ed6b00e30adcb92' || params.qstring.app_key == '9219f32e8de29b826faf44eb9b619788e29041bb') {
            if (params.qstring.app_key == 'c277de0546df31757ff26a723907bc150add4254') {
              // app version
              if (0) {
                if (params.qstring.metrics && params.qstring.metrics._app_version) {
                  var versionArray = params.qstring.metrics._app_version.split(".");
                  try {
                    if (versionArray.length >= 2 && parseInt(versionArray[0]) >= 5 && parseInt(versionArray[1]) >= 11) {
                      params.topicName = '_UMAH_YCP_iOS';
                      params.errorHeader = true;
                    }
                  } catch (err) {
                    console.log("parseInt Exception!!!");
                  }
                }
              }
            }
            else if (params.qstring.app_key == 'e315c111663af26a53e5fe4c82cc1baeecf50599') {
              // app version
              if (params.qstring.metrics && params.qstring.metrics._app_version) {
                var versionArray = params.qstring.metrics._app_version.split(".");
                try {
                  if (versionArray.length >= 2 && parseInt(versionArray[0]) >= 5 && parseInt(versionArray[1]) >= 11) {
                    params.topicName = '_UMAH_YCP_And';
                    params.errorHeader = true;
                    params.verifiy = false;
                  }
                } catch (err) {
                  console.log("parseInt Exception!!!");
                }
              }
            }
            else if (params.qstring.app_key == '9219f32e8de29b826faf44eb9b619788e29041bb') {
              // app version
              if (0) {
                if (params.qstring.metrics && params.qstring.metrics._app_version) {
                  var versionArray = params.qstring.metrics._app_version.split(".");
                  try {
                    if (versionArray.length >= 2 && parseInt(versionArray[0]) >= 5 && parseInt(versionArray[1]) >= 12) {
                      params.topicName = '_UMAH_YMK_iOS';
                      params.errorHeader = true;
                    }
                  } catch (err) {
                    console.log("parseInt Exception!!!");
                  }
                }
              }
            }
            else if (params.qstring.app_key == '75edfca17dfbe875e63a66633ed6b00e30adcb92') {
              // app version
              if (params.qstring.metrics && params.qstring.metrics._app_version) {
                var versionArray = params.qstring.metrics._app_version.split(".");
                try {
                  if (versionArray.length >= 2 && parseInt(versionArray[0]) >= 5 && parseInt(versionArray[1]) >= 12) {
                    params.topicName = '_UMAH_YMK_And';
                    params.errorHeader = true;
                    params.verifiy = false;
                  }
                } catch (err) {
                  console.log("parseInt Exception!!!");
                }
              }
            }
          }
        }

        validateAppForWriteAPI(params);
        break;
      }
      case '/o/users': {
        if (!params.qstring.api_key) {
          common.returnMessage(params, 400, 'Missing parameter "api_key"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        switch (paths[3]) {
          case 'all':
            validateUserForMgmtReadAPI(countlyApi.mgmt.users.getAllUsers, params);
            break;
          case 'me':
            validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
            break;
          default:
            common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
            //common.returnMessage(params, 200, 'Success');
            console.log('Send 400');
            break;
        }

        break;
      }
      case '/o/apps': {
        if (!params.qstring.api_key) {
          common.returnMessage(params, 400, 'Missing parameter "api_key"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        switch (paths[3]) {
          case 'all':
            validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getAllApps, params);
            break;
          case 'mine':
            validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getCurrentUserApps, params);
            break;
          default:
            common.returnMessage(params, 400, 'Invalid path, must be one of /all or /mine');
            //common.returnMessage(params, 200, 'Success');
            console.log('Send 400');
            break;
        }

        break;
      }
      case '/o': {
        if (!params.qstring.api_key) {
          common.returnMessage(params, 400, 'Missing parameter "api_key"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        if (!params.qstring.app_id) {
          common.returnMessage(params, 400, 'Missing parameter "app_id"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        switch (params.qstring.method) {
          case 'locations':
          case 'sessions':
          case 'users':
          case 'devices':
          case 'device_details':
          case 'carriers':
          case 'app_versions':
            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
            break;
          case 'cities':
            if (common.config.api.city_data !== false) {
              validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
            } else {
              common.returnOutput(params, {});
            }
            break;
          case 'events':
            if (params.qstring.events) {
              try {
                params.qstring.events = JSON.parse(params.qstring.events);
              } catch (SyntaxError) {
                console.log('Parse events array failed');
                console.log('source:' + params.qstring.events);
                common.returnMessage(params, 400, 'events JSON is not properly formed');
                console.log('Send 400 Failed');
                break;
              }

              validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
            } else {
              validateUserForDataReadAPI(params, countlyApi.data.fetch.prefetchEventData, params.qstring.method);
            }
            break;
          case 'get_events':
            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCollection, 'events');
            break;
          default:
            common.returnMessage(params, 400, 'Invalid method');
            //common.returnMessage(params, 200, 'Success');
            console.log('Send 400');
            break;
        }

        break;
      }
      case '/o/analytics': {
        if (!params.qstring.api_key) {
          common.returnMessage(params, 400, 'Missing parameter "api_key"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        if (!params.qstring.app_id) {
          common.returnMessage(params, 400, 'Missing parameter "app_id"');
          //common.returnMessage(params, 200, 'Success');
          console.log('Send 400');
          return false;
        }

        switch (paths[3]) {
          case 'dashboard':
            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDashboard);
            break;
          case 'countries':
            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCountries);
            break;
          default:
            common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
            //common.returnMessage(params, 200, 'Success');
            console.log('Send 400');
            break;
        }

        break;
      }
    }

  }
}

