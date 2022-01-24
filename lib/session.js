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

const { EJSON } = require("bson");

function waitForCompletion(session, fn, timeout, timeoutErrorMessage) {
  const waiter = new Promise((resolve, reject) => {
    fn.call(session, (error) => {
      if (error === undefined) {
        setTimeout(() => resolve(), 1);
      } else {
        setTimeout(() => reject(error), 1);
      }
    });
  });
  if (timeout === undefined) {
    return waiter;
  }
  return Promise.race([
    waiter,
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(timeoutErrorMessage);
      }, timeout);
    }),
  ]);
}

const instanceMethods = {
  get config() {
    // Parse the EJSON properties
    const config = this._config;
    if (config) {
      if (config.partitionValue) {
        return {
          ...config,
          partitionValue: EJSON.parse(config.partitionValue),
        };
      } else {
        return config;
      }
    } else {
      return undefined;
    }
  },

  uploadAllLocalChanges(timeout) {
    return waitForCompletion(
      this,
      this._waitForUploadCompletion,
      timeout,
      `Uploading changes did not complete in ${timeout} ms.`,
    );
  },

  downloadAllServerChanges(timeout) {
    return waitForCompletion(
      this,
      this._waitForDownloadCompletion,
      timeout,
      `Downloading changes did not complete in ${timeout} ms.`,
    );
  },
};

const staticMethods = {
  // none
};

module.exports = {
  static: staticMethods,
  instance: instanceMethods,
};
