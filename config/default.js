module.exports = {
    general: {
        logLevel: "debug",

    },
    dapnet: {
        shorten_messages: true,
        max_message_size: 80,
        default_tx: 'dl-all',
        blacklist: [
            'retired_dapnet_call',
            'la1lala'
        ],
        hampager_api: 'http://www.hampager.de:8080/calls',
    },
    email: {
        enable_hamnet: true,
        enable_internet: true,
        enable_internet_crypt: false,
        blacklist: [
            'fool@invalid',
            'abuse@invalid'
        ],
        listen_port: 25,
        pop3_listen_port: 110
    }
};