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

function isAnalyticsDisabled() {
    return 'REALM_DISABLE_ANALYTICS' in process.env;
}

function sha256(data) {
    let hash = require('crypto').createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

if (isAnalyticsDisabled()) {
    module.exports = function(){};
} else {
    const os = require('os');
    const request = require('request');
    const { machineId } = require("node-machine-id");

    module.exports = function(eventName, context) {
        // Submit analytics after some time - we do this to give the application a chance to disable analytics.
        setTimeout(() => {
            if (isAnalyticsDisabled()) {
                return;
            }

            machineId()
                .catch() // Ignore errors
                .then((identifier) => {
                    if (!identifier) {
                        identifier = sha256('unknown');
                    }

                    const payload = {
                        'event': eventName,
                        'properties': {
                            'token': 'aab85907a13e1ff44a95be539d9942a9',
                            'distinct_id': identifier,
                            'Anonymized Machine Identifier': identifier,
                            'Anonymized Application ID': sha256(__dirname),
                            'Binding': context || 'node.js',
                            'Version': require('../package.json').version,
                            'Language': 'javascript',
                            'OS Type': os.platform(),
                            'OS Version': os.release(),
                            'Node.js versions': process.versions
                        }
                    };

                    request(`https://api.mixpanel.com/track/?data=${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}&ip=1`,
                    () => { /* Analytics failed. Do nothing. */ });
                });
        }, 100);
    }

    if (require.main === module) {
        module.exports('Install');
    }
}
