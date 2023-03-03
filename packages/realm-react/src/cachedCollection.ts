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
import Realm from "realm";
import { CollectionCallback } from "./helpers";

const numericRegEx = /^-?\d+$/;

function getCacheKey(id: string) {
  return `${id}`;
}

/**
 * Arguments object for {@link cachedCollection}.
 */
type CachedCollectionArgs<T> = {
  /**
   * The {@link Realm.Collection} to proxy
   */
  collection: Realm.List<T> | Realm.Results<T>;
  /**
   * The {@link Realm} instance
   */
  realm: Realm;
  /**
   * Callback which is called whenever an object in the collection changes
   */
  updateCallback: () => void;

  /**
   * Reference boolean which is set to true whenever an object in the collection changes
   * It is used to determine if the collection's object reference should be updated
   * The implementing component should reset this to false when updating its object reference
   */
  updatedRef: React.MutableRefObject<boolean>;

  /**
   * Optional Map to be used as the cache. This is used to allow a `sorted` or `filtered`
   * (derived) version of the collection to reuse the same cache, preventing excess new object
   * references being created.
   */
  objectCache?: Map<string, T>;
  /**
   * Optional flag specifying that this is a derived (`sorted` or `filtered`) version of
   * an existing collection, so we should not create or remove listeners or clear the cache
   * when this is torn down.
   */
  isDerived?: boolean;
};

/**
 * Creates a proxy around a {@link Realm.Collection} that will create new {@link Realm.Object}
 * references on any relevant change (update, insert, deletion) and return the same
 * object reference if no changes have occurred since the last access.
 *
 * This makes the {@link Realm.Collection} behaves in an immutable way, as React expects, so
 * that a {@link Realm.Object} can be wrapped in {@link React.memo} to prevent unnecessary
 * rendering (see {@link useQuery} hook).
 *
 * @param args {@link CachedCollectionArgs} object arguments
 * @returns Proxy object wrapping the collection
 */
export function createCachedCollection<T extends Realm.Object<any>>({
  collection,
  realm,
  updateCallback,
  updatedRef,
  objectCache = new Map(),
  isDerived = false,
}: CachedCollectionArgs<T>): { collection: Realm.Results<T> | Realm.List<T>; tearDown: () => void } {
  const cachedCollectionHandler: ProxyHandler<Realm.Results<T> | Realm.List<T>> = {
    get: function (target, key) {
      // Pass functions through
      const value = Reflect.get(target, key);
      if (typeof value === "function") {
        if (key === "sorted" || key === "filtered") {
          return (...args: unknown[]) => {
            const col: Realm.Results<T & Realm.Object> = Reflect.apply(value, target, args);
            const { collection: newCol } = createCachedCollection({
              collection: col,
              realm,
              updateCallback,
              updatedRef,
              objectCache,
              isDerived: true,
            });
            return newCol;
          };
        }
        return value.bind(target);
      }

      // If the key is not numeric, pass it through
      if (typeof key === "symbol" || !numericRegEx.test(key)) {
        return value;
      }

      // If the key is numeric, check if we have a cached object for this key
      const index = Number(key);
      const object = target[index];

      // If the collection is modeled in a way that objects can be null
      // then we should return null instead of undefined to stay semantically
      // correct
      if (object === null) {
        return null;
      } else if (typeof object === "undefined") {
        // If there is no object at this index, return undefined
        return undefined;
      }

      const objectId = object._objectKey();
      const cacheKey = getCacheKey(objectId);

      // If we do, return it...
      if (objectCache.get(cacheKey)) {
        return objectCache.get(cacheKey);
      }

      // If not then this index has either not been accessed before, or has been invalidated due
      // to a modification. Fetch it from the collection and store it in the cache
      objectCache.set(cacheKey, object);

      return object;
    },
  };

  const cachedCollectionResult = new Proxy(collection, cachedCollectionHandler);

  const listenerCallback: CollectionCallback = (listenerCollection, changes) => {
    if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
      // TODO: There is currently no way to rebuild the cache key from the changes array for deleted object.
      // Until it is possible, we clear the cache on deletions.
      // Blocking issue: https://github.com/realm/realm-core/issues/5220

      // Possible solutions:
      // a. the listenerCollection is a frozen copy of the collection before the deletion,
      // allowing accessing the _objectKey() using listenerCollection[index]._objectKey()
      // b. the callback provides an array of changed objectIds

      if (changes.deletions.length > 0) {
        objectCache.clear();
      }

      // Item(s) were modified, just clear them from the cache so that we return new instances for them
      changes.newModifications.forEach((index) => {
        const objectId = listenerCollection[index]._objectKey();
        if (objectId) {
          const cacheKey = getCacheKey(objectId);
          if (objectCache.has(cacheKey)) {
            objectCache.delete(cacheKey);
          }
        }
      });
      updatedRef.current = true;
      updateCallback();
    }
  };

  if (!isDerived) {
    // If we are in a transaction, then push adding the listener to the event loop.  This will allow the write transaction to finish.
    // see https://github.com/realm/realm-js/issues/4375
    if (realm.isInTransaction) {
      setImmediate(() => {
        collection.addListener(listenerCallback);
      });
    } else {
      collection.addListener(listenerCallback);
    }
  }

  const tearDown = () => {
    if (!isDerived) {
      collection.removeListener(listenerCallback);
      objectCache.clear();
    }
  };

  return { collection: cachedCollectionResult, tearDown };
}
