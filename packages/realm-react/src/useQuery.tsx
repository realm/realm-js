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
import { useEffect, useReducer, useMemo, useRef, useCallback } from "react";
import { createCachedCollection } from "./cachedCollection";
import { getObjects } from "./helpers";

type RealmClassType<T> = { new (...args: any): T } & Realm.ObjectClass;
type QueryCallback<T> = (collection: Realm.Results<T>) => Realm.Results<T>;
type DependencyList = ReadonlyArray<unknown>;

/**
 * Generates the `useQuery` hook from a given `useRealm` hook.
 *
 * @param useRealm - Hook that returns an open Realm instance
 * @returns useObject - Hook that is used to gain access to a {@link Realm.Collection}
 */
export function createUseQuery(useRealm: () => Realm) {
  function useQuery<T>(
    type: string,
    query?: QueryCallback<T>,
    deps?: DependencyList,
  ): Realm.Results<T & Realm.Object<T>>;
  function useQuery<T extends Realm.Object<any>>(
    type: RealmClassType<T>,
    query?: QueryCallback<T>,
    deps?: DependencyList,
  ): Realm.Results<T>;
  function useQuery<T extends Realm.Object>(
    type: string | RealmClassType<T>,
    query: QueryCallback<T> = (collection) => collection,
    deps: DependencyList = [],
  ): Realm.Results<T> {
    const realm = useRealm();

    // Create a forceRerender function for the cachedCollection to use as its updateCallback, so that
    // the cachedCollection can force the component using this hook to re-render when a change occurs.
    const [, forceRerender] = useReducer((x) => x + 1, 0);
    const collectionRef = useRef<Realm.Results<T>>();
    const updatedRef = useRef(true);
    const queryCallbackRef = useRef<QueryCallback<T> | null>(null);

    // We want the user of this hook to be able pass in the `query` function inline (without the need to `useCallback` on it)
    // This means that the query function is unstable and will be a redefined on each render of the component where `useQuery` is used
    // Therefore we use the `deps` array to memoize the query function internally, and only use the returned `queryCallback`
    const queryCallback = useCallback(query, deps);

    // If the query function changes, we need to update the cachedCollection
    if (queryCallbackRef.current !== queryCallback) {
      queryCallbackRef.current = queryCallback;
      updatedRef.current = true;
    }

    const queryResult = useMemo(() => {
      return queryCallback(getObjects(realm, type));
    }, [type, realm, queryCallback]);

    // Wrap the cachedObject in useMemo, so we only replace it with a new instance if `realm` or `queryResult` change
    const { collection, tearDown } = useMemo(() => {
      return createCachedCollection<T>({
        collection: queryResult,
        realm,
        updateCallback: forceRerender,
        updatedRef,
      });
    }, [realm, queryResult]);

    // Invoke the tearDown of the cachedCollection when useQuery is unmounted
    useEffect(() => {
      return tearDown;
    }, [tearDown]);

    // This makes sure the collection has a different reference on a rerender
    // Also we are ensuring the type returned is Realm.Results, as this is known in this context
    if (updatedRef.current) {
      updatedRef.current = false;
      collectionRef.current = new Proxy(collection as Realm.Results<T & Realm.Object>, {});
    }

    // This will never not be defined, but the type system doesn't know that
    return collectionRef.current as Realm.Results<T>;
  }
  return useQuery;
}
