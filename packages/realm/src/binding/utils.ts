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
          reject(error);
        } else if (args.length === 2) {
          const result = args[0];
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

/**
 * Throws an error when a property is accessed before the native module has been injected.
 * @internal
 */
export function _throwOnAccess(propertyName: string) {
  throw new Error(`Accessed property '${propertyName} before the native module was injected into the Realm binding'`);
}

// Wrapped types

export class Float {
  constructor(public value: number) {}
  valueOf() {
    return this.value;
  }
}

export class Status {
  public isOk: boolean;
  public code?: number;
  public reason?: string;
  constructor(isOk: boolean) {
    this.isOk = isOk;
  }
}

export const ListSentinel = Symbol.for("Realm.List");
export const DictionarySentinel = Symbol.for("Realm.Dictionary");
