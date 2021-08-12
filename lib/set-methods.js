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

module.exports = function (realmConstructor) {
  function forEach(callback) {
    const elements = Array.from(this.values());
    elements.forEach((element) => callback(element));
  }

  function toJSON(_, cache = new Map()) {
    const elementArray = Array.from(this.values());
    return elementArray.map((item, index) =>
      item instanceof realmConstructor.Object ? item.toJSON(index.toString(), cache) : item,
    );
  }

  return {
    forEach: { value: forEach, configurable: true, writable: true },
    toJSON: { value: toJSON, configurable: true, writable: true },
  };
};
