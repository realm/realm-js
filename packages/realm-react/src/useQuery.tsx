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
import { cachedCollection } from "./cachedCollection";

export function createUseQuery(useRealm: () => Realm) {
  return function useQuery<T>(type: string | ({ new (): T } & Realm.ObjectClass)): Realm.Results<T & Realm.Object> {
    const realm = useRealm();
    const [, forceRerender] = useReducer((x) => x + 1, 0);
    const { collection, tearDown } = useMemo(
      () => cachedCollection({ collection: realm.objects(type), updateCallback: forceRerender }),
      [type, realm],
    );

    useEffect(() => {
      return () => {
        tearDown();
      };
    }, [tearDown]);

    // This makes sure the collection has a different reference on a rerender
    // Also we are ensuring the type returned is Realm.Results, as this is known in this context
    return new Proxy(collection as Realm.Results<T & Realm.Object>, {});
  };
}
