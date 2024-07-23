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

import { assert } from "../assert";

// Copied from lib/utils.js of the v11 SDK
// It might be slightly faster to make dedicated wrapper for 1 and 2 argument forms, but unlikely to be worth it.

/**
 * Calls a function with a completion callback and turns it into a Promise.
 * @internal
 */
export function _promisify<Args extends unknown[]>(nullAllowed: boolean, func: (cb: (...args: Args) => void) => void) {
  return new Promise((resolve, reject) => {
    func((...args: Args) => {
      // Any errors in this function should flow into the Promise chain, rather than out to the caller,
      // since callers of async callbacks aren't expecting exceptions.
      try {
        if (args.length < 1 || args.length > 2) throw Error("invalid args length " + args.length);
        // The last argument is always an error
        const error = args[args.length - 1];
        if (error) {
          assert.instanceOf(error, Error, "error");
          reject(error);
        } else if (args.length == 2) {
          const result = args[0];
          assert(
            nullAllowed || (result !== null && result !== undefined),
            "Unexpected null or undefined successful result",
          );
          resolve(result);
        } else {
          resolve(undefined);
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}
