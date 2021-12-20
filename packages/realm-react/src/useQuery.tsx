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
import { useEffect, useRef, useState } from "react";

export function createUseQuery(useRealm: () => Realm) {
  return function useQuery<T>(type: string | { new (): T }): Realm.Results<T> {
    const realm = useRealm();
    const [collection, setCollection] = useState<Realm.Results<T & Realm.Object>>(() => realm.objects<T>(type));
    const collectionCache = useRef(new Map());

    const collectionHandler = {
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

        // If we do, return it...
        if (collectionCache.current.get(index)) {
          return collectionCache.current.get(index);
        }

        // If not then this index has either not been accessed before, or has been invalidated due
        // to a modification. Fetch it from the collection and store it in the cache
        const object = target[index];
        collectionCache.current.set(index, object);

        return object;
      },
    };

    useEffect(() => {
      const listenerCallback: Realm.CollectionChangeCallback<T> = (_, changes) => {
        if (changes.deletions.length > 0 || changes.insertions.length > 0) {
          // Item was added or deleted, for now just clear the cache entirely (maybe you could do something cleverer)
          collectionCache.current = new Map();

          // And return a new proxy to the collection
          const collectionProxy = new Proxy(realm.objects<T>(type), collectionHandler);
          setCollection(collectionProxy);
          // setCollection(realm.objects<T>(type));
        } else if (changes.newModifications.length > 0) {
          // Item(s) were modified, just clear them from the cache so that we return new instances for them

          changes.newModifications.forEach((index) => {
            // @ts-ignore
            collectionCache.current.delete(index);
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
    }, [realm, collection, type]);

    return collection;
  };
}
