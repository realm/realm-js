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
import { useState, useEffect } from "react";

type PrimaryKey = Parameters<typeof Realm.prototype.objectForPrimaryKey>[1];

export function createUseObject(useRealm: () => Realm | null) {
  return function useObject<T>(type: string, primaryKey: PrimaryKey): (T & Realm.Object) | null {
    const realm = useRealm();
    const [object, setObject] = useState<(T & Realm.Object) | null>(
      realm?.objectForPrimaryKey(type, primaryKey) ?? null,
    );

    useEffect(() => {
      object?.addListener((_, changes) => {
        if (changes.changedProperties.length > 0) {
          setObject(realm?.objectForPrimaryKey(type, primaryKey) ?? null);
        } else if (changes.deleted) {
          setObject(null);
        }
      });
      return () => object?.removeAllListeners();
    }, [object, type, primaryKey]);

    return object;
  };
}
