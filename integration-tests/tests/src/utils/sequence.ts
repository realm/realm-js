////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

/**
 * @returns A function which will delegate calls to the callbacks in sequence or throw if called too many times.
 */
export function sequence<This, Args extends unknown[], R>(...callbacks: Array<(...args: Args) => R>) {
  let i = 0;
  return function (this: This, ...args: Args) {
    if (i >= callbacks.length) {
      throw new Error(`Sequence was called more than ${callbacks.length} times (call #${i})`);
    } else {
      try {
        return callbacks[i].call(this, ...args);
      } finally {
        i++;
      }
    }
  };
}
