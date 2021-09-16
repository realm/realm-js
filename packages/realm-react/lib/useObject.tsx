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
import { useState, useEffect } from "react";

export interface UseObject {
  <T>(type: string, primaryKey: /*Realm.PrimaryKey*/ number): { hasError: boolean; data: (T & Realm.Object) | null };
}

export function createUseObject(useRealm: UseRealm): UseObject {
  function useObject<T>(type: string, primaryKey: /*Realm.PrimaryKey*/ number) {
    const realm = useRealm();
    const [hasError, setHasError] = useState(false);
    const [object, setObject] = useState<(T & Realm.Object) | null>(null);

    try {
      useEffect(() => {
        setObject(realm.objectForPrimaryKey(type, primaryKey) ?? null);
      }, [type, primaryKey]);

      object?.addListener((_, changes) => {
        if (changes.changedProperties.length > 0 || changes.deleted) {
          setObject(realm.objectForPrimaryKey(type, primaryKey) ?? null);
        }
      });
    } catch (err) {
      console.error(err);
      setHasError(true);
    }

    return { hasError, data: object };
  }
  return useObject;
}
