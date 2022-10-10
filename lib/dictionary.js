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

const { symbols } = require("@realm/common");

const dictionaryHandler = {
  get(target, key) {
    // Allows us to detect if this is a proxied Dictionary on JSC pre-v11. See realm-common/symbols.ts for details.
    if (key === symbols.IS_PROXIED_DICTIONARY) {
      return true;
    }

    if (typeof target[key] === "function") {
      return function () {
        return target[key].apply(target, arguments);
      };
    }

    if (typeof key === "symbol") {
      key = Symbol.keyFor(key);
    }

    return target.getter(key);
  },

  set(target, key, value, receiver) {
    target.setter(key, value);
    return receiver;
  },

  has(target, key) {
    return target._has(key);
  },

  deleteProperty(target, key) {
    // this array must be kept in sync with methods implemented by js_dictonary.hpp
    const methodNames = ["set", "remove", "addListener", "removeListener", "removeAllListeners"];
    if (!methodNames.includes(key)) {
      target.remove(key);
    }
    return true;
  },

  ownKeys(target) {
    return target._keys();
  },

  getOwnPropertyDescriptor() {
    return {
      enumerable: true,
      configurable: true,
      writeable: true,
    };
  },
};

function DictionaryProxy(dictionary) {
  return new Proxy(dictionary, dictionaryHandler);
}

module.exports = {
  DictionaryProxy,
};
