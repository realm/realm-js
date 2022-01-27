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
import { cachedCollection } from "./cachedCollection";

type IndexibleRealmObject = Realm.Object & { [key: string]: unknown };

export function cachedObject<T extends Realm.Object>(
  object: T | null,
  updateCallback: () => void,
  listCaches = new Map(),
  listTeardowns: (() => void)[] = [],
): { object: (T & Realm.Object) | null; tearDown: () => void } {
  // If the object doesn't exists, just return it with an noop tearDown
  if (object === null) {
    return { object, tearDown: () => undefined };
  }

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
          // Return in a new proxy so that the reference gets updated (otherwise it will not rerender)
          return new Proxy(listCaches.get(key), {});
        }
        const { collection, tearDown } = cachedCollection(value, updateCallback);
        // Add to a list of teardowns which will be invoked when the cachedObjects teardown is called
        listTeardowns.push(tearDown);
        // Store the proxied list into a map to persist the cachedCollection
        listCaches.set(key, collection);
        return collection;
      }
      return value;
    },
  };

  const cachedObjectResult = new Proxy(object, cachedObjectHandler);
  const listenerCallback: Realm.ObjectChangeCallback = (obj, changes) => {
    if (changes.deleted) {
      updateCallback();
    } else if (changes.changedProperties.length > 0) {
      // Skip the rerender callback if any single property is a Realm.List
      // Otherwise we will rerender twice
      const shouldRerender = changes.changedProperties.every((property) => {
        return !(obj[property as keyof T] instanceof Realm.List);
      });
      if (shouldRerender) {
        updateCallback();
      }
    }
  };

  object.addListener(listenerCallback);

  const tearDown = () => {
    object.removeListener(listenerCallback);
    listTeardowns.forEach((listTearDown) => listTearDown());
  };

  return { object: cachedObjectResult, tearDown };
}
