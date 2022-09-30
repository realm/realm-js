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

import { IllegalConstructorError } from "./errors";
import { Object as RealmObject } from "./Object";
import { DefaultObject } from "./schema";
import { Listeners, CallbackRegistrator } from "./Listeners";

export abstract class Collection<KeyType = unknown, ValueType = unknown, T = ValueType, ChangeCallbackType = unknown>
  implements Iterable<T>
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
  abstract entries(): Iterable<[KeyType, ValueType]>;
  abstract [Symbol.iterator](): Iterator<T>;

  toJSON(_?: string, cache = new Map()): Array<DefaultObject> {
    // return this.map((item, index) =>
    const result: Array<DefaultObject> = [];
    let index = 0;
    for (const item of this) {
      if (item instanceof RealmObject) {
        result[index] = item.toJSON(index.toString(), cache);
      } else {
        result[index] = item as DefaultObject;
      }
      index++;
    }
    return result;
  }
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
