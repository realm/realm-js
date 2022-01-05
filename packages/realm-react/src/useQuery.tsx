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
import { useEffect, useRef, useState, useMemo } from "react";

export function createUseQuery(useRealm: () => Realm) {
  return function useQuery<T>(type: string | { new (): T }): Realm.Results<T> {
    const realm = useRealm();
    const collectionCache = useRef(new Map());
    const indexToIdMap = useRef<string[]>([]);

    const collectionHandler = useMemo(() => {
      return {
        // @ts-ignore
        get: function (target, key) {
          // Pass functions through
          if (typeof target[key] === "function") {
            return function () {
              return target[key].apply(target, arguments);
            };
          }

          // If the key is not numeric, pass it through
          if (!/^-?\d+$/.test(key)) {
            return target[key];
          }

          // If the key is numeric, check if we have a cached object for this key
          const index = Number(key);
          const object = target[index];
          const id = object._objectId();

          // If we do, return it...
          if (collectionCache.current.get(id) && collectionCache.current.get(id).deref()) {
            return collectionCache.current.get(id).deref();
          }

          // If not then this index has either not been accessed before, or has been invalidated due
          // to a modification. Fetch it from the collection and store it in the cache
          collectionCache.current.set(id, new WeakRef(object));
          indexToIdMap.current[index] = id;
          return object;
        },
      };
    }, []);

    const [collection, setCollection] = useState<Realm.Results<T & Realm.Object>>(
      () => new Proxy(realm.objects<T>(type), collectionHandler),
    );

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
            // @ts-ignore
            collectionCache.current.delete(id);
          });

          // And return a new proxy to the collection (forces re-render)
          const collectionProxy = new Proxy(realm.objects<T>(type), collectionHandler);
          setCollection(collectionProxy);
        }
      };

      if (collection && collection.isValid() && !realm.isClosed) collection.addListener(listenerCallback);

      return () => {
        if (collection) {
          collection.removeListener(listenerCallback);
        }
      };
    }, [realm, collection, type, collectionHandler]);

    return collection;
  };
}
