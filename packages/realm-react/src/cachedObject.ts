import { useState } from "react";
////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { createCachedCollection } from "./cachedCollection";
import { useEffect, useState } from "react";

type PrimaryKey = Parameters<typeof Realm.prototype.objectForPrimaryKey>[1];

type ObjectCacheKey = `${string}-${string}`;
type ObjectCache = Map<ObjectCacheKey, CachedObject>;

const objectCache: ObjectCache = new Map();

type CachedObject<T = {}> = Realm.Object &
  T & {
    subscribe: (val: T) => () => void;
    useObject: (type: string, primaryKey: string) => T;
  };

export function getOrCreateCachedObject<T>(realm: Realm, type: string, primaryKey: PrimaryKey) {
  let object = objectCache.get(`${type}-${primaryKey}`);
  if (!object) {
    object = createCachedObject({ realm, type, primaryKey });
  }
  return object;
}

/**
 * Arguments object for `cachedObject`.
 */
type CachedObjectArgs<T> = {
  realm: Realm;
  type: string;
  primaryKey: PrimaryKey;
};

/**
 * Creates a proxy around a {@link Realm.Object} that will return a new reference
 * on any relevant update to the object itself. It also wraps accesses to {@link Realm.List}
 * attributes into a {@link cachedCollection}, so that any update, insert or deletion to the
 * list will also return a new object reference.
 *
 * See {@link cachedCollection} and the `useObject` hook for description of how this
 * helps prevent unnecessary rendering.
 *
 * @param args - {@link CachedObjectArgs} object arguments
 * @returns Proxy object wrapping the {@link Realm.Object}
 */
export function createCachedObject<T extends Realm.Object>({
  realm,
  type,
  primaryKey,
}: CachedObjectArgs<T>): { object: T | null; tearDown: () => void } {
  // If the object doesn't exist, just return it with an noop tearDown
  const object = realm.objectForPrimaryKey(type, primaryKey);
  if (object === null) {
    // TODO: listen to collection, wait for this object to be inserted
    return { object, tearDown: () => undefined };
  }

  const listCaches = new Map();
  const listTearDowns: Array<() => void> = [];
  const listeners: Set<(x: CachedObject<T>) => void> = new Set();
  const objectCacheKey: ObjectCacheKey = `${type}-${primaryKey}`;
  let isRealmListenerSetup = true;
  let tearDownRealmListener = () => {};

  function subscribe(listener: (x: CachedObject<T>) => void) {
    if (!isRealmListenerSetup) setupRealmListener();
    listeners.add(listener);
    return function unsubscribe () {
      listeners.delete(listener);
      if (listeners.size === 0) {
        objectCache.delete(objectCacheKey);
        tearDownRealmListener();
        isRealmListenerSetup = false;
      }
    };
  }

  function useObject() {
    const [obj, setObj] = useState<CachedObject<T>>(() => cachedObjectResult);
    useEffect(() => subscribe((x) => setObj(x)), []);
    return obj;
  }

  function notifyListeners() {
    for (const listener of listeners) {
      listener(cachedObjectResult);
    }
  }

  // This Proxy handler intercepts any accesses into properties of the cached object
  // of type `Realm.List`, and returns a `cachedCollection` wrapping those properties
  // to allow changes in the list to trigger re-renders
  const cachedObjectHandler: ProxyHandler<T & Realm.Object> = {
    get: function (target, key) {
      if (key === "subscribe") return subscribe;
      if (key === "useObject") return useObject;
      if (key === "tearDown") return tearDownRealmListener;

      const value = Reflect.get(target, key);
      // Pass methods through
      if (typeof value === "function") {
        return value.bind(target);
      }

      // If its a Realm.List we need to add a proxy cache around it
      if (value instanceof Realm.List) {
        if (listCaches.has(key)) {
          // Return a new proxy wrapping the cachedCollection so that its reference gets updated,
          // otherwise the list component will not re-render. The cachedCollection then ensures that
          // only the modified children of the list component actually re-render.
          return new Proxy(listCaches.get(key), {});
        }
        const cachedCollection = createCachedCollection({
          realm,
          collection: value,
          updateCallback: () => {
            cachedObjectResult = new Proxy(object, cachedObjectHandler);
            notifyListeners();
          },
        });
        // Add to a list of teardowns which will be invoked when the cachedObject's teardown is called
        listTearDowns.push(cachedCollection.tearDown);
        // Store the proxied list into a map to persist the cachedCollection
        listCaches.set(key, cachedCollection.collection);
        return cachedCollection.collection;
      }
      return value;
    },
  };

  let cachedObjectResult: CachedObject<T> | null = new Proxy(object, cachedObjectHandler);
  const listenerCallback: Realm.ObjectChangeCallback<T> = (obj, changes) => {
    if (changes.deleted) {
      // TODO: listen to collection, wait for this object to be inserted
      cachedObjectResult = null;
      notifyListeners();
    } else if (changes.changedProperties.length > 0) {
      // Don't force a second re-render if any of the changed properties is a Realm.List,
      // as the List's cachedCollection will force a re-render itself
      const anyListPropertyModified = changes.changedProperties.some((property) => {
        return obj[property as keyof T] instanceof Realm.List;
      });
      const shouldRerender = !anyListPropertyModified;

      if (shouldRerender) {
        cachedObjectResult = new Proxy(object, cachedObjectHandler);
        notifyListeners();
      }
    }
  };

  function setupRealmListener() {
    // We cannot add a listener to an invalid object
    if (!object?.isValid()) return;

    if (realm.isInTransaction) {
      // If we are in a transaction, then push adding the listener to the event loop.  This will allow the write transaction to finish.
      // see https://github.com/realm/realm-js/issues/4375
      setImmediate(() => object.addListener(listenerCallback));
    } else {
      object.addListener(listenerCallback);
    }
    objectCache.set(objectCacheKey, cachedObjectResult);
    tearDownRealmListener = () => {
      object.removeListener(listenerCallback);
      listTearDowns.forEach((listTearDown) => listTearDown());
    };
    isRealmListenerSetup = true;
  }

  return cachedObjectResult;
}
