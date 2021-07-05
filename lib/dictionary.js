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

"use strict";

function Dictionary(dictionary) {
    return new Proxy(dictionary, {
        getPrototypeOf: function (_) {
            return Dictionary.prototype;
        },

        get: function (target, key) {
            if (key === "toJSON") {
                return function () {
                    const keys = target._keys();
                    let obj = {};
                    keys.forEach(key => obj[key] = target.getter(key));
                    return obj;
                }
            }

            if (typeof(target[key]) === "function") {
                return function () {
                    return target[key].apply(target, arguments);
                }
            }

            return target.getter(key);
        },

        set: function (target, key, value) {
            return target.setter(key, value);
        },

        has: function (target, key) {
            return target._has(key);
        },

        deleteProperty(target, key) {
            return target.remove(key);
        },

        enumerate: function (target, key) {
            return target._keys();
        },

        ownKeys: function (target, key) {
            return target._keys();
        },

        getOwnPropertyDescriptor(target) {
            return {
                enumerable: true,
                configurable: true,
                writeable: true,
            };
        }
    });
}

module.exports = {
    Dictionary
}