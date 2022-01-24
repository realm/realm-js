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

const numericRegEx = /^-?\d+$/;

function getCacheKey(id: string) {
  return `${id}`;
}

export function cachedCollection<T>(
  collection: Realm.Results<T & Realm.Object>,
  updateCallback: () => void,
  collectionCache = new Map(),
  isFirst = true,
): { collection: Realm.Results<T & Realm.Object>; tearDown: () => void } {
  const cachedCollectionHandler: ProxyHandler<Realm.Results<T & Realm.Object>> = {
    get: function (target, key) {
      // Pass functions through
      const value = Reflect.get(target, key);
      if (typeof value === "function") {
        if (key === "sorted" || key === "filtered") {
          return (...args: unknown[]) => {
            const col: Realm.Results<T & Realm.Object> = Reflect.apply(value, target, args);
            const { collection: newCol } = cachedCollection(col, updateCallback, collectionCache, false);
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
      const objectId = object._objectId();
      const cacheKey = getCacheKey(objectId);

      // If we do, return it...
      if (collectionCache.get(cacheKey)) {
        const collection = collectionCache.get(cacheKey);
        // if the colleciton was garbage collected, skip return and store the updated reference
        if (collection) return collection;
      }

      // If not then this index has either not been accessed before, or has been invalidated due
      // to a modification. Fetch it from the collection and store it in the cache
      collectionCache.set(cacheKey, object);

      return object;
    },
  };

  const cachedCollectionResult = new Proxy(collection, cachedCollectionHandler);

  const listenerCallback: Realm.CollectionChangeCallback<T & Realm.Object> = (listenerCollection, changes) => {
    if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
      // TODO: There is currently no way to rebuild the cache key from the changes array for deleted object.
      // Until it is possible, we clear the cache on deletions.

      // Possible solutions:
      // a. the listenerCollection is a frozen snapshot of the collection before the deletion,
      // allowing accessing the _objectId() using listenerCollection[index]._objectId()
      // b. the callback provides an array of changed objectIds

      if (changes.deletions.length > 0) {
        collectionCache.clear();
      }

      // Item(s) were modified, just clear them from the cache so that we return new instances for them
      changes.newModifications.reverse().forEach((index) => {
        const objectId = listenerCollection[index]._objectId();
        if (objectId) {
          const cacheKey = getCacheKey(objectId);
          if (collectionCache.has(cacheKey)) {
            collectionCache.delete(cacheKey);
          }
        }
      });

      updateCallback();
    }
  };

  if (isFirst) {
    cachedCollectionResult.addListener(listenerCallback);
  }

  const tearDown = () => {
    if (isFirst) {
      collection.removeListener(listenerCallback);
      collectionCache.clear();
    }
  };

  return { collection: cachedCollectionResult, tearDown };
}
