////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { IllegalConstructorError, Listeners, CallbackRegistrator } from "./internal";

export abstract class Collection<
  KeyType = unknown,
  ValueType = unknown,
  EntryType = [KeyType, ValueType],
  T = ValueType,
  ChangeCallbackType = unknown,
> implements Iterable<T>
{
  /** @internal */
  private listeners: Listeners<ChangeCallbackType>;

  /** @internal */
  constructor(registerCallback: CallbackRegistrator<ChangeCallbackType>) {
    if (arguments.length === 0) {
      throw new IllegalConstructorError("Collection");
    }
    this.listeners = new Listeners<ChangeCallbackType>(registerCallback);
    // Make the internal properties non-enumerable
    Object.defineProperties(this, {
      listeners: {
        enumerable: false,
        configurable: false,
        writable: false,
      },
    });
  }

  abstract keys(): Iterable<KeyType>;
  abstract values(): Iterable<ValueType>;
  abstract entries(): Iterable<EntryType>;
  abstract [Symbol.iterator](): Iterator<T>;

  addListener(callback: ChangeCallbackType): void {
    this.listeners.add(callback);
  }

  removeListener(callback: ChangeCallbackType): void {
    this.listeners.remove(callback);
  }

  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
