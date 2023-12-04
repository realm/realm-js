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

import { PromiseHandle } from "./promise-handle";
import { sequence } from "./sequence";

/**
 * A test utility useful when testing listeners.
 * @param handle Promise handle, which will resolve as the final callback gets called or rejected if the returned function is called more than expected.
 * @param callbacks An array of callbacks to call in sequence as the returned function is called.
 * @returns A function which will delegate calls to the provided callbacks.
 */
export function createListenerStub<Args extends unknown[]>(
  handle: PromiseHandle<void>,
  ...callbacks: ((...args: Args) => void)[]
) {
  // Throwing during any callback will reject the promise handle
  callbacks = callbacks.map((callback) => {
    return (...args: Args) => {
      try {
        callback(...args);
      } catch (err) {
        handle.reject(err);
      }
    };
  });

  const last = callbacks.pop();
  if (!last) {
    throw new Error("Expected at least one callback");
  }

  let successTimeout: Timer;

  return sequence(
    ...callbacks,
    (...args: Args) => {
      last(...args);
      // Wait just a sec before resolving, in case another callback fires right after
      successTimeout = setTimeout(() => {
        handle.resolve();
      }, 50);
    },
    // Adding another callback which will reject the handle
    () => {
      clearTimeout(successTimeout);
      const err = new Error("Listener callback was unexpectedly called");
      handle.reject(err);
    },
  );
}
