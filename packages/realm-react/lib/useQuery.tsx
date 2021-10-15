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
import { UseRealm } from "./useRealm";
import { useEffect, useState, useCallback } from "react";

export type QueryModifierFn<T> = (query: Realm.Results<T & Realm.Object>) => Realm.Results<T & Realm.Object>;
export interface UseQuery {
  <T>(type: string, queryModifierFn?: QueryModifierFn<T>): {
    error: Error | null;
    data: Realm.Results<T & Realm.Object> | null;
  };
}

export function createUseQuery(useRealm: UseRealm): UseQuery {
  function useQuery<T>(type: string, queryModifierFn: QueryModifierFn<T> = (q) => q) {
    const realm = useRealm();
    const [error, setError] = useState<Error | null>(null);

    const generateResult = useCallback(() => {
      try {
        return queryModifierFn(realm.objects<T>(type));
      } catch (err) {
        console.error(err);
        setError(err as Error);
        return null;
      }
    }, [realm, type, queryModifierFn, setError]); //XXX Check the lint rulers for hooks (setError was not showing an error)

    const [collection, setCollection] = useState<Realm.Results<T & Realm.Object> | null>(generateResult);

    useEffect(() => {
      const listenerCallback: Realm.CollectionChangeCallback<T> = (_, changes) => {
        if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
          setCollection(generateResult());
        }
      };

      if (collection && collection.isValid && !realm.isClosed) collection.addListener(listenerCallback);

      return () => {
        if (collection) {
          collection.removeListener(listenerCallback);
        }
      };
    }, [collection, generateResult]);

    return { error, data: collection };
  }
  return useQuery;
}
