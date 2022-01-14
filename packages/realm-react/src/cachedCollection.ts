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
): { collection: Realm.Results<T & Realm.Object>; tearDown: () => void } {
  let indexToObjectId: string[] = [];

  const cachedCollectionHandler: ProxyHandler<Realm.Results<T & Realm.Object>> = {
    get: function (target, key) {
      // Pass functions through
      const value = Reflect.get(target, key);
      if (typeof value === "function") {
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

      // track the objectId by index
      indexToObjectId[index] = objectId;

      // If not then this index has either not been accessed before, or has been invalidated due
      // to a modification. Fetch it from the collection and store it in the cache
      collectionCache.set(cacheKey, object);

      return object;
    },
  };

  const cachedCollection = new Proxy(collection, cachedCollectionHandler);

  const listenerCallback: Realm.CollectionChangeCallback<T & Realm.Object> = (_, changes) => {
    if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
      // Item(s) were deleted, remove their reference from the indexToIdMap and clear them from the cache
      // read the indexes from the largest first, to avoid making them invalid while removing them from the array
      changes.deletions.reverse().forEach((index) => {
        const [objectId] = indexToObjectId.splice(index, 1);
        if (objectId) {
          const cacheKey = getCacheKey(objectId);
          collectionCache.delete(cacheKey);
        }
      });

      // Item(s) were modified, just clear them from the cache so that we return new instances for them
      changes.newModifications.reverse().forEach((index) => {
        const [objectId] = indexToObjectId.splice(index, 1);
        if (objectId) {
          const cacheKey = getCacheKey(objectId);
          collectionCache.delete(cacheKey);
        }
      });

      updateCallback();
    }
  };

  cachedCollection.addListener(listenerCallback);
  const tearDown = () => {
    collection.removeListener(listenerCallback);
    collectionCache.clear();
    indexToObjectId = [];
  };

  return { collection: cachedCollection, tearDown };
}
