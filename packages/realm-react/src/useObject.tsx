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
import { useEffect, useReducer, useMemo } from "react";
import { cachedObject } from "./cachedObject";

// In order to make @realm/react work with older version of realms
// This pulls the type for PrimaryKey out of the call signature of `objectForPrimaryKey`
// TODO: If we depend on a new version of Realm for @realm/react, we can just use Realm.PrimaryKey
type PrimaryKey = Parameters<typeof Realm.prototype.objectForPrimaryKey>[1];

export function createUseObject(useRealm: () => Realm) {
  return function useObject<T extends Realm.Object>(type: string | { new (): T }, primaryKey: PrimaryKey): T | null {
    const realm = useRealm();

    // Create a forceRerender method so that the cachedObject can determine a relevant change has occured
    const [, forceRerender] = useReducer((x) => x + 1, 0);

    // Wrap this in useMemo to update if the primaryKey or type is somehow dynamic
    const { object, tearDown } = useMemo(
      // TODO: There will be an upcoming breaking change that makes objectForPrimaryKey return null
      // When this is implemented, remove `?? null`
      () => cachedObject(realm.objectForPrimaryKey(type, primaryKey) ?? null, forceRerender),
      [type, realm, primaryKey],
    );

    // Invoke the tearDown of the cachedObject when useObject is unmounted
    useEffect(() => {
      return () => tearDown();
    }, [tearDown]);

    // If the object has been deleted or doesn't exist for the given primary key, just return null
    if (object === null || object?.isValid() === false) {
      return null;
    }

    // Wrap object in a proxy to update the reference on rerender ( should only rerender when something has changed )
    return new Proxy(object, {});
  };
}
