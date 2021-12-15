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
  const exportedFunctions = {};
  var arrayPrototype = Array.prototype;
  // eslint-disable-next-line no-undef
  var iteratorPrototype = {};

  // These iterators should themselves be iterable.
  Object.defineProperty(iteratorPrototype, Symbol.iterator, {
    value: function () {
      return this;
    },
  });

  [
    "toString",
    "toLocaleString",
    "concat",
    "join",
    "slice",
    "lastIndexOf",
    "every",
    "some",
    "forEach",
    "find",
    "findIndex",
    "map",
    "filter",
    "reduce",
    "reduceRight",
  ].forEach(function (methodName) {
    var method = arrayPrototype[methodName];
    if (method) {
      exportedFunctions[methodName] = { value: method, configurable: true, writable: true };
    }
  });

  ["entries", "keys", "values"].forEach(function (methodName) {
    var method = function () {
      const isSet = this instanceof realmConstructor.Set;
      var self = this.type === "object" || isSet ? this.snapshot() : this;
      var index = 0;

      return Object.create(iteratorPrototype, {
        next: {
          value: function () {
            if (!self || index >= self.length) {
              self = null;
              return { done: true, value: undefined };
            }

            var value;
            switch (methodName) {
              case "entries":
                value = isSet ? [self[index], self[index]] : [index, self[index]];
                break;
              case "keys":
                value = isSet ? undefined : index;
                break;
              default:
                value = self[index];
                break;
            }

            index++;
            return { done: false, value: value };
          },
        },
      });
    };

    exportedFunctions[methodName] = { value: method, configurable: true, writable: true };
  });

  exportedFunctions[Symbol.iterator] = exportedFunctions.values;

  return exportedFunctions;
};
