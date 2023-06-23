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

import { Storage, StorageChangeListener } from "./Storage";

/**
 * A `Storage` which will prefix a key part to every operation.
 */
export class PrefixedStorage implements Storage {
  /**
   * The string separating two parts.
   */
  private static PART_SEPARATOR = ":";

  /**
   * The underlying storage to use for operations.
   */
  private storage: Storage;

  /**
   * The part of the key to prefix when performing operations.
   */
  private keyPart: string;

  /**
   * Construct a `Storage` which will prefix a key part to every operation.
   * @param storage The underlying storage to use for operations.
   * @param keyPart The part of the key to prefix when performing operations.
   */
  constructor(storage: Storage, keyPart: string) {
    this.storage = storage;
    this.keyPart = keyPart;
  }

  /** @inheritdoc */
  public get(key: string): string | null {
    return this.storage.get(this.keyPart + PrefixedStorage.PART_SEPARATOR + key);
  }

  /** @inheritdoc */
  public set(key: string, value: string): void {
    return this.storage.set(this.keyPart + PrefixedStorage.PART_SEPARATOR + key, value);
  }

  /** @inheritdoc */
  public remove(key: string): void {
    return this.storage.remove(this.keyPart + PrefixedStorage.PART_SEPARATOR + key);
  }

  /** @inheritdoc */
  public prefix(keyPart: string): Storage {
    return new PrefixedStorage(this, keyPart);
  }

  /** @inheritdoc */
  public clear(prefix = ""): void {
    return this.storage.clear(this.keyPart + PrefixedStorage.PART_SEPARATOR + prefix);
  }

  /** @inheritdoc */
  public addListener(listener: StorageChangeListener): void {
    return this.storage.addListener(listener);
  }

  /** @inheritdoc */
  public removeListener(listener: StorageChangeListener): void {
    return this.storage.addListener(listener);
  }
}
