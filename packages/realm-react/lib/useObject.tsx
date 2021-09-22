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
import { useState, useEffect } from "react";

export interface UseObject {
  <T>(type: string, primaryKey: Realm.PrimaryKey): { error: Error | null; data: (T & Realm.Object) | null };
}

// TODO: Figure out how to access objectForPrimaryKey paramater, so that versino 10.0.0 of realm works with hooks
// type PrimaryKey = Parameters<typeof globalThis.Realm.objectForPrimaryKey>[0];

export function createUseObject(useRealm: UseRealm): UseObject {
  function useObject<T>(type: string, primaryKey: Realm.PrimaryKey) {
    const realm = useRealm();
    const [error, setError] = useState<Error | null>(null);
    const [object, setObject] = useState<(T & Realm.Object) | null>(
      realm.objectForPrimaryKey(type, primaryKey) ?? null,
    );

    try {
      useEffect(() => {
        object?.addListener((_, changes) => {
          if (changes.changedProperties.length > 0) {
            setObject(realm.objectForPrimaryKey(type, primaryKey) ?? null);
          } else if (changes.deleted) {
            setObject(null);
          }
        });
        return () => object?.removeAllListeners();
      }, [object, type, primaryKey]);
    } catch (err) {
      console.error(err);
      setError(err as Error);
    }

    return { error, data: object };
  }
  return useObject;
}
