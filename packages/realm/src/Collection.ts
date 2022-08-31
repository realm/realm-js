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

import { Listeners, CallbackRegistrator } from "./Listeners";

export class Collection<T, ChangeCallbackType> implements Iterable<T> {
  private listeners: Listeners<ChangeCallbackType>;

  constructor(registerCallback: CallbackRegistrator<ChangeCallbackType>) {
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

  [Symbol.iterator](): Iterator<T> {
    throw new Error("Not yet implemented");
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
