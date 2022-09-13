////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

const { MongoDBCollection } = require("./mongo-client");
const { cleanArguments, promisify } = require("./utils");

const instanceMethods = {
  linkCredentials(credentials) {
    return promisify((cb) => this._linkCredentials(credentials, cb));
  },

  logOut() {
    return promisify((cb) => this._logOut(cb));
  },

  async callFunction(name, ...args) {
    return this._callFunctionOnService(name, undefined, ...args);
  },

  async _callFunctionOnService(name, serviceName, ...args) {
    const cleanedArgs = cleanArguments(args);
    const stringifiedArgs = EJSON.stringify(cleanedArgs, { relaxed: false });
    const result = await promisify((cb) => this._callFunction(name, stringifiedArgs, serviceName, cb));
    return EJSON.parse(result);
  },

  async refreshCustomData() {
    await promisify((cb) => this._refreshCustomData(cb));
    return this.customData;
  },

  mongoClient(serviceName) {
    const user = this;
    return {
      get serviceName() {
        return serviceName;
      },

      db(dbName) {
        return {
          get name() {
            return dbName;
          },

          collection(collName) {
            return new MongoDBCollection(user, serviceName, dbName, collName);
          },
        };
      },
    };
  },

  push(serviceName) {
    const user = this;
    return {
      register(token) {
        return promisify((cb) => user._pushRegister(serviceName, token, cb));
      },
      deregister() {
        return promisify((cb) => user._pushDeregister(serviceName, cb));
      },
    };
  },

  get functions() {
    return this._functionsOnService(undefined);
  },

  get auth() {
    const user = this;
    return new Proxy(
      {},
      {
        get(target, name) {
          if (name === "apiKeys") {
            return user._authApiKeys;
          }
        },
      },
    );
  },

  get customData() {
    return EJSON.parse(this._customData);
  },

  // Internal helpers.
  _functionsOnService(serviceName) {
    const user = this;
    return new Proxy(
      {},
      {
        get(target, name, receiver) {
          if (typeof name === "string" && name != "inspect") {
            return (...args) => {
              return user._callFunctionOnService(name, serviceName, ...args);
            };
          } else {
            return Reflect.get(target, name, receiver);
          }
        },
      },
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
