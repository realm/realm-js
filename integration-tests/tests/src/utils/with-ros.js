////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

// This file is heavily inspired by https://github.com/realm/react-realm-context/blob/master/src/test-utils/with-ros.ts

const Realm = require("realm");
const uuid = require("uuid").v4;

const { REALM_OBJECT_SERVER_URL } = process.env;

if (typeof REALM_OBJECT_SERVER_URL === 'string') {
    // tslint:disable-next-line:no-console
    console.log(`Running tests requiring ROS against ${REALM_OBJECT_SERVER_URL}`);
} else {
    // tslint:disable-next-line:no-console
    console.log(
        'Define "REALM_OBJECT_SERVER_URL" environment variable to run tests that require ROS',
    );
}

const ros = {
    url: REALM_OBJECT_SERVER_URL,
    createTestUser: () => {
        return Realm.Sync.User.login(
            REALM_OBJECT_SERVER_URL,
            Realm.Sync.Credentials.nickname(`react-js-tests-${uuid()}`),
        );
    },
};

/**
 * Runs tests only if a Realm Object Server was started by the environment running the tests.
 */
module.exports = {
    withRos: {
        it: (expectation, callback) => {
            if (typeof REALM_OBJECT_SERVER_URL === 'string') {
                it(expectation, function (...args) {
                    // Communicating with ROS takes longer than other tests
                    this.timeout(5000);
                    return callback.call({ ...this, ros }, ...args);
                });
            } else {
                it.skip(expectation);
            }
        },
    },
}
