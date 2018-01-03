#!/usr/bin/env node

// Asynchronously submits install information to Realm.
//
// Why are we doing this? In short, because it helps us build a better product
// for you. None of the data personally identifies you, your employer or your
// app, but it *will* help us understand what language you use, what Node.js
// versions you target, etc. Having this info will help prioritizing our time,
// adding new features and deprecating old features. Collecting an anonymized
// application path & anonymized machine identifier is the only way for us to
// count actual usage of the other metrics accurately. If we don’t have a way to
// deduplicate the info reported, it will be useless, as a single developer
// `npm install`-ing the same app 10 times would report 10 times more than another 
// developer that only installs once, making the data all but useless.
// No one likes sharing data unless it’s necessary, we get it, and we’ve
// debated adding this for a long long time. If you truly, absolutely
// feel compelled to not send this data back to Realm, then you can set an env
// variable named REALM_DISABLE_ANALYTICS.
//
// Currently the following information is reported:
// - What version of Realm is being installed.
// - The OS platform and version which is being used.
// - Node.js, v8, libuv, OpenSSL version numbers. 
// - An anonymous machine identifier and hashed application path to aggregate the other information on.

'use strict';

const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const request = require('request');

function sha256(data) {
    let hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

function getDarwinIdentifier() {
    const interfaces = os.networkInterfaces();
    const iface = interfaces["en0"] || interfaces["en1"];
    if (!iface) {
        return Buffer.from('unknown', 'utf8');
    }

    const mac = iface[0].mac.replace(/:/g, '');
    return new Buffer(mac, 'hex');
}

function getLinuxIdentifier() {
    if (fs.existsSync('/var/lib/dbus/machine-id')) {
        return fs.readFileSync('/var/lib/dbus/machine-id');
    } else if (fs.existsSync('/etc/machine-id')) {
        return fs.readFileSync('/etc/machine-id');
    } else {
        return Buffer.from('unknown', 'utf8');
    }
}

function getAnonymizedMachineIdentifier() {
    switch (os.platform()) {
        case 'darwin':
            return sha256(getDarwinIdentifier());
        case 'linux':
            return sha256(getLinuxIdentifier());
        default:
            return null;
    }
}

module.exports = function(eventName) {
    if ('REALM_DISABLE_ANALYTICS' in process.env)
        return;

    const identifier = getAnonymizedMachineIdentifier();
    const payload = {
        'event': eventName,
        'properties': {
            'token': 'aab85907a13e1ff44a95be539d9942a9',
            'distinct_id': identifier,
            'Anonymized Machine Identifier': identifier,
            'Anonymized Application ID': sha256(__dirname),
            'Binding': 'node.js',
            'Version': require('../package.json').version,
            'Language': 'javascript',
            'OS Type': os.platform(),
            'OS Version': os.release(),
            'Node.js versions': process.versions
        }
    };

    request(`https://api.mixpanel.com/track/?data=${new Buffer(JSON.stringify(payload), 'utf8').toString('base64')}&ip=1`, 
        () => { /* Analytics failed. Do nothing. */ });
}

if (require.main === module) {
    module.exports('Install');
}
