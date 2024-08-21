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
