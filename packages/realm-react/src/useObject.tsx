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
import { useEffect, useReducer, useMemo } from "react";
import { createCachedObject } from "./cachedObject";

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
  return function useObject<T>(
    type: string | { new (...args: any): T },
    primaryKey: PrimaryKey,
  ): (T & Realm.Object<T>) | null {
    const realm = useRealm();

    // Create a forceRerender function for the cachedObject to use as its updateCallback, so that
    // the cachedObject can force the component using this hook to re-render when a change occurs.
    const [, forceRerender] = useReducer((x) => x + 1, 0);

    // Wrap the cachedObject in useMemo, so we only replace it with a new instance if `primaryKey` or `type` change
    const { object, tearDown } = useMemo(
      // TODO: There will be an upcoming breaking change that makes objectForPrimaryKey return null
      // When this is implemented, remove `?? null`
      () =>
        createCachedObject({
          object: realm.objectForPrimaryKey(type, primaryKey) ?? null,
          updateCallback: forceRerender,
        }),
      [type, realm, primaryKey],
    );

    // Invoke the tearDown of the cachedObject when useObject is unmounted
    useEffect(() => {
      return tearDown;
    }, [tearDown]);

    // If the object has been deleted or doesn't exist for the given primary key, just return null
    if (object === null || object?.isValid() === false) {
      return null;
    }

    // Wrap object in a proxy to update the reference on rerender ( should only rerender when something has changed )
    return new Proxy(object, {});
  };
}
