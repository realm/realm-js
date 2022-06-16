////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { Storage, StorageChangeListener } from "../storage/Storage";
import { PrefixedStorage } from "../storage/PrefixedStorage";
import { safeGlobalThis } from "@realm.io/common";

/**
 * In-memory storage that will not be persisted.
 */
export class LocalStorage implements Storage {
  /**
   * Internal state of the storage.
   */
  private readonly global: typeof globalThis;

  /**
   * Constructs a LocalStorage using the global window.
   */
  constructor() {
    if (typeof safeGlobalThis.localStorage === "object") {
      this.global = safeGlobalThis;
    } else {
      throw new Error("Cannot use LocalStorage without a global localStorage object");
    }
  }

  /** @inheritdoc */
  public get(key: string): string | null {
    return this.global.localStorage.getItem(key);
  }

  /** @inheritdoc */
  public set(key: string, value: string): void {
    return this.global.localStorage.setItem(key, value);
  }

  /** @inheritdoc */
  public remove(key: string): void {
    return this.global.localStorage.removeItem(key);
  }

  /** @inheritdoc */
  public prefix(keyPart: string): Storage {
    return new PrefixedStorage(this, keyPart);
  }

  /** @inheritdoc */
  public clear(prefix?: string): void {
    const keys = [];
    // Iterate all keys to find the once have a matching prefix.
    for (let i = 0; i < this.global.localStorage.length; i++) {
      const key = this.global.localStorage.key(i);
      if (key && (!prefix || key.startsWith(prefix))) {
        keys.push(key);
      }
    }
    // Remove the items in a seperate loop to avoid updating while iterating.
    for (const key of keys) {
      this.global.localStorage.removeItem(key);
    }
  }

  /** @inheritdoc */
  public addListener(listener: StorageChangeListener): void {
    return this.global.addEventListener("storage", listener);
  }

  /** @inheritdoc */
  public removeListener(listener: StorageChangeListener): void {
    return this.global.removeEventListener("storage", listener);
  }
}
