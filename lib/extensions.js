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

const { symbols } = require("@realm/common");

let getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors ||
  function (obj) {
    return Object.getOwnPropertyNames(obj).reduce(function (descriptors, name) {
      descriptors[name] = Object.getOwnPropertyDescriptor(obj, name);
      return descriptors;
    }, {});
  };

function setConstructorOnPrototype(klass) {
  if (klass.prototype.constructor !== klass) {
    Object.defineProperty(klass.prototype, "constructor", { value: klass, configurable: true, writable: true });
  }
}

function openLocalRealm(realmConstructor, config) {
  let promise = Promise.resolve(new realmConstructor(config));
  promise.progress = () => {
    return promise;
  };
  promise.cancel = () => {};
  return promise;
}

module.exports = function (realmConstructor) {
  // Add the specified Array methods to the Collection prototype.
  Object.defineProperties(realmConstructor.Set.prototype, require("./set-methods")(realmConstructor));
  Object.defineProperties(realmConstructor.Collection.prototype, require("./collection-methods")(realmConstructor));
  realmConstructor.DictionaryProxy = require("./dictionary").DictionaryProxy;

  setConstructorOnPrototype(realmConstructor.Collection);
  setConstructorOnPrototype(realmConstructor.List);
  setConstructorOnPrototype(realmConstructor.Results);
  setConstructorOnPrototype(realmConstructor.Object);
  setConstructorOnPrototype(realmConstructor.Set);
  setConstructorOnPrototype(realmConstructor.DictionaryProxy);

  realmConstructor.BSON = require("bson");
  realmConstructor._Decimal128 = realmConstructor.BSON.Decimal128;
  realmConstructor._ObjectId = realmConstructor.BSON.ObjectId;
  realmConstructor._UUID = realmConstructor.BSON.UUID;
  const { DefaultNetworkTransport } = require("@realm/network-transport");
  realmConstructor._networkTransport = new DefaultNetworkTransport();
  realmConstructor._defaultOnDiscardCallback = () => {};
  realmConstructor._defaultOnRecoveryCallback = () => {};

  // Adds to cache when serializing an object for toJSON
  const addToCache = (cache, realmObj, value) => {
    const tableKey = realmObj._tableKey();
    let cachedMap = cache.get(tableKey);
    if (!cachedMap) {
      cachedMap = new Map();
      cache.set(tableKey, cachedMap);
    }
    cachedMap.set(realmObj._objectKey(), value);
  };

  // Adds to cache when serializing an object for toJSON
  const getFromCache = (cache, realmObj) => {
    const tableKey = realmObj._tableKey();
    let cachedMap = cache.get(tableKey);
    return cachedMap ? cachedMap.get(realmObj._objectKey()) : undefined;
  };

  Object.defineProperty(realmConstructor.Collection.prototype, "toJSON", {
    value: function toJSON(_, cache = new Map()) {
      return this.map((item, index) =>
        item instanceof realmConstructor.Object ? item.toJSON(index.toString(), cache) : item,
      );
    },

    writable: true,
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(realmConstructor.Dictionary.prototype, "toJSON", {
    value: function toJSON(_, cache = new Map()) {
      const result = {};
      for (const k of this._keys()) {
        const v = this.getter(k);
        result[k] = v instanceof realmConstructor.Object ? v.toJSON(k, cache) : v;
      }
      return result;
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(realmConstructor.Object.prototype, "toJSON", {
    value: function (_, cache = new Map()) {
      // Check if current objectId has already processed, to keep object references the same.
      const existing = getFromCache(cache, this);
      if (existing) {
        return existing;
      }

      // Create new result, and store in cache.
      const result = {};
      addToCache(cache, this, result);

      // Move all enumerable keys to result, triggering any specific toJSON implementation in the process.
      Object.keys(this)
        .concat(Object.keys(Object.getPrototypeOf(this)))
        .forEach((key) => {
          const value = this[key];

          // skip any functions & constructors (in case of class models).
          if (typeof value === "function") {
            return; // continue
          }

          if (value === null || value === undefined) {
            result[key] = value;
          } else if (value instanceof realmConstructor.Object || value instanceof realmConstructor.Collection) {
            // recursively trigger `toJSON` for Realm instances with the same cache.
            result[key] = value.toJSON(key, cache);
          } else if (
            value instanceof realmConstructor.Dictionary ||
            // Allows us to detect if this is a proxied Dictionary on JSC pre-v11. See realm-common/symbols.ts for details.
            value[symbols.IS_PROXIED_DICTIONARY]
          ) {
            // Dictionary special case to share the "cache" for dictionary-values,
            // in case of circular structures involving links.
            result[key] = Object.fromEntries(
              Object.entries(value).map(([k, v]) => [k, v instanceof realmConstructor.Object ? v.toJSON(k, cache) : v]),
            );
          } else {
            result[key] = value;
          }
        });

      return result;
    },

    writable: true,
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(realmConstructor.Object.prototype, "keys", {
    value: function () {
      return Object.keys(this).concat(Object.keys(Object.getPrototypeOf(this)));
    },

    writable: true,
    configurable: true,
    enumerable: false,
  });

  Object.defineProperty(realmConstructor.Object.prototype, "entries", {
    value: function () {
      let result = {};
      for (const key in this) {
        result[key] = this[key];
      }

      return Object.entries(result);
    },

    writable: true,
    configurable: true,
    enumerable: false,
  });

  //Add static methods to the Realm object
  Object.defineProperties(
    realmConstructor,
    getOwnPropertyDescriptors({
      open(config) {
        // If no config is defined, we should just open the default realm
        if (config === undefined) {
          config = {};
        }

        // For local Realms we open the Realm and return it in a resolved Promise.
        if (config.sync === undefined) {
          return openLocalRealm(realmConstructor, config);
        }

        const realmExists = realmConstructor.exists(config);

        // Determine if we are opening an existing Realm or not.
        let behavior = realmExists ? "existingRealmFileBehavior" : "newRealmFileBehavior";

        // Define how the Realm file is opened
        let openLocalRealmImmediately = false; // Default is downloadBeforeOpen
        if (config.sync[behavior] !== undefined) {
          const type = config.sync[behavior].type;
          switch (type) {
            case "downloadBeforeOpen":
              openLocalRealmImmediately = false;
              break;
            case "openImmediately":
              openLocalRealmImmediately = true;
              break;
            default:
              throw Error(`Invalid type: '${type}'. Only 'downloadBeforeOpen' and 'openImmediately' is allowed.`);
          }
        }

        // If configured to do so, the synchronized Realm will be opened locally immediately.
        // If this is the first time the Realm is created, the schema will be created locally as well.
        if (openLocalRealmImmediately) {
          return openLocalRealm(realmConstructor, config);
        }

        // Otherwise attempt to synchronize the Realm state from the server before opening it.

        // First configure any timeOut and corresponding behavior.
        let openPromises = [];

        // Id of the timer triggering the timeout
        let timeoutId = null;

        if (config.sync[behavior] !== undefined && config.sync[behavior].timeOut !== undefined) {
          let timeOut = config.sync[behavior].timeOut;
          if (typeof timeOut !== "number") {
            throw new Error(`'timeOut' must be a number: '${timeOut}'`);
          }

          // Define the behavior in case of a timeout
          let throwOnTimeOut = true; // Default is to throw
          if (config.sync[behavior] !== undefined && config.sync[behavior].timeOutBehavior) {
            const timeOutBehavior = config.sync[behavior].timeOutBehavior;
            switch (timeOutBehavior) {
              case "throwException":
                throwOnTimeOut = true;
                break;
              case "openLocalRealm":
                throwOnTimeOut = false;
                break;
              default:
                throw Error(
                  `Invalid 'timeOutBehavior': '${timeOutBehavior}'. Only 'throwException' and 'openLocalRealm' is allowed.`,
                );
            }
          }

          openPromises.push(
            new Promise((resolve, reject) => {
              timeoutId = setTimeout(() => {
                if (asyncOpenTask) {
                  asyncOpenTask.cancel();
                  asyncOpenTask = null;
                }
                if (throwOnTimeOut) {
                  reject(new Error(`${config.sync.url} could not be downloaded in the allocated time: ${timeOut} ms.`));
                } else {
                  return resolve(openLocalRealm(realmConstructor, config));
                }
              }, timeOut);
            }),
          );
        }

        // Configure promise responsible for downloading the Realm from the server
        let asyncOpenTask;
        let cancelled = false;
        openPromises.push(
          new Promise((resolve, reject) => {
            asyncOpenTask = realmConstructor._asyncOpen(config, (realm, error) => {
              setTimeout(() => {
                asyncOpenTask = null;
                // Clear the fallback timeOut if it has been started
                clearTimeout(timeoutId);
                if (error) {
                  reject(error);
                } else if (!cancelled) {
                  // The user may have cancelled the open between when
                  // the download completed and when we managed to
                  // actually invoke this, so recheck here.
                  resolve(realm);
                }
              }, 0);
            });
          }),
        );

        // Return wrapped promises, allowing the users to control them. Once one of the
        // `openPromise`s has resolved, we may need to wait for initial subscriptions
        // (if any) to be synchronised, so we return a chained promise to do this.
        let openPromise = Promise.race(openPromises).then((realm) => {
          const { initialSubscriptions } = config.sync;

          // If `initialSubscriptions` was not specified, return the Realm immediately
          if (!initialSubscriptions) {
            return realm;
          }

          // If an update has been run by C++ (which performs all the validation
          // and runs the actual update function, see `handle_initial_subscriptions`
          // in `js_realm.hpp`), we need to return a promise which waits for the
          // new subscriptions to be fully synchronised, then returns the Realm.
          if (initialSubscriptions.rerunOnOpen || !realmExists) {
            return realm.subscriptions.waitForSynchronization().then(() => {
              return realm;
            });
          } else {
            return realm;
          }
        });

        openPromise.cancel = () => {
          if (asyncOpenTask) {
            asyncOpenTask.cancel();
            cancelled = true;
          }
        };
        openPromise.progress = (callback) => {
          if (asyncOpenTask) {
            asyncOpenTask.addDownloadNotification(callback);
          }
          return openPromise;
        };
        return openPromise;
      },

      createTemplateObject(objectSchema) {
        let obj = {};
        for (let key in objectSchema.properties) {
          let type;
          if (typeof objectSchema.properties[key] === "string" || objectSchema.properties[key] instanceof String) {
            // Simple declaration of the type
            type = objectSchema.properties[key];
          } else {
            // Advanced property setup
            const property = objectSchema.properties[key];

            // if optional is set, it wil take precedence over any `?` set on the type parameter
            if (property.optional === true) {
              continue;
            }

            // If a default value is explicitly set, always set the property
            if (property.default !== undefined) {
              obj[key] = property.default;
              continue;
            }

            type = property.type;
          }

          // Set the default value for all required primitive types.
          // Lists are always treated as empty if not specified and references to objects are always optional
          switch (type) {
            case "bool":
              obj[key] = false;
              break;
            case "int":
              obj[key] = 0;
              break;
            case "float":
              obj[key] = 0.0;
              break;
            case "double":
              obj[key] = 0.0;
              break;
            case "string":
              obj[key] = "";
              break;
            case "data":
              obj[key] = new ArrayBuffer(0);
              break;
            case "date":
              obj[key] = new Date(0);
              break;
          }
        }
        return obj;
      },
    }),
  );

  // Add static properties to Realm Object
  const updateModeType = {
    All: "all",
    Modified: "modified",
    Never: "never",
  };

  if (!realmConstructor.UpdateMode) {
    Object.defineProperty(realmConstructor, "UpdateMode", {
      value: updateModeType,
      configurable: false,
    });
  }

  // Add sync methods
  if (realmConstructor.App.Sync) {
    let appMethods = require("./app");
    Object.defineProperties(realmConstructor.App, getOwnPropertyDescriptors(appMethods.static));
    Object.defineProperties(realmConstructor.App.prototype, getOwnPropertyDescriptors(appMethods.instance));

    let userMethods = require("./user");
    Object.defineProperties(realmConstructor.User, getOwnPropertyDescriptors(userMethods.static));
    Object.defineProperties(realmConstructor.User.prototype, getOwnPropertyDescriptors(userMethods.instance));

    let subscriptionSetMethods = require("./subscription-set");
    Object.defineProperties(
      realmConstructor.App.Sync.SubscriptionSet,
      getOwnPropertyDescriptors(subscriptionSetMethods.static),
    );
    Object.defineProperties(realmConstructor.App.Sync.SubscriptionSet.prototype, {
      ...getOwnPropertyDescriptors(subscriptionSetMethods.instance),
      ...require("./collection-methods")(realmConstructor),
    });

    let mutableSubscriptionSetMethods = require("./mutable-subscription-set");
    Object.defineProperties(
      realmConstructor.App.Sync.MutableSubscriptionSet,
      getOwnPropertyDescriptors(mutableSubscriptionSetMethods.static),
    );
    Object.defineProperties(realmConstructor.App.Sync.MutableSubscriptionSet.prototype, {
      ...getOwnPropertyDescriptors(mutableSubscriptionSetMethods.instance),
    });

    let sessionMethods = require("./session");
    Object.defineProperties(realmConstructor.App.Sync.Session, getOwnPropertyDescriptors(sessionMethods.static));
    Object.defineProperties(
      realmConstructor.App.Sync.Session.prototype,
      getOwnPropertyDescriptors(sessionMethods.instance),
    );

    let credentialMethods = require("./credentials");
    Object.defineProperties(realmConstructor.Credentials, getOwnPropertyDescriptors(credentialMethods.static));

    let emailPasswordAuthMethods = require("./email-password-auth-methods");
    Object.defineProperties(
      realmConstructor.Auth.EmailPasswordAuth.prototype,
      getOwnPropertyDescriptors(emailPasswordAuthMethods.instance),
    );

    let apiKeyAuthMethods = require("./api-key-auth-methods");
    Object.defineProperties(
      realmConstructor.Auth.ApiKeyAuth.prototype,
      getOwnPropertyDescriptors(apiKeyAuthMethods.instance),
    );

    realmConstructor.App.Sync.AuthError = require("./errors").AuthError;

    if (realmConstructor.App.Sync.removeAllListeners) {
      process.on("exit", realmConstructor.App.Sync.removeAllListeners);
      process.on("SIGINT", function () {
        realmConstructor.App.Sync.removeAllListeners();
        process.exit(2);
      });
      process.on("uncaughtException", function (e) {
        realmConstructor.App.Sync.removeAllListeners();
        /* eslint-disable no-console */
        console.log(e.stack);
        process.exit(99);
      });
    }

    setConstructorOnPrototype(realmConstructor.User);
    setConstructorOnPrototype(realmConstructor.App.Sync.Session);
    setConstructorOnPrototype(realmConstructor.App);
    setConstructorOnPrototype(realmConstructor.Credentials);

    realmConstructor.SessionStopPolicy = {
      AfterUpload: "after-upload",
      Immediately: "immediately",
      Never: "never",
    };

    realmConstructor.ClientResetMode = {
      Manual: "manual",
      DiscardLocal: "discardLocal",
      DiscardUnsyncedChanges: "discardUnsyncedChanges",
      RecoverUnsyncedChanges: "recoverUnsyncedChanges",
      RecoverOrDiscardUnsyncedChanges: "recoverOrDiscardUnsyncedChanges",
    };

    realmConstructor.App.Sync.openLocalRealmBehavior = {
      type: "openImmediately",
    };

    realmConstructor.App.Sync.downloadBeforeOpenBehavior = {
      type: "downloadBeforeOpen",
      timeOut: 30 * 1000,
      timeOutBehavior: "throwException",
    };

    realmConstructor.App.Sync.ConnectionState = {
      Disconnected: "disconnected",
      Connecting: "connecting",
      Connected: "connected",
    };

    realmConstructor.ConnectionState = realmConstructor.App.Sync.ConnectionState;

    realmConstructor.App.Sync.SessionState = {
      Invalid: "invalid",
      Active: "active",
      Inactive: "inactive",
    };

    realmConstructor.SessionState = realmConstructor.App.Sync.SessionState;

    realmConstructor.ProgressDirection = {
      Download: "download",
      Upload: "upload",
    };

    realmConstructor.ProgressMode = {
      ReportIndefinitely: "reportIndefinitely",
      ForCurrentlyOutstandingWork: "forCurrentlyOutstandingWork",
    };

    realmConstructor.App.Sync.ClientResetMode = {
      Manual: "manual",
      DiscardLocal: "discardLocal",
      DiscardUnsyncedChanges: "discardUnsyncedChanges",
      RecoverUnsyncedChanges: "recoverUnsyncedChanges",
      RecoverOrDiscardUnsyncedChanges: "recoverOrDiscardUnsyncedChanges",
    };

    realmConstructor.ClientResetMode = realmConstructor.App.Sync.ClientResetMode;

    realmConstructor.App.Sync.SubscriptionsState = {
      Pending: "pending",
      Complete: "complete",
      Error: "error",
      Superseded: "superseded",
    };

    realmConstructor.OpenRealmBehaviorType = {
      DownloadBeforeOpen: "downloadBeforeOpen",
      OpenImmediately: "openImmediately",
    };
  }

  realmConstructor.Types = {
    Decimal128: realmConstructor.BSON.Decimal128,
    ObjectId: realmConstructor.BSON.ObjectId,
    UUID: realmConstructor.BSON.UUID,
    Date: Date,
    Data: ArrayBuffer,
    // These types cannot be constructed, but are re-exported so they can be used for `instanceOf`
    List: realmConstructor.List,
    Set: realmConstructor.Set,
    Dictionary: realmConstructor.Dictionary,
  };

  // Decorators are not intended to be used at runtime and are removed from the source
  // by @realm/babel-plugin. Therefore, if a decorator is called, this means it is being
  // used outside of @realm/babel-plugin (or the plugin is incorrectly configured), so
  // we should throw
  function handleDecoratorCall(decoratorName) {
    return function () {
      throw new Error(
        `The @${decoratorName} decorator cannot be used without the \`@realm/babel-plugin\` Babel plugin. Please check that you have installed and configured the Babel plugin.`,
      );
    };
  }

  realmConstructor.index = handleDecoratorCall("index");
  realmConstructor.mapTo = handleDecoratorCall("mapTo");
};
