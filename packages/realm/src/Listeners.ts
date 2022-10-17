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

import { binding } from "./internal";

/** @internal */
export type CallbackRegistrator<T> = (callback: T) => binding.NotificationToken;

/** @internal */
export class Listeners<CallbackType> {
  constructor(private registerCallback: CallbackRegistrator<CallbackType>) {}
  /**
   * Mapping of registered listener callbacks onto the their token in the bindings ObjectNotifier.
   */
  private listeners = new Map<CallbackType, binding.NotificationToken>();

  add(callback: CallbackType): void {
    if (this.listeners.has(callback)) {
      // No need to add a listener twice
      return;
    }
    const token = this.registerCallback(callback);
    // Store the notification token by the callback to enable later removal.
    this.listeners.set(callback, token);
  }

  remove(callback: CallbackType): void {
    const token = this.listeners.get(callback);
    if (typeof token !== "undefined") {
      token.unregister();
      this.listeners.delete(callback);
    }
  }

  removeAll(): void {
    for (const [, token] of this.listeners) {
      token.unregister();
    }
    this.listeners.clear();
  }
}
