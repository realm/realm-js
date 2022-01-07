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
import { useEffect, useRef, useMemo, useReducer } from "react";

const numericRegEx = /^-?\d+$/;

export type UseQueryCollection<T> = Realm.Results<T & Realm.Object> & { version?: number };

export function createUseQuery(useRealm: () => Realm) {
  return function useQuery<T>(type: string | { new (): T }): UseQueryCollection<T> {
    const realm = useRealm();
    const collectionCache = useRef(new Map());

    // TODO: Since the listener doesn't return the objectId, we need to store it in reference to its index
    // Refactor this when listeners return ObjectIds
    const indexToIdMap = useRef<string[]>([]);

    const collectionHandler = useMemo<ProxyHandler<Realm.Results<T & Realm.Object>>>(() => {
      return {
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
          const id = object._objectId();

          // If we do, return it...
          if (collectionCache.current.get(id) && collectionCache.current.get(id).deref()) {
            const collection = collectionCache.current.get(id).deref();
            // if the colleciton was garbage collected, skip return and store the updated reference
            if (collection) return collection;
          }

          // If not then this index has either not been accessed before, or has been invalidated due
          // to a modification. Fetch it from the collection and store it in the cache
          collectionCache.current.set(id, new WeakRef(object));
          indexToIdMap.current[index] = id;
          return object;
        },
      };
    }, []);

    const [rerenderCount, forceRerender] = useReducer((x) => x + 1, 0);

    const collection = useMemo<UseQueryCollection<T>>(() => new Proxy(realm.objects<T>(type), collectionHandler), [
      type,
      collectionHandler,
      realm,
    ]);

    useEffect(() => {
      const listenerCallback: Realm.CollectionChangeCallback<T> = (_, changes) => {
        if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
          // Item(s) were deleted, remove their reference from the indexToIdMap and clear them from the cache
          changes.deletions.forEach((index) => {
            const [id] = indexToIdMap.current.splice(index, 1);
            collectionCache.current.delete(id);
          });

          // Item(s) were modified, just clear them from the cache so that we return new instances for them
          changes.newModifications.forEach((index) => {
            const id = indexToIdMap.current[index];
            collectionCache.current.delete(id);
          });

          forceRerender();
        }
      };

      if (collection && collection.isValid() && !realm.isClosed) collection.addListener(listenerCallback);

      return () => {
        if (collection) {
          collection.removeListener(listenerCallback);
        }
      };
    }, [realm, collection, type, collectionHandler]);

    collection.version = rerenderCount;

    return collection;
  };
}
