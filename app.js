'use strict';

const   config      = require('config'),
        bunyan      = require('bunyan'),
        log         = bunyan.createLogger({name: 'app'}),
        _           = require('underscore'),
        pop3        = require('./ext-lib/pop3'),
        dapnet      = require('./ext-lib/dapnet-call'),
        mailparser  = require('mailparser').simpleParser,
        SMTPServer  = require('smtp-server').SMTPServer;

log.level(config.get('general.logLevel'));

let smtpOptions = {
    secure: false,
    name: 'dapnet gateway',
    authMethods: ['PLAIN'],
    authOptional: true,
    allowInsecureAuth: true,
    onAuth(auth,session,cb) {
        session.key = auth.password;
        return cb(null, {user: auth.username});
    },
    onConnect(session,cb) {
        if (!config.get('email.enable_internet')) {
            if (!session.remoteAddress.startsWith('44.'))
                return cb(new Error("Only HAMNET (44/8) connects allowed."));
        }
        return cb();
    },
    onMailFrom(address,session,cb) {
        if (_.contains(config.get('email.blacklist'), address.address))
            return cb(new Error("Sender forbidden."));
        else
            return cb();
    },
    onRcptTo(address,session,cb) {
        if (_.contains(config.get('dapnet.blacklist'), address.address))
            return cb(new Error("Recipient forbidden."));
        else
            return cb();
    },
    onData(stream,session,cb) {
        let msg = [];
        console.log(JSON.stringify(session));
        stream.on('data', chunk => {
            msg.push(chunk);
        });
        stream.on('end', () => {
            mailparser(Buffer.concat(msg).toString())
            .then(m => {
                log.debug("using message", m);
                let to = m.headers.get('to').value[0].address.split('@');
                if (!to[0])
                    cb(new Error("Sending address invalid."));
                if (!to[1])
                    to[1] = config.get('dapnet.default_tx');
                dapnet.send([to[0]], session.user, m.subject?m.subject:"" + " " + m.text?m.text:"", [to[1]], session.user, session.key)
                .then(() => {
                    cb();
                })
                .catch((err) => {
                    log.error(err);
                    cb(new Error(JSON.stringify(err)));
                });
            })
            .catch(err => {
                log.error(err);
                cb(new Error(JSON.stringify(err)));
            });
        });
    },
    onClose(session) {
        console.log("sessionclosed",session);
    }
};

const smtpServer = new SMTPServer(smtpOptions);
smtpServer.on('error', error => {
    log.error(err);
});

smtpServer.listen(config.get('email.listen_port'), () => {
    log.info("Server up and listening");
});

// All this is completly fake for now, just for clients like
// thunderbird to complete account setup.
// Maybe later we'll add content?
const pop3Server = pop3.create_server((connection) => {
    connection.on('authentication', function(user, pass, success){
        return success(true);
    });

    connection.on('stat', function(callback){
        return callback(0, 0);
    });

    connection.on('list', function(callback){
        return callback({});
    });

    connection.on('uidl', function(index, callback){
        callback({});
    });

    connection.on('retr', function(mail_index, callback){
        callback({});
    });
});
pop3Server.listen(config.get('email.pop3_listen_port'));