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

// Prior art: https://www.npmjs.com/package/mocha-ctx/v/1.0.0-a.0

// export let testContext: Partial<RealmContext> & Partial<AppContext> & Partial<UserContext> = {};

// export const resetTestContext = (): void => {
//   testContext = {};
// };

// class Context {
//   _data = {} as Record<number, Record<string, any>>;
//   _depth = 0;

//   constructor() {
//     console.log("new context");
//   }

//   incrementDepth = () => {
//     console.log("incrementDepth", this._depth);
//     this._depth++;
//     console.log("incrementDepth after", this._depth);
//   };

//   decrementDepth = () => {
//     console.log("decrementDepth", this._depth);

//     delete this._data[this._depth];
//     this._depth--;

//     console.log("decrementDepth after", this._depth);
//   };
// }

// const context = new Context();

global.context = {
  _data: {} as Record<number, Record<string, any>>,
  _depth: 0,
  _self: Math.random(),
};

const makeContextHandler = (): ProxyHandler<typeof context> => {
  console.log("make");

  return {
    get: function (target, prop) {
      // console.log("get", prop, target._self);

      // if (prop === "incrementDepth") {
      //   return function () {
      //     console.log("inc");
      //     target._depth++;
      //   };
      // } else if (prop === "decrementDepth") {
      //   return function () {
      //     delete target._data[target._depth];
      //     target._depth--;
      //   };
      // }

      if (prop === "setDepth") {
        return function (newDepth, clearCurrentLevel) {
          console.log({ newDepth, clearCurrentLevel }, target);
          for (let i = target._depth; i > newDepth; i--) {
            // console.log('deete', i)
            delete target._data[i];
          }

          if (clearCurrentLevel) {
            delete target._data[newDepth];
          }

          target._depth = newDepth;
        };
      }

      // if (typeof target[prop] === "function") {
      // return function () {
      //   return target[prop].apply(target, arguments);
      // };
      // }

      // console.log(target._data, target._depth);

      // console.log(target, prop, target.depth);
      console.log("get", target._data);
      for (let i = target._depth; i > 0; i--) {
        const data = target._data[i] ? target._data[i][prop] : undefined;
        console.log({ i, data, x: target._data[i], all: target._data });

        if (data) {
          return data;
        }
      }

      return undefined;
    },

    set: function (target, prop, value) {
      // console.log("set", /*target,*/ prop, value, target._depth, target._self);
      if (!target._data[target._depth]) {
        target._data[target._depth] = [];
      }

      target._data[target._depth][prop] = value;

      // console.log(target._data, target._depth);

      return true;
    },
  };
};

global.testContext = new Proxy(context, makeContextHandler());

export const testContext = global.testContext;
export const getTestContext = () => global.testContext;
