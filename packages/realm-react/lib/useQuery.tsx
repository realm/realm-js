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

import { UseRealm } from "./useRealm";
import { useEffect, useState, useCallback } from "react";

export type QueryModifiers = { sort?: string; filter?: string };

export interface UseQuery {
  <T>(type: string, modifiers?: QueryModifiers): {
    hasError: boolean;
    data: Realm.Results<T & Realm.Object> | null;
  };
}

export function createUseQuery(useRealm: UseRealm): UseQuery {
  function useQuery<T>(type: string, modifiers?: QueryModifiers) {
    const realm = useRealm();

    const [hasError, setHasError] = useState(false);
    const [collection, setCollection] = useState<Realm.Results<T & Realm.Object> | null>(null);

    const generateResult = useCallback(() => {
      try {
        const sort = modifiers?.sort && modifiers?.sort !== "" ? modifiers.sort : null;
        const filter = modifiers?.filter != null && modifiers?.filter !== "" ? modifiers.filter : null;
        let result = null;
        result = realm.objects<T>(type);
        if (filter) {
          result = result.filtered(filter);
        }

        if (sort) {
          result = result.sorted(sort);
        }
        return result;
      } catch (err) {
        console.error(err);
        setHasError(true);
        return null;
      }
    }, [realm, type, modifiers]);

    useEffect(() => {
      setCollection(generateResult());
    }, [realm, type, modifiers, generateResult]);

    useEffect(() => {
      if (collection) {
        collection.addListener((_, changes) => {
          if (changes.deletions.length > 0 || changes.insertions.length > 0 || changes.newModifications.length > 0) {
            setCollection(generateResult());
          }
        });
      }

      return () => {
        if (collection) {
          collection.removeAllListeners();
        }
      };
    }, [collection, generateResult]);

    return { hasError, data: collection };
  }
  return useQuery;
}
