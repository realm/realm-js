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

import Realm, { SortDescriptor } from "realm";
import { UseRealm } from "./useRealm";
import { useEffect, useState, useCallback } from "react";

//XXX filter needs to take arguments (see filtered function)
//XXX sort needs to take reversed

export type QueryModifiers = {
  sort?: string | SortDescriptor[];
  filter?: string | [string, ...unknown[]]; // | { query: string; args: unknown[] };
  reverse?: boolean;
};
export interface UseQuery {
  <T>(type: string, modifiers?: QueryModifiers): {
    error: Error | null;
    data: Realm.Results<T & Realm.Object> | null;
  };
}

export function createUseQuery(useRealm: UseRealm): UseQuery {
  function useQuery<T>(type: string, modifiers?: QueryModifiers) {
    const realm = useRealm();
    const [error, setError] = useState<Error | null>(null);

    const generateResult = useCallback(() => {
      try {
        const sort = modifiers?.sort && modifiers?.sort !== "" ? modifiers.sort : null;
        const filter = modifiers?.filter ? modifiers.filter : null;
        let result = null;
        result = realm.objects<T>(type);
        if (filter instanceof Array) {
          result = result.filtered(filter[0], ...filter.slice(1));
        } else if (typeof filter === "string") {
          result = result.filtered(filter);
        }

        if (sort instanceof Array) {
          result = result.sorted(sort);
        } else if (typeof sort === "string") {
          result = modifiers?.reverse ? result.sorted(sort, true) : result.sorted(sort);
        }

        if (!sort && modifiers?.reverse) {
          result = result.sorted(true);
        }
        return result;
      } catch (err) {
        console.error(err);
        setError(err as Error);
        return null;
      }
    }, [realm, type, modifiers, setError]); //XXX Check the lint rulers for hooks (setError was not showing an error)

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
