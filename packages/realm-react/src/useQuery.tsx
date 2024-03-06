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

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import Realm from "realm";

import { createCachedCollection } from "./cachedCollection";
import { AnyRealmObject, RealmClassType, getObjects, isClassModelConstructor } from "./helpers";

export type QueryCallback<T> = (collection: Realm.Results<T>) => Realm.Results<T>;
export type DependencyList = ReadonlyArray<unknown>;

export type QueryHookOptions<T> = {
  type: string;
  query?: QueryCallback<T>;
  keyPaths?: string | string[];
};

export type QueryHookClassBasedOptions<T extends AnyRealmObject> = {
  type: RealmClassType<T>;
  query?: QueryCallback<T>;
  keyPaths?: string | string[];
};

/**
 * Returns a {@link Realm.Collection} of {@link Realm.Object}s from a given type.
 * The hook will update on any changes to any object in the collection
 * and return an empty array if the collection is empty.
 *
 * The result of this can be consumed directly by the `data` argument of any React Native
 * VirtualizedList or FlatList.  If the component used for the list's `renderItem` prop is memoized,
 * then only the modified object will re-render.
 * @example
 * ```tsx
 * // Return all collection items
 * const collection = useQuery({ type: Object });
 *
 * // Return all collection items sorted by name and filtered by category
 * const filteredAndSorted = useQuery({
 *   type: Object,
 *   query: (collection) => collection.filtered('category == $0',category).sorted('name'),
 * }, [category]);
 *
 * // Return all collection items sorted by name and filtered by category, triggering re-renders only if "name" changes
 * const filteredAndSorted = useQuery({
 *   type: Object,
 *   query: (collection) => collection.filtered('category == $0',category).sorted('name'),
 *   keyPaths: ["name"]
 * }, [category]);
 * ```
 * @param options
 * @param options.type - The object type, depicted by a string or a class extending Realm.Object
 * @param options.query - A function that takes a {@link Realm.Collection} and returns a {@link Realm.Collection} of the same type. This allows for filtering and sorting of the collection, before it is returned.
 * @param options.keyPaths - Indicates a lower bound on the changes relevant for the hook. This is a lower bound, since if multiple hooks add listeners (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the collection. In other words: A listener might fire and cause a re-render more than the key-paths specify, if other listeners with different key-paths are present.
 * @param deps - An array of dependencies that will be passed to {@link useMemo}
 * @returns a collection of realm objects or an empty array
 */
export interface UseQueryHook {
  /** ... */
  <T>(options: QueryHookOptions<T>, deps?: DependencyList): Realm.Results<T & Realm.Object<T>>;
  /** ... */
  <T extends AnyRealmObject>(options: QueryHookClassBasedOptions<T>, deps?: DependencyList): Realm.Results<T>;
  /** ... */
  <T>(type: string): Realm.Results<T & Realm.Object<T>>;
  /** ... */
  <T extends AnyRealmObject>(type: RealmClassType<T>): Realm.Results<T>;

  /** @deprecated To help the `react-hooks/exhaustive-deps` eslint rule detect missing dependencies, we've suggest passing a option object as the first argument */
  <T>(type: string, query?: QueryCallback<T>, deps?: DependencyList): Realm.Results<T & Realm.Object<T>>;
  /** @deprecated To help the `react-hooks/exhaustive-deps` eslint rule detect missing dependencies, we've suggest passing a option object as the first argument */
  <T extends AnyRealmObject>(
    type: RealmClassType<T>,
    query?: QueryCallback<T>,
    deps?: DependencyList,
  ): Realm.Results<T>;
}

/**
 * Maps a value to itself
 */
function identity<T>(value: T): T {
  return value;
}

/**
 * Generates the `useQuery` hook from a given `useRealm` hook.
 * @param useRealm - Hook that returns an open Realm instance
 * @returns useObject - Hook that is used to gain access to a {@link Realm.Collection}
 */
export function createUseQuery(useRealm: () => Realm): UseQueryHook {
  function useQuery<T extends AnyRealmObject>(
    { type, query = identity, keyPaths }: QueryHookOptions<T> | QueryHookClassBasedOptions<T>,
    deps: DependencyList = [],
  ): Realm.Results<T> {
    const realm = useRealm();

    // We need to add the type to the deps, so that if the type changes, the query will be re-run.
    // This will be saved in an array which will be spread into the provided deps.
    const requiredDeps = [type];

    // Create a forceRerender function for the cachedCollection to use as its updateCallback, so that
    // the cachedCollection can force the component using this hook to re-render when a change occurs.
    const [, forceRerender] = useReducer((x) => x + 1, 0);
    const collectionRef = useRef<Realm.Results<T>>();
    const updatedRef = useRef(true);
    const queryCallbackRef = useRef<QueryCallback<T> | null>(null);

    /* eslint-disable-next-line react-hooks/exhaustive-deps -- We want the user of this hook to be able pass in the `query` function inline (without the need to `useCallback` on it)
    This means that the query function is unstable and will be a redefined on each render of the component where `useQuery` is used
    Therefore we use the `deps` array to memoize the query function internally, and only use the returned `queryCallback` */
    const queryCallback = useCallback(query, [...deps, ...requiredDeps]);

    // If the query function changes, we need to update the cachedCollection
    if (queryCallbackRef.current !== queryCallback) {
      queryCallbackRef.current = queryCallback;
      updatedRef.current = true;
    }

    const queryResult = useMemo(() => {
      return queryCallback(getObjects(realm, type));
    }, [type, realm, queryCallback]);

    const memoizedKeyPaths = useMemo(
      () => (typeof keyPaths === "string" ? [keyPaths] : keyPaths),
      /* eslint-disable-next-line react-hooks/exhaustive-deps -- Memoizing the keyPaths to avoid renders */
      [JSON.stringify(keyPaths)],
    );

    // Wrap the cachedObject in useMemo, so we only replace it with a new instance if `realm` or `queryResult` change
    const { collection, tearDown } = useMemo(() => {
      return createCachedCollection<T>({
        collection: queryResult,
        realm,
        updateCallback: forceRerender,
        updatedRef,
        keyPaths: memoizedKeyPaths,
      });
    }, [realm, queryResult, memoizedKeyPaths]);

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

  return function useQueryOverload<T extends AnyRealmObject>(
    typeOrOptions: QueryHookOptions<T> | QueryHookClassBasedOptions<T> | string | RealmClassType<T>,
    queryOrDeps: DependencyList | QueryCallback<T> = identity,
    deps: DependencyList = [],
  ): Realm.Results<T> {
    if (typeof typeOrOptions === "string" && typeof queryOrDeps === "function") {
      /* eslint-disable-next-line react-hooks/rules-of-hooks -- We're calling `useQuery` once in any of the brances */
      return useQuery({ type: typeOrOptions, query: queryOrDeps }, deps);
    } else if (isClassModelConstructor(typeOrOptions) && typeof queryOrDeps === "function") {
      /* eslint-disable-next-line react-hooks/rules-of-hooks -- We're calling `useQuery` once in any of the brances */
      return useQuery({ type: typeOrOptions as RealmClassType<T>, query: queryOrDeps }, deps);
    } else if (typeof typeOrOptions === "object" && typeOrOptions !== null) {
      /* eslint-disable-next-line react-hooks/rules-of-hooks -- We're calling `useQuery` once in any of the brances */
      return useQuery(typeOrOptions, Array.isArray(queryOrDeps) ? queryOrDeps : deps);
    } else {
      throw new Error("Unexpected arguments passed to useQuery");
    }
  };
}
