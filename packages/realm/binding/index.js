////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

/* eslint-env commonjs */

const IGNORED_PROPS = new Set([
  // See https://github.com/realm/realm-js/issues/6522
  "$$typeof",
]);

let injected = false;
const binding = {};

module.exports.binding = new Proxy(binding, {
  get(target, prop, receiver) {
    if (injected || IGNORED_PROPS.has(prop)) {
      return Reflect.get(target, prop, receiver);
    } else {
      throw new Error(`Getting '${prop.toString()}' from binding before it was injected`);
    }
  },
  set(target, prop, value, receiver) {
    if (injected || IGNORED_PROPS.has(prop)) {
      return Reflect.set(target, prop, value, receiver);
    } else {
      throw new Error(`Setting '${prop.toString()}' on binding before it was injected`);
    }
  },
});

exports.inject = (value) => {
  Object.assign(binding, value);
  injected = true;
};
