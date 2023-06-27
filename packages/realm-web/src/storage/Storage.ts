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

/**
 * A function that can be called when the storage changes.
 */
export type StorageChangeListener = () => void;

/**
 * Implementors of this provide a simple key-value store.
 */
export interface Storage {
  /**
   * Get the value of a particular key in the storage.
   */
  get(key: string): string | null;

  /**
   * Set the value of a particular key in the storage.
   */
  set(key: string, value: string): void;

  /**
   * Remove the entry for a particular key from the storage.
   */
  remove(key: string): void;

  /**
   * Create a new store prefixed with a part of the key.
   */
  prefix(keyPart: string): Storage;

  /**
   * Clears all values stored in the storage.
   * @param prefix Clear only values starting with this prefix.
   */
  clear(prefix?: string): void;

  /**
   * Add a callback function which will be called when the store updates.
   * @param listener The listener callback to add.
   */
  addListener(listener: StorageChangeListener): void;

  /**
   * Remove a callback function which was previously added.
   * @param listener The listener callback to remove.
   */
  removeListener(listener: StorageChangeListener): void;
}
