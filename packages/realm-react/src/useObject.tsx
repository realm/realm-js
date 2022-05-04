////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import Realm from "realm";
import { getOrCreateCachedObject } from "./cachedObject";

// In order to make @realm/react work with older version of realms
// This pulls the type for PrimaryKey out of the call signature of `objectForPrimaryKey`
// TODO: If we depend on a new version of Realm for @realm/react, we can just use Realm.PrimaryKey
type PrimaryKey = Parameters<typeof Realm.prototype.objectForPrimaryKey>[1];

/**
 * Generates the `useObject` hook from a given `useRealm` hook.
 *
 * @param useRealm - Hook that returns an open Realm instance
 * @returns useObject - Hook that is used to gain access to a single Realm object from a primary key
 */
export function createUseObject(useRealm: () => Realm) {
  /**
   * Returns a {@link Realm.Object} from a given type and primary key.
   * The hook will update on any changes to the properties on the returned object
   * and return null if it either doesn't exist or has been deleted.
   *
   * @example
   * ```
   * const object = useObject(ObjectClass, objectId);
   * ```
   *
   * @param type - The object type, depicted by a string or a class extending {@link Realm.Object}
   * @param primaryKey - The primary key of the desired object which will be retrieved using {@link Realm.objectForPrimaryKey}
   * @returns either the desired {@link Realm.Object} or `null` in the case of it being deleted or not existing.
   */
  return function useObject<T>(type: string | { new (): T }, primaryKey: PrimaryKey): (T & Realm.Object) | null {
    const realm = useRealm();
    const cachedObject = getOrCreateCachedObject(realm, type, primaryKey)
    return cachedObject.useObject()
  };
}
