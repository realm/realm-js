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

// Use a global object for the context data so that it persists across "hot reloads",
// otherwise the tests end up referring to a new context after hot reload (as mocha
// clears the require cache) but the testContextHooks still refer to the old context
// (as they are only required at startup)
global._testContextData = {
  _data: {} as Record<number, Record<string, any>>,
  _depth: 0,
  _self: Math.random(),
};

type TestContext = typeof global._testContextData;

const makeContextHandler = (): ProxyHandler<TestContext> => {
  return {
    get: function (target, prop) {
      // Called by the beforeEach testContextHook to tell it the "depth" of
      // the current test (how many nested levels of test suite it is in).
      // This allows context data to be stored heirachically, so an inner test
      // can override the value of an outer test, but its value is reset once
      // we exit that "level".
      if (prop === "setDepth") {
        return function (newDepth: number, clearCurrentLevel: boolean) {
          // If the new depth is lower than the current depth, delete any data
          // stored at levels above the current depth
          for (let i = target._depth; i > newDepth; i--) {
            delete target._data[i];
          }

          // If we move into a new test suite at the same depth level, we want
          // to clear the current level too
          if (clearCurrentLevel) {
            delete target._data[newDepth];
          }

          target._depth = newDepth;
        };
      }

      // Check for the requested property at the current depth level, if not check
      // every depth level above
      for (let i = target._depth; i > 0; i--) {
        const data = target._data[i] ? target._data[i][prop] : undefined;

        if (data !== undefined) {
          return data;
        }
      }

      return undefined;
    },

    // Set a given property at the current depth level
    set: function (target, prop, value) {
      if (!target._data[target._depth]) {
        target._data[target._depth] = [];
      }

      target._data[target._depth][prop] = value;

      return true;
    },
  };
};

// Global for the same reason as global._testContextData
global._testContext = new Proxy(global._testContextData, makeContextHandler());

export const testContext = global._testContext;

// testContextHooks need to use this getter in order to ensure they are working with
// the newest context when a hot reload occurs
export const getTestContext = () => global._testContext;
