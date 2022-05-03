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
  const { DefaultNetworkTransport } = require("realm-network-transport");
  realmConstructor._networkTransport = new DefaultNetworkTransport();
  Object.defineProperty(realmConstructor.Collection.prototype, "toJSON", {
    value: function (_, cache = new Map()) {
      return this.map((item, index) =>
        item instanceof realmConstructor.Object ? item.toJSON(index.toString(), cache) : item,
      );
    },

    writable: true,
    configurable: true,
    enumerable: false,
  });

  const getInternalCacheId = (realmObj) => {
    const { name, primaryKey } = realmObj.objectSchema();
    const id = primaryKey ? realmObj[primaryKey] : realmObj._objectId();
    return `${name}#${id}`;
  };

  Object.defineProperty(realmConstructor.Object.prototype, "toJSON", {
    value: function (_, cache = new Map()) {
      // Construct a reference-id of table-name & primaryKey if it exists, or fall back to objectId.
      const id = getInternalCacheId(this);

      // Check if current objectId has already processed, to keep object references the same.
      const existing = cache.get(id);
      if (existing) {
        return existing;
      }

      // Create new result, and store in cache.
      const result = {};
      cache.set(id, result);

      // Add the generated reference-id, as a non-enumerable prop '$refId', for later exposure though e.g. Realm.JsonSerializationReplacer.
      Object.defineProperty(result, "$refId", { value: id, configurable: true });

      // Move all enumerable keys to result, triggering any specific toJSON implementation in the process.
      Object.keys(this)
        .concat(Object.keys(Object.getPrototypeOf(this)))
        .forEach((key) => {
          const value = this[key];

          // skip any functions & constructors (in case of class models).
          if (typeof value === "function") {
            return; // continue
          }

          // recursively trigger `toJSON` for Realm instances with the same cache.
          if (value instanceof realmConstructor.Object || value instanceof realmConstructor.Collection) {
            result[key] = value.toJSON(key, cache);
          } else if (value instanceof realmConstructor.Dictionary) {
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
                // The user may have cancelled the open between when
                // the download completed and when we managed to
                // actually invoke this, so recheck here.
                if (cancelled) {
                  return;
                }
                // Clear the fallback timeOut if it has been started
                clearTimeout(timeoutId);
                if (error) {
                  reject(error);
                } else {
                  resolve(realm);
                }
              }, 0);
            });
          }),
        );

        // Return wrapped promises, allowing the users to control them.
        let openPromise = Promise.race(openPromises).then((realm) => {
          const { initialSubscriptions } = config.sync;

          // If `initialSubscriptions` was not specified, return the Realm immediately
          if (!initialSubscriptions) {
            return realm;
          }

          // Check that the user provided a valid `updateCallback`
          const { updateCallback } = initialSubscriptions;

          if (typeof updateCallback !== "function") {
            throw new Error(
              `initialSubscriptions.updateCallback must be a function which updates the subscription set, '${typeof updateCallback}' was supplied`,
            );
          }

          // Only run the updateCallback if the Realm did not exist when the user called open,
          // or if `rerunOnStartup` was set to `true`
          if (initialSubscriptions.rerunOnStartup || !realmExists) {
            realm.subscriptions.update((mutableSubs) => updateCallback(mutableSubs, realm));

            // Return a promise which waits for the new subscriptions to be fully
            // synchronised, then returns the Realm
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

    realmConstructor.App.Sync.ClientResyncMode = {
      Discard: "discard",
      Manual: "manual",
      Recover: "recover",
    };

    realmConstructor.App.Sync.SubscriptionsState = {
      Pending: "pending",
      Complete: "complete",
      Error: "error",
      Superseded: "superseded",
    };
  }

  // TODO: Remove this now useless object.
  var types = Object.freeze({
    BOOL: "bool",
    INT: "int",
    FLOAT: "float",
    DOUBLE: "double",
    STRING: "string",
    DATE: "date",
    DATA: "data",
    OBJECT: "object",
    LIST: "list",
  });
  Object.defineProperty(realmConstructor, "Types", {
    get: function () {
      if (typeof console != "undefined") {
        /* eslint-disable no-console */
        var stack = new Error().stack.split("\n").slice(2).join("\n");
        var msg = "`Realm.Types` is deprecated! Please specify the type name as lowercase string instead!\n" + stack;
        if (console.warn != undefined) {
          console.warn(msg);
        } else {
          console.log(msg);
        }
        /* eslint-enable no-console */
      }
      return types;
    },
    configurable: true,
  });

  if (!realmConstructor.JsonSerializationReplacer) {
    Object.defineProperty(realmConstructor, "JsonSerializationReplacer", {
      get: function () {
        const seen = [];

        return function (_, value) {
          // Only check for circular references when dealing with objects & arrays.
          if (value === null || typeof value !== "object") {
            return value;
          }

          // 'this' refers to the object or array containing the the current key/value.
          const parent = this;

          if (value.$refId) {
            // Expose the non-enumerable prop $refId for circular serialization, if it exists.
            Object.defineProperty(value, "$refId", { enumerable: true });
          }

          if (!seen.length) {
            // If we haven't seen anything yet, we only push the current value (root element/array).
            seen.push(value);
            return value;
          }

          const pos = seen.indexOf(parent);
          if (pos !== -1) {
            // If we have seen the parent before, we have already traversed a sibling in the array.
            // We then discard information gathered for the sibling (zero back to the current array).
            seen.splice(pos + 1);
          } else {
            // If we haven't seen the parent before, we add it to the seen-path.
            // Note that this is done both for objects & arrays, to detect when we go to the next item in an array (see above).
            seen.push(parent);
          }

          if (seen.includes(value)) {
            // If we have seen the current value before, return a reference-structure if possible.
            if (value.$refId) {
              return { $ref: value.$refId };
            }
            return "[Circular reference]";
          }

          return value;
        };
      },
    });
  }
};
