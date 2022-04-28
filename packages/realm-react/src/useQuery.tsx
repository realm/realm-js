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
import { createCachedCollection } from "./cachedCollection";
import { symbols } from "@realm.io/common";

/**
 * Generates the `useQuery` hook from a given `useRealm` hook.
 *
 * @param useRealm - Hook that returns an open Realm instance
 * @returns useObject - Hook that is used to gain access to a {@link Realm.Collection}
 */
export function createUseQuery(useRealm: () => Realm) {
  /**
   * Returns a {@link Realm.Collection} of {@link Realm.Object}s from a given type.
   * The hook will update on any changes to any object in the collection
   * and return an empty array if the colleciton is empty.
   *
   * The result of this can be consumed directly by the `data` argument of any React Native
   * VirtualizedList or FlatList.  If the component used for the list's `renderItem` prop is {@link React.Memo}ized,
   * then only the modified object will re-render.
   *
   * @example
   * ```
   * const collection = useQuery(Object);
   *
   * // The methods `sorted` and `filtered` should be wrapped in a useMemo.
   * const sortedCollection = useMemo(collection.sorted(), [collection]);
   * ```
   *
   * @param type - The object type, depicted by a string or a class extending Realm.Object
   * @returns a collection of realm objects or an empty array
   */
  return function useQuery<T>(type: string | ({ new (): T } & Realm.ObjectClass)): Realm.Results<T & Realm.Object> {
    const realm = useRealm();

    // Create a forceRerender function for the cachedCollection to use as its updateCallback, so that
    // the cachedCollection can force the component using this hook to re-render when a change occurs.
    const [, forceRerender] = useReducer((x) => x + 1, 0);

    // Wrap the cachedObject in useMemo, so we only replace it with a new instance if `primaryKey` or `type` change
    const { collection, tearDown } = useMemo(
      () => createCachedCollection({ collection: realm.objects(type), realm, updateCallback: forceRerender }),
      [type, realm],
    );

    // Invoke the tearDown of the cachedCollection when useQuery is unmounted
    useEffect(() => {
      return tearDown;
    }, [tearDown]);

    // This makes sure the collection has a different reference on a rerender
    // Also we are ensuring the type returned is Realm.Results, as this is known in this context
    const proxy = new Proxy(collection as Realm.Results<T & Realm.Object>, {});

    // Store the original, unproxied result as a non-enumerable field with a symbol
    // key on the proxy object, so that we can check for this and get the original results
    // when passing the result of `useQuery` into the subscription mutation methods
    // (see `lib/mutable-subscription-set.js` for more details)
    Object.defineProperty(proxy, symbols.REALM_REACT_PROXIED_OBJECT, {
      value: realm.objects(type),
      enumerable: false,
      configurable: false,
      writable: true,
    });

    return proxy;
  };
}
