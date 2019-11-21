import _forEach from 'lodash/forEach';
import path from "path";
import fs from "fs";

const appMap = {
//                      "Perfect_And"       : "0368eb926b115ecaf41eff9a0536a332ef191417" : {appName: "PF", appOS: "And"}, // Perfect_And
//                      "Perfect_iOS"       : "02ce3171f470b3d638feeaec0b3f06bd27f86a26" : {appName: "PF", appOS: "iOS"}, // Perfect_iOS
  "d10ca4b26d3022735f3c403fd3c91271eb3054b0" : {appName: "Test", appOS: "And"}, // Test
  "9219f32e8de29b826faf44eb9b619788e29041bb" : {appName: "YMK", appOS: "iOS"}, // YouCam_MakeUp_iOS
  "75edfca17dfbe875e63a66633ed6b00e30adcb92" : {appName: "YMK", appOS: "And"}, // YouCam_MakeUp_And
  "c277de0546df31757ff26a723907bc150add4254" : {appName: "YCP", appOS: "iOS"}, // YouCam_Perfect_iOS
  "e315c111663af26a53e5fe4c82cc1baeecf50599" : {appName: "YCP", appOS: "And"}, // YouCam_Perfect_And
  "895ef49612e79d93c462c6d34abd8949b4c849af" : {appName: "YCN", appOS: "And"}, // YouCam_Nail_And
  "ecc26ef108c821f3aadc5e283c512ee68be7d43e" : {appName: "YCN", appOS: "iOS"}, // YouCam_Nail_iOS
  "488fea5101de4a8226718db0611c2ff2daeca06a" : {appName: "BCS", appOS: "And"}, // BeautyCircle_And
  "7cd568771523a0621abff9ae3f95daf3a8694392" : {appName: "BCS", appOS: "iOS"}, // BeautyCircle_iOS
  "0a9928b86e75195094cac739c1f0dbd6d5660ad6" : {appName: "YCL", appOS: "And"}, // YouCam_Live_And
  "32201f63d36dcf07963ed97727a3dc3019e0e458" : {appName: "YCL", appOS: "iOS"}, // YouCam_Live_iOS
  "58624be20f93c99117c83fc4efb13e3db2b54c17" : {appName: "YMC", appOS: "And"}, // YouCam_Makeup_China_And
  "d2892f0d5485a7a5818b267d369b674669d1b415" : {appName: "YMC", appOS: "iOS"}, // YouCam_Makeup_China_iOS
  "093ceb063bc69ffe79af7852a715f95fd91547f2" : {appName: "YCF", appOS: "And"}, // YouCam_Fun_And
  "9d23f2108e703661545fe60336ab5e4ef120b189" : {appName: "YCF", appOS: "iOS"}, // YouCam_Fun_iOS
  "82694c09eb10f576b12645cad667dc2c740db1a0" : {appName: "YCC", appOS: "And"}, // YouCam_Collage_And
  "3aa2b6516f3d9ea559561a8c3bca1fe0b8a96371" : {appName: "YCC", appOS: "iOS"}, // YouCam_Collage_iOS
  "582c471bbd055a81b554c7d74658f1ad017e8c2b" : {appName: "YMKL", appOS: "iOS"}, // YouCam_Collage_iOS
  "fa9cbde99587e00afcbd7a9c834e78b5185b8065" : {appName: "YCS", appOS: "And"}, // YouCam_Store_Android
  "9357f63f387a02872cae14f8539b37cc37404727" : {appName: "YCS", appOS: "iOS"}, // YouCam_Store_iOS
  "9f093278d98ad4159a6df2f29d021e6e34649747" : {appName: "Amway", appOS: "And"}, // Amway_Android
  "1a89a46c0465a15ce57f3709ca01c2c9fb36feb4" : {appName: "Amway", appOS: "iOS"}, // Amway_iOS
  "ab8ada3e1f156663453cee32debe3292fba834ae" : {appName: "Belcorp_Skincare", appOS: "And"}, // Belcorp_Skinkcare_Android
  "b9bf6664c33ca7d55ba347f652abe1bc9ef39378" : {appName: "BrandMode", appOS: "And"}, // BrandMode_Android
  "12c6646571c9cf9f7ecb00b4af3ca3ecc49635eb" : {appName: "BrandMode", appOS: "iOS"}, // BrandMode_iOS
  "fb0af88d7f5fb1e26e9da63c4339fe94a097eab1" : {appName: "YMK4B", appOS: "And"}, // YMK4B_Android
  "461299f3d378fc762c56d003e98ae5f02fd52d60" : {appName: "YMK4B", appOS: "iOS"}, // YMK4B_iOS
  "93f0d4501694758e34a9fbf9f97e17d0a999ab8a" : {appName: "YMK4BTrial", appOS: "And"}, // YMK4BTrial_Android
  "d0713956948af94d4c53e348c2cb6d816a3c2925" : {appName: "YMK4BTrial", appOS: "iOS"}, // YMK4BTrial_iOS
  "43259ebca3c2c882f2ee9e39a679b6e6fd00f552" : {appName: "YMK4BBrand", appOS: "And"}, // YMK4BBrand_Android
  "bf6bad03e0833e6e432a74136a01809bb3b980d4" : {appName: "YMK4BBrand", appOS: "iOS"}, // YMK4BBrand_iOS
  "fd129a84a9ae650fb18837e6cba7b69c6ec358da" : {appName: "AmwayCN_AEC", appOS: "iOS"}, // AmwayCN_AEC_iOS
  "6993b74968d8ecdaa3b3c633beca800de732381a" : {appName: "YCV", appOS: "And"}, // YouCamVideo_Android
  "251ff0b79d64016f72896891275fed15caa231f8" : {appName: "Aphrodite", appOS: "And", sdk: true}, // Aphrodite_Android
  "c210e235a2dd64d7625b793443de2d7ab2424ae3" : {appName: "Aphrodite", appOS: "iOS", sdk: true}, // Aphrodite_iOS
  "3c8be6a417c8e010ca308f1764bcb1542ce737b2" : {appName: "MaryKay_China", appOS: "And", sdk: true}, // MaryKay_China_Android
  "b3f2a6b45d6e85c800fc1fdd0bc1661e078abc7d" : {appName: "MaryKay_China", appOS: "iOS", sdk: true}, // MaryKay_China_iOS
  "c663695f82953a2cf08a62708abee819017547ad" : {appName: "Macy", appOS: "And", sdk: true}, // Macy_Android
  "1a5148404c93125d08471786048b963753bec867" : {appName: "Macy", appOS: "iOS", sdk: true}, // Macy_iOS
  "84493bce19fc2f47ea01f137c039aee409307ef6" : {appName: "Chanelvmulips", appOS: "And", sdk: true}, // Chanelvmulips_Android
  "91100044a443e63ef1dc5e445bbdcf6780540be9" : {appName: "Chanelvmulips", appOS: "iOS", sdk: true}, // Chanelvmulips_iOS
  "e77207f42d0ad8aa92dee64a95aa55e3168f3b87" : {appName: "Belcorp", appOS: "And", sdk: true}, // Belcorp_Android
  "7f23cfce180b8cd241bfddf4a82e71e336b14202" : {appName: "Ulta_APP", appOS: "And", sdk: true}, // Ulta_APP_Android
  "6be0c77c08be6f58e2a7cee41f6c733bd82fe7c3" : {appName: "Ulta_APP", appOS: "iOS", sdk: true}, // Ulta_APP_iOS
  "10a2326746ab6fc6c8ddbfd9d8315e816e9e7d69" : {appName: "Samsung_APP", appOS: "And", sdk: true}, // Samsung_APP_Android
  "caf0ed4568d6dcadfc5273f2c5aa2946f86b67aa" : {appName: "Samsung_APP", appOS: "iOS", sdk: true}, // Samsung_APP_iOS
  "b98f3c641eb239348cb5662eb02d933e825a4cb2" : {appName: "Shopee_APP", appOS: "And", sdk: true}, // Sopee_APP_Android
  "e3889727fadd953c085920b85086d09b402822d4" : {appName: "Shopee_APP", appOS: "iOS", sdk: true}, // Sopee_APP_iOS
  "e2cc30cc2c6dda6ab8b86c32cce36b0edc44a0ac" : {appName: "Sephora_APP", appOS: "And", sdk: true}, // Sephora_APP_Android
  "69ac8776819cd12613987fccaeb71cf751fd15dd" : {appName: "Sephora_APP", appOS: "iOS", sdk: true}, // Sephora_APP_iOS
  "a041f6e19d9f9716ac1cf3d2ac87e17db243b8b0" : {appName: "NuSkin_APP", appOS: "iOS", sdk: true}, // NuSkin_APP_iOS
  "e59b623a8e311c7a35ea144053d2c476c57a3806" : {appName: "Baidu_SDK", appOS: "And", sdk: true}, // Baidu_SDK_Android
  "8dab8b556e5efc5d712cc91435dd74e9da595f63" : {appName: "Baidu_SDK", appOS: "iOS", sdk: true}, // Baidu_SDK_iOS
  "3ef5d0a9840e2c33208b893dac3d708471e28fe7" : {appName: "Henkel_APP", appOS: "iOS", sdk: true}, // Henkel_APP_iOS
  "2e33f3e5161308a187044506104933fbbf516df7" : {appName: "Nordstrom_APP", appOS: "And", sdk: true}, // Nordstrom_APP_Android
  "e53d5025b76090841518eedeffcb313e797daf85" : {appName: "Nordstrom_APP", appOS: "iOS", sdk: true}, // Nordstrom_APP_iOS
  "c2bb6f4c426fb1407aa346728db51946f1be40cf" : {appName: "Coty_APP", appOS: "And", sdk: true}, // Coty_APP_Android
  "c193e49bf09900c6c46cdd85ad05737177941a3f" : {appName: "LG_Mobile_APP", appOS: "And", sdk: true}, // LG_Mobile_APP_Android
  "6c086f89df896b5286817e871783f803ffc51eae" : {appName: "Amway_CN_makeup_APP", appOS: "And", sdk: true}, // Amway_CN_makeup_APP_Android
  "e8c4410fdfa48614b5f625ed70814d9720388aa3" : {appName: "Amway_CN_skincare_APP", appOS: "And", sdk: true}, // Amway_CN_skincare_APP_Android
  "f0ed22c36da25717000a38ea568c0da640dbc887" : {appName: "Amway_CN_makeup_SDK", appOS: "iOS", sdk: true}, // Amway_CN_makeup_SDK_iOS
  "5e954ee93b5c921638fda22870942115b06a9b7f" : {appName: "Target_APP", appOS: "And", sdk: true}, // Target_APP_Android
  "02c5193b372dfab39153d908643ab193fec45671" : {appName: "Target_APP", appOS: "iOS", sdk: true}, // Target_APP_iOS
  "1af5ddb03103baed28f5493e2da04cada6de295d" : {appName: "Alibaba_APP", appOS: "And", sdk: true}, // Alibaba_APP_Android
  "092e4252ae62b245c789721a0d4e8c170645d824" : {appName: "Alibaba_APP", appOS: "iOS", sdk: true}, // Alibaba_APP_iOS
  "bbfc85c7f10800792d984d5250b2066dcd24a016" : {appName: "Golden_Scent_makeup_APP", appOS: "And", sdk: true}, // Golden_Scent_makeup_APP_Android
  "86c5197458e4afeec7542bccc3cec3c5652ecea7" : {appName: "Golden_Scent_makeup_APP", appOS: "iOS", sdk: true}, // Golden_Scent_makeup_APP_iOS
  "b880f78e2183cab2344f19e6d6f1317592fcfdf2" : {appName: "Golden_Scent_skincare_APP", appOS: "And", sdk: true}, // Golden_Scent_skincare_APP_Android
  "d841ec9fc04673a3940894ff5fb1e7d95b172df2" : {appName: "Golden_Scent_skincare_APP", appOS: "iOS", sdk: true}, // Golden_Scent_skincare_APP_iOS
  "b6d12a2f9483efeaa4880c92949474be61cd109a" : {appName: "SeneGence_SDK", appOS: "And", sdk: true}, // SeneGence_SDK_Android
  "89347fa159e30a29b54809f6c464b7509d2caa5c" : {appName: "SeneGence_SDK", appOS: "iOS", sdk: true}, // SeneGence_SDK_iOS
  "f1241c08fb759b14405ddf6b8a63dc9083e4b10c" : {appName: "TomFord_SDK", appOS: "iOS", sdk: true}, // TomFord_SDK_iOS
  "239070f48984a19e8abde56d31016bfc5e9fd96d" : {appName: "Sephora_CN_SDK", appOS: "And", sdk: true}, // Sephora_CN_SDK_Android
  "d2ad67eacfecc86925686137f0ad4ae3e5a70a02" : {appName: "Sephora_CN_SDK", appOS: "iOS", sdk: true}, // Sephora_CN_SDK_iOS
  "33e7733dbb3bf2e24e29c4bd0f1f740feafb5f52" : {appName: "MAC_CN_SDK", appOS: "iOS", sdk: true}, // MAC_CN_SDK_iOS
  "eaa598f317b5c720e89710804ee34fb106d31d03" : {appName: "Huawei_Makeup_SDK", appOS: "And", sdk: true}, // Huawei_Makeup_SDK_Android
  "e430b40c28cdbe74f7bc7f59c3726c99a086d814" : {appName: "Estee_Lauder_global_SDK", appOS: "iOS", sdk: true}, // Estee_Lauder_global_SDK_iOS
  "13383acd7323d028f28be6bd682dd8f4c8e5996d" : {appName: "Flipkart_India_SDK", appOS: "And", sdk: true}, // Flipkart_India_SDK_Android
  "a6cd88e0cc40c31632f41571ee3bf7f4234405cc" : {appName: "Chanel_Eyewear_SDK", appOS: "iOS", sdk: true}, // Chanel_Eyewear_SDK_iOS
  "db1fe5367ff4421d5e65aa0bb52c6a341a7126e8" : {appName: "D_And_G_SDK", appOS: "iOS", sdk: true}, // D&G_SDK_iOS
  "2b1e7099d6dfff7938348c41cb8d1704e3a677cd" : {appName: "Showroom_SDK", appOS: "iOS", sdk: true}, // Showroom_SDK_iOS
  "37aab770e0c93593fd06c6bfcf65a6545a022836" : {appName: "China_Mobile_SDK", appOS: "And", sdk: true}, // China_Mobile_SDK_And
  "52e6f4ca531d973114364772666bdafa3aa5204a" : {appName: "MAC_SDK", appOS: "iOS", sdk: true}, // MAC_SDK_iOS
  "9e2fc2f29d7ebc17b0be8be21b861c6b267a862a" : {appName: "Sally_Beauty_SDK", appOS: "And", sdk: true}, // Sally_Beauty_SDK_And
  "965acda917a2d8b780bca163163458186de0c258" : {appName: "Sally_Beauty_SDK", appOS: "iOS", sdk: true}, // Sally_Beauty_SDK_iOS
  "c92608f1d6fe19cdb99545af6ad4051c271655ac" : {appName: "Tapcart_SDK", appOS: "iOS", sdk: true}, // Tapcart_SDK_iOS
  "2cfdbb56a214a13014a0b08423c8f39e66d258c0" : {appName: "Neutrogena_SDK", appOS: "And", sdk: true}, // Neutrogena_SDK_And
  "944a6288ab6405bdef01d4c4d49d619403b23cab" : {appName: "Neutrogena_SDK", appOS: "iOS", sdk: true}, // Neutrogena_SDK_iOS
  "c247f4b1892676a2d90b5b96be20e924832bcaad" : {appName: "Pinterest_SDK", appOS: "And", sdk: true}, // Pinterest_SDK_And
  "40ada45b2e57a93eb7dab340352514fbd76a3680" : {appName: "Pinterest_SDK", appOS: "iOS", sdk: true}, // Pinterest_SDK_iOS
  "3b1b6f2de82a7e0cf77fdf642aece5a151303dbb" : {appName: "Jiali_CN_SDK", appOS: "And", sdk: true}, // Jiali_CN_SDK_And
  "52e8e886796e2fd79ad62f5a5512ad471e594c83" : {appName: "Jiali_CN_SDK", appOS: "iOS", sdk: true}, // Jiali_CN_SDK_iOS
  "99a584e7d0ce0fa9277e614d61c8b814a2d6d909" : {appName: "NordStom_VV_SDK", appOS: "And", sdk: true}, // NordStrom_VV_SDK_And
  "95b264464cd21e7f084dc169a624114f61681473" : {appName: "FiNC_SDK", appOS: "And", sdk: true}, // FiNC_SDK_And
  "d6b321e4afb2bdec35c1cb6c4b779d7e52a9b770" : {appName: "FiNC_SDK", appOS: "iOS", sdk: true}, // FiNC_SDK_iOS
  "020813e047513d2137ad9727d593712b0f68c3a0" : {appName: "TomFord_CN_SDK", appOS: "iOS", sdk: true}, // TomFord_CN_SDK_iOS
  "aee89108117e13131dd856559ed20f52d8710590" : {appName: "AmazingLashStudio_SDK", appOS: "And", sdk: true}, // AmazingLashStudio_SDK_And
  "b6799324da67a2727cc7ceffa3acf4822a091d2f" : {appName: "AmazingLashStudio_SDK", appOS: "iOS", sdk: true}, // AmazingLashStudio_SDK_iOS
  "8466d287b0afdfe80df10a0ccfd55efb4b8644f9" : {appName: "NTT_JP_SDK", appOS: "And", sdk: true}, // NTT_JP_SDK_And
  "7f2e1083f7f5f7c686679e4a522d6b4f7ebac34f" : {appName: "NTT_JP_SDK", appOS: "iOS", sdk: true}, // NTT_JP_SDK_iOS
  "32e2d24bd53c37f91ce5d33f6a6b40a6320c37f6" : {appName: "Chanel_Eyewear_SDK", appOS: "And", sdk: true}, // Chanel_Eyewear_SDK_And
  "b0a8189bdb410616b855a15e5b7a80975da92a96" : {appName: "LG_Electronics_SDK", appOS: "And", sdk: true}, // LG_Electronics_SDK_And
  "87d479c76d9a6f75db9a9a07a20c5a6f649db4e1" : {appName: "LG_Electronics_SDK", appOS: "iOS", sdk: true}, // LG_Electronics_SDK_iOS
  "488dbc1e7acdf4dd4db283161d9b341c5d4f8ed4" : {appName: "MAC_RED_SDK", appOS: "And", sdk: true}, // MAC_RED_SDK_And
  "f8b4be54ee38cc8ccc39b77ee1065c9d29da8b26" : {appName: "Icon_Skincare_SDK", appOS: "And", sdk: true}, // Icon_Skincare_SDK_And
  "767d5ea611ac01b38f87b87e3a59e0473cd2a019" : {appName: "Icon_Hair_color_SDK", appOS: "And", sdk: true}, // Icon_Hair_color_SDK_And
  "5554ac343cc1b0f9b48ea881553126cd8320a6de" : {appName: "EL_CareOS_SDK", appOS: "And", sdk: true}, // EL_CareOS_SDK_And
};
const data = [];
_forEach(appMap, (v, k) => {
  if (v.sdk) {
    const newData = {appName: (v.appName + "_" + (v.appOS === "And" ? 'Android' : "iOS")), appOS: (v.appOS === "And" ? 'Android' : "iOS"), appKey: k};
    data.push(newData);
  }
});

const dataFile1 = path.join('./', 'countly_exist_sdk_appkey.json');
console.log(dataFile1);
const fd1 = fs.openSync(dataFile1, 'w');
try {
  fs.writeSync(fd1, JSON.stringify(data));
  fs.closeSync(fd1);
} catch (e) {
  fs.closeSync(fd1);
}