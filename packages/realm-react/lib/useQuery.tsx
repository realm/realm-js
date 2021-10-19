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
import { useEffect, useState } from "react";

export function createUseQuery(useRealm: () => Realm | null) {
  return function useQuery<T>(type: string): Realm.Results<T> | null {
    const realm = useRealm();
    const [collection, setCollection] = useState<Realm.Results<T & Realm.Object> | null>(realm?.objects(type) ?? null);

    useEffect(() => {
      const listenerCallback: Realm.CollectionChangeCallback<T> = (_, changes) => {
        if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
          setCollection(realm?.objects(type) ?? null);
        }
      };

      if (collection && collection.isValid && !realm?.isClosed) collection.addListener(listenerCallback);

      return () => {
        if (collection) {
          collection.removeListener(listenerCallback);
        }
      };
    }, [collection, setCollection, type]);

    return collection;
  };
}
