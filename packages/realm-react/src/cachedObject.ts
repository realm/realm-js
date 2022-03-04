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

/**
 * Arguments object for `cachedObject`.
 */
type CachedObjectArgs<T> = {
  /**
   * The {@link Realm.Object} to proxy
   */
  object: T | null;
  /**
   * Callback function called whenver the object changes. Used to force a component
   * using the {@link useObject} hook to re-render.
   */
  updateCallback: () => void;
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
  object,
  updateCallback,
}: {
  object: T | null;
  updateCallback: () => void;
}): { object: T | null; tearDown: () => void } {
  const listCaches = new Map();
  const listTearDowns: Array<() => void> = [];
  // If the object doesn't exist, just return it with an noop tearDown
  if (object === null) {
    return { object, tearDown: () => undefined };
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
        const { collection, tearDown } = createCachedCollection({ collection: value, updateCallback });
        // Add to a list of teardowns which will be invoked when the cachedObject's teardown is called
        listTearDowns.push(tearDown);
        // Store the proxied list into a map to persist the cachedCollection
        listCaches.set(key, collection);
        return collection;
      }
      return value;
    },
  };

  const cachedObjectResult = new Proxy(object, cachedObjectHandler);
  const listenerCallback: Realm.ObjectChangeCallback<T> = (obj, changes) => {
    if (changes.deleted) {
      updateCallback();
    } else if (changes.changedProperties.length > 0) {
      // Don't force a second re-render if any of the changed properties is a Realm.List,
      // as the List's cachedCollection will force a re-render itself
      const anyListPropertyModified = changes.changedProperties.some((property) => {
        return obj[property as keyof T] instanceof Realm.List;
      });
      const shouldRerender = !anyListPropertyModified;

      if (shouldRerender) {
        updateCallback();
      }
    }
  };

  object.addListener(listenerCallback);

  const tearDown = () => {
    object.removeListener(listenerCallback);
    listTearDowns.forEach((listTearDown) => listTearDown());
  };

  return { object: cachedObjectResult, tearDown };
}
