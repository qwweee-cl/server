var countlyConfig = {
    mongodb: {
        host: "localhost", // dashboard db host
        //hostbatch: "54.64.188.23", // localhost(mongodb) setting batch host
        //hostbatch: "54.65.51.11", // localhost(mongodb) setting batch host
        hostbatch: "localhost", // localhost(mongodb) setting batch host
        hostbatch1: "localhost", // YCP raw data db host
        hostbatch2: "localhost", // YMK + Others raw data db host
        oemhost: "localhost", // Only OEM raw data host
        db: "countly",
        db_raw: "countly_raw0",
        db_batch: "countly_raw1",
        db_ibb: "countly_snow_ibb",
        db_maintain: "maintain_list",
        port: 27017,
        max_batch_pool_size: 1000,
        max_db_pool_size: 1000,
        max_raw_pool_size: 10000
    },
    /*  or for a replica set
    mongodb: {
        replSetServers : [
            '192.168.3.1:27017/?auto_reconnect=true',
            '192.168.3.2:27017/?auto_reconnect=true'
        ],
        db: "countly",
        max_pool_size: 1000
    },
    */
    /*  or define as a url
    mongodb: "localhost:27017/countly?auto_reconnect=true",
    */
    api: {
        workers: 0,
        port: 3001,
        host: "localhost",
        safe: false,
        session_duration_limit: 3601,
        max_sockets: 10240,
        cl_endsession_ongoing_timeout: 10,
        cl_wait_time: 60,
        data_drop_duration_time: 3,
        cl_is_debug: false,
        /*
            If the last end_session is received less than 1 seconds ago we will ignore
            current begin_session request and mark this user as having an ongoing session
        */
        city_data: true
    },
    apps: {
        country: "TR",
        timezone: "Europe/Istanbul",
        category: "6"
    }
};

// Set your host IP or domain to be used in the emails sent
// countlyConfig.host = "YOUR_IP_OR_DOMAIN";

module.exports = countlyConfig;
