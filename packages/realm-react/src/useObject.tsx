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
import { useEffect, useReducer, useMemo, useRef } from "react";
import { CachedObject, createCachedObject } from "./cachedObject";

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

    // Get the original object from the realm, so we can check if it exists
    const originalObject = realm.objectForPrimaryKey<unknown>(type, primaryKey);

    // Store the primaryKey as a ref, since when it is an objectId or UUID, it will be a new instance on every render
    const primaryKeyRef = useRef(primaryKey);

    // Initializing references with a function call or class constructor will
    // cause the function or constructor to be called on ever render.
    // Even though this value is thrown away, `createCachedObject` will end up registering a listener.
    // Therefore, we initialize the references with null, and only create the object if it is null
    // Ref: https://github.com/facebook/react/issues/14490
    const cachedObjectRef = useRef<null | CachedObject>(null);

    if (cachedObjectRef.current === null) {
      cachedObjectRef.current = createCachedObject({
        object: originalObject ?? null,
        realm,
        updateCallback: forceRerender,
      });
    }

    // Create a ref, since the object returned from `objectForPrimaryKey` is always going to have a different reference
    const originalObjectRef = useRef(originalObject);

    // Wrap the cachedObject in useMemo, so we only replace it with a new instance if `primaryKey` or `type` change
    const { object, tearDown } = useMemo(
      // TODO: There will be an upcoming breaking change that makes objectForPrimaryKey return null
      // When this is implemented, remove `?? null`
      () => {
        // This should never happen, but if it does, we want to return a null result
        if (!cachedObjectRef.current) {
          return { object: null, tearDown: () => undefined };
        }

        // Re-instantiate the cachedObject if the primaryKey has changed or the originalObject has gone from null to not null
        if (
          comparePrimaryKeys(primaryKey, primaryKeyRef.current) === false ||
          (originalObjectRef.current === null && originalObject !== null)
        ) {
          cachedObjectRef.current = createCachedObject({
            object: originalObject ?? null,
            realm,
            updateCallback: forceRerender,
          });
          originalObjectRef.current = originalObject;
        }
        return cachedObjectRef.current;
      },
      [realm, originalObject, primaryKey],
    );

    // Invoke the tearDown of the cachedObject when useObject is unmounted
    useEffect(() => {
      return tearDown;
    }, [tearDown]);

    // If the object doesn't exist, listen for insertions to the collection and force a rerender if the inserted object has the correct primary key
    useEffect(() => {
      const collectionListener: Realm.CollectionChangeCallback<T & Realm.Object> = (collection, changes) => {
        for (const index of changes.insertions) {
          const object = collection[index];
          const primaryKeyProperty = object.objectSchema().primaryKey;
          if (primaryKeyProperty) {
            //@ts-expect-error - if the primaryKeyProperty exists, then it is indexable. However, we don't allow it when we don't actually know the type of the object
            const insertedPrimaryKey = object[primaryKeyProperty];
            if (comparePrimaryKeys(insertedPrimaryKey, primaryKeyRef.current)) {
              forceRerender();
            }
          }
        }
      };

      if (!originalObjectRef.current) {
        const collection = realm.objects(type);
        collection.addListener(collectionListener);
      }

      return () => {
        if (!originalObjectRef.current) {
          // If the app is closing, the realm will be closed and the listener does not need to be removed
          if (!realm.isClosed) {
            const collection = realm.objects(type);
            collection.removeListener(collectionListener);
          }
        }
      };
    }, [realm, type, forceRerender]);

    // If the object has been deleted or doesn't exist for the given primary key, just return null
    if (object === null || object?.isValid() === false) {
      return null;
    }

    // Wrap object in a proxy to update the reference on rerender ( should only rerender when something has changed )
    return new Proxy(object, {}) as T & Realm.Object<T>;
  };
}

// This is a helper function that determines if two primary keys are equal.  It will also handle the case where the primary key is an ObjectId or UUID
const comparePrimaryKeys = (a: any, b: any): boolean => {
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === "string" || typeof a === "number") {
    if (a === b) {
      return true;
    }
  } else if (a instanceof Realm.BSON.ObjectId && b instanceof Realm.BSON.ObjectId) {
    if (a.toHexString() === b.toHexString()) {
      return true;
    }
  } else if (a instanceof Realm.BSON.UUID && b instanceof Realm.BSON.ObjectId) {
    if (a.toHexString() === b.toHexString()) {
      return true;
    }
  }
  return false;
};
