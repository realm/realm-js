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
    let _dictionary = dictionary;

    return new Proxy(_dictionary, {
        getPrototypeOf: function (_) {
            return Dictionary.prototype;
        },

        get: function (target, key) {
            if (typeof(_dictionary[key]) === "function") {
                return function () {
                    return _dictionary[key].apply(_dictionary, arguments);
                }
            }

            if (key === "toJSON") {
                const keys = _dictionary._keys();
                let obj = {};
                keys.forEach(key => obj[key] = _dictionary.getter(key));
                return obj;
            }

            return _dictionary.getter(key);
        },

        set: function (target, key, value) {
            console.log("FISK 1111", key, value)
            return _dictionary.setter(key, value);
        },

        has: function (target, key) {
            return _dictionary._has(key);
        },

        deleteProperty(target, key) {
            return _dictionary.remove(key);
        },

        enumerate: function (target, key) {
            return _dictionary._keys();
        },

        ownKeys: function (target, key) {
            return _dictionary._keys();
        },

        getOwnPropertyDescriptor(target) {
            return {
                enumerable: true,
                configurable: true,
            };
        }
    });
}

module.exports = {
    Dictionary
}