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
import { getOrCreateCachedObject, ObjectType, PrimaryKey } from "./cachedObject";

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
   * @returns either the desired {@link Realm.Object} or `undefined` in the case of it being deleted or not existing.
   */
  return function useObject<T>(
    type: string | { new (): T; schema: { name: string } },
    primaryKey: PrimaryKey,
  ): (T & Realm.Object) | undefined {
    const realm = useRealm();
    const cachedObject = getOrCreateCachedObject<T>(
      realm,
      typeof type === "string" ? type : type.schema.name,
      primaryKey,
    );
    return cachedObject.useObject();
  };
}
