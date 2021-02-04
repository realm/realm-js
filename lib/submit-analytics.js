////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////


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

let utils = require('./utils');


class WebhookProdDetails {
    /**
     * Path and credentials required to submit analytics through the webhook (production mode).
     */
    constructor() {
        this.urlPrefix =
                "https://webhooks.mongodb-realm.com/api/client/v2.0/app/realmsdkmetrics-zmhtm/service/metric_webhook/incoming_webhook/metric?ip=1&data=";
    }

    /**
     * Constructs the full URL that will submit analytics to the webhook.
     * @param  {Object} payload Information that will be submitted through the webhook.
     * @returns {string} Complete analytics submission URL
     */
    buildRequest(payload) {
        const request = this.urlPrefix + Buffer.from(JSON.stringify(payload.webHook), 'utf8').toString('base64');
        return request;
    }

};

class WebhookStageDetails {
    /**
     * Path and credentials required to submit analytics through the webhook (staging mode).
     */
    constructor() {
        this.urlPrefix =
                "https://webhooks.mongodb-realm.com/api/client/v2.0/app/realmsdkmetrics-zmhtm/service/metric_webhook/incoming_webhook/metric-stage?data=";
    }

    /**
     * Constructs the full URL that will submit analytics to the webhook.
     * @param  {Object} payload Information that will be submitted through the webhook.
     * @returns {string} Complete analytics submission URL
     */
    buildRequest(payload) {
        const request = this.urlPrefix + Buffer.from(JSON.stringify(payload.webHook), 'utf8').toString('base64');
        return request;
    }
};

class MixpanelDetails {
    /**
     * Path and credentials required to submit analytics through MixPanel.
     */
    constructor() {
        this.urlPrefix = "https://api.mixpanel.com/track/?ip=1&data=";
    }

    /**
     * Constructs the full URL that will submit analytics to MixPanel.
     * @param  {Object} payload Information that will be submitted through MixPanel.
     * @returns {string} Complete analytics submission URL
     */
    buildRequest(payload) {
        const request = this.urlPrefix + Buffer.from(JSON.stringify(payload.webHook), 'utf8').toString('base64');
        return request;
    }
};


function isAnalyticsDisabled() {
    return 'REALM_DISABLE_ANALYTICS' in process.env;
}

function sha256(data) {
    let hash = require('crypto').createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

/**
 * Send collected analytics data to Realm's servers over HTTPS
 * @param  {[WebhookProdDetails|WebhookStageDetails|MixpanelDetails]} requestFactory Submission URL generator
 * @param  {Object} payload analytics info
 */
async function dispatchAnalytics(requestFactory, payload) {
    const https = require('https');

    return new Promise((resolve, reject) => {
        const webhookRequest = new requestFactory().buildRequest(payload);
        
        https.get(webhookRequest, res => {
            resolve({
                statusCode:  res.statusCode,
                statusMessage: res.statusMessage
            });
        }).on('error', error => {
            const message = error && error.message ? error.message : error;
            const err = new Error(`Failed to dispatch analytics: ${message}`);
            reject(err);
        });
    });
}

/**
 * Collect analytics data from the runtime system
 * @param  {Object} context contents of the app's package.json file
 * @param  {string} eventName Custom tag that signifies what the app was doing when the analytics were submitted
 * @returns {Object} Analytics payload
 */
async function fetchPlatformData(context, eventName) {
    const os = require('os');
    const { machineId } = require("node-machine-id");
    const environment = utils.getEnvironment();

    const identifier = await machineId();
    if (!identifier) {
        identifier = sha256('unknown');
    }

    // payloads for webhook and MixPanel differ slightly
    const payloads = {
        'webHook': {
            'event': eventName,
            'properties': {
                'token': 'aab85907a13e1ff44a95be539d9942a9',
                'distinct_id': identifier,
                'Anonymized Machine Identifier': identifier,
                'Anonymized Application ID': sha256(__dirname),
                'Binding': 'javascript',
                'Target': environment,
                'Version': context.version,
                'Language': 'javascript',
                'OS Type': os.platform(),
                'OS Version': os.release(),
                'Node.js versions': process.versions
            }
        },
        'mixPanel': {
            'event': eventName,
            'properties': {
                'token': 'aab85907a13e1ff44a95be539d9942a9',
                'distinct_id': identifier,
                'Anonymized Machine Identifier': identifier,
                'Anonymized Application ID': sha256(__dirname),
                'Binding': environment,
                'Version': context.version,
                'Language': 'javascript',
                'OS Type': os.platform(),
                'OS Version': os.release(),
                'Node.js versions': process.versions
            }
        }
    };

    return payloads;
}

/**
 * Generate and submit analytics data to servers.
 * @param  {[WebhookProdDetails|WebhookStageDetails|MixpanelDetails]} requestFactory Submission URL generator
 * @param  {Object} context contents of the app's package.json file
 * @param  {string} eventName Custom tag that signifies what the app was doing when the analytics were submitted
 * @returns {Promise} Promise that will resolve if analytics are successfully submitted
 */
async function submitAnalytics(requestFactory, context, eventName) {
    // delay execution by 100ms
    // the caller mat set REALM_DISABLE_ANALYTICS in this time
    // to disable analytics
    await new Promise(resolve => setTimeout(resolve, 100));
    if (isAnalyticsDisabled()) {
        return;
    }

    const payload = await fetchPlatformData(context, eventName)
    const versionTags = payload['mixPanel']['properties']['Version'].split('.');

    await Promise.all([
        // send in analytics in the newer S3 format
        dispatchAnalytics(requestFactory, payload),
        
        // on v6.x, we submit both MixPanel and S3 analytics
        // MixPanel analytics make no distinction between production and staging modes
        versionTags[0] < 10 ? dispatchAnalytics(new MixpanelDetails(), payload) : null,
    ]);
}

/**
 * Shorthand for submitting analytics to production environment
 * @param  {string} eventName Custom tag that signifies what the app was doing when the analytics were submitted
 * @returns Promise
 */
async function submitProductionAnalytics(eventName) {
    const context = require('../package.json')
    await submitAnalytics(WebhookProdDetails, context, eventName);
}

/**
 * Shorthand for submitting analytics to staging environment
 * @param  {string} eventName Custom tag that signifies what the app was doing when the analytics were submitted
 * @returns Promise
 */
async function submitStageAnalytics(eventName) {
    const context = require('../package.json');  // Realm context
    return submitAnalytics(WebhookStageDetails, context, eventName);
}

module.exports = {
    fetchPlatformData,
    WebhookProdDetails,
    WebhookStageDetails,
    submitAnalytics,
    submitProductionAnalytics,
    submitStageAnalytics,
    isAnalyticsDisabled,
};

if (require.main === module) {
    submitProductionAnalytics('Install')
    .catch(err => { 
        // fail silently -- the caller is not responsible for handling
        // errors in analytics submission
    });
}
