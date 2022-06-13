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
type ObjectCache = Map<ObjectCacheKey, CachedObject<any>>;

const objectCache: ObjectCache = new Map();

type CachedObject<T> = {
  subscribe: (listener: (val: (T & Realm.Object) | undefined) => void) => () => void;
  useObject: (type: string, primaryKey: string) => (T & Realm.Object) | undefined;
  readonly object: (T & Realm.Object) | undefined;
};

export function getOrCreateCachedObject<T>(realm: Realm, type: string, primaryKey: PrimaryKey) {
  const objectCacheKey: ObjectCacheKey = `${type}-${primaryKey}`;
  let cachedObject = objectCache.get(objectCacheKey);
  if (!cachedObject) {
    cachedObject = createCachedObject({ realm, type, primaryKey });
  }
  objectCache.set(objectCacheKey, cachedObject);
  return cachedObject;
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
}: CachedObjectArgs<T>): CachedObject<T> {
  let object = realm.objectForPrimaryKey<T>(type, primaryKey);

  const listCaches = new Map();
  const listeners: Set<(x: (T & Realm.Object) | undefined) => void> = new Set();
  const objectCacheKey: ObjectCacheKey = `${type}-${primaryKey}`;
  let isRealmListenerSetup = true;
  let realmListenerTearDowns: Array<() => void> = [];
  let objectProxy: (T & Realm.Object) | undefined;

  function subscribe(listener: (x: (T & Realm.Object) | undefined) => void) {
    if (!isRealmListenerSetup) setupRealmListener();
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
      if (listeners.size === 0) {
        objectCache.delete(objectCacheKey);
        tearDownRealmListener();
        isRealmListenerSetup = false;
      }
    };
  }

  function tearDownRealmListener() {
    realmListenerTearDowns.forEach((x) => x());
    realmListenerTearDowns = [];
  }

  function useObject() {
    const [obj, setObj] = useState(objectProxy);
    useEffect(() => subscribe((x) => setObj(x)), []);
    return obj;
  }

  function setObject(newObject: (T & Realm.Object) | undefined) {
    object = newObject;
    objectProxy = newObject ? new Proxy(newObject, cachedObjectHandler) : undefined;
    for (const listener of listeners) {
      listener(newObject);
    }
    if (!object) {
      // Listen to collection, wait for this object to be inserted
      const pk = realm.schema.find((x) => x?.name === type)?.primaryKey;
      if (!pk) throw new Error(`Could not find primary key for type ${type}`);
      const collection = realm.objects<T>(type).filtered(`${pk} = $0`, primaryKey);
      const listener: Realm.CollectionChangeCallback<T & Realm.Object> = (collection, changes) => {
        if (changes.insertions.length > 0) {
          const insertedObject = collection[0];
          if (insertedObject) {
            removeListener();
            setObject(insertedObject);
          }
        }
      };
      collection.addListener(listener);
      const removeListener = () => collection.removeListener(listener);
      realmListenerTearDowns.push(removeListener);
    }
  }

  // This Proxy handler intercepts any accesses into properties of the cached object
  // of type `Realm.List`, and returns a `cachedCollection` wrapping those properties
  // to allow changes in the list to trigger re-renders
  const cachedObjectHandler: ProxyHandler<T & Realm.Object> = {
    get: function (target, key) {
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
          updateCallback: () => setObject(object),
        });
        // Add to a list of teardowns which will be invoked when the cachedObject's teardown is called
        realmListenerTearDowns.push(cachedCollection.tearDown);
        // Store the proxied list into a map to persist the cachedCollection
        listCaches.set(key, cachedCollection.collection);
        return cachedCollection.collection;
      }
      return value;
    },
  };

  const listenerCallback: Realm.ObjectChangeCallback<T> = (obj, changes) => {
    if (changes.deleted) {
      setObject(undefined);
    } else if (changes.changedProperties.length > 0) {
      // Don't force a second re-render if any of the changed properties is a Realm.List,
      // as the List's cachedCollection will force a re-render itself
      const anyListPropertyModified = changes.changedProperties.some((property) => {
        return obj[property as keyof T] instanceof Realm.List;
      });
      const shouldRerender = !anyListPropertyModified;

      if (shouldRerender) {
        setObject(object);
      }
    }
  };

  setObject(object);

  const cachedObject: CachedObject<T> = {
    subscribe,
    useObject,
    get object() {
      return objectProxy;
    },
  };

  async function setupRealmListener() {
    await waitUntilNoActiveTransaction(realm);

    // We cannot add a listener to an invalid object
    if (!object) return;
    if (!object?.isValid()) return;
    object.addListener(listenerCallback);
    realmListenerTearDowns.push(() => object!.removeListener(listenerCallback));
    isRealmListenerSetup = true;
  }

  return cachedObject;
}

function waitUntilNoActiveTransaction(realm: Realm) {
  // If we are in a transaction, then push adding the listener to the event loop.  This will allow the write transaction to finish.
  // see https://github.com/realm/realm-js/issues/4375
  if (realm.isInTransaction) return Promise.resolve();
  return new Promise((resolve) => setImmediate(resolve));
}
