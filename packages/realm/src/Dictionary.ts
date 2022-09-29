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
import { assert } from "./assert";
import * as binding from "./binding";
import { Collection } from "./Collection";
import { INTERNAL } from "./internal";
import { Object as RealmObject } from "./Object";

// TODO: Implement this

type DictionaryChangeSet = {
  deletions: string[];
  modifications: string[];
  insertions: string[];
};
type DictionaryChangeCallback = (dictionary: Dictionary, changes: DictionaryChangeSet) => void;

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: true };
const PROXY_HANDLER: ProxyHandler<Dictionary> = {
  get(target, prop, receiver) {
    const internal = target[INTERNAL];
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "undefined" && typeof prop === "string") {
      return internal.tryGetAny(prop);
    } else {
      return value;
    }
  },
  set(target, prop, value) {
    const internal = target[INTERNAL];
    if (typeof prop === "string") {
      if (value instanceof RealmObject) {
        internal.insertAny(prop, value[INTERNAL]);
      } else {
        internal.insertAny(prop, value);
      }
      return true;
    } else {
      return false;
    }
  },
  ownKeys(target) {
    const internal = target[INTERNAL];
    const result: (string | symbol)[] = Reflect.ownKeys(target);
    const keys = internal.keys.snapshot();
    for (let i = 0; i < keys.size(); i++) {
      const key = keys.getAny(i);
      assert.string(key, "dictionary key");
      result.push(key);
    }
    return result;
  },
  getOwnPropertyDescriptor(target, prop) {
    const internal = target[INTERNAL];
    if (typeof prop === "string" && internal.contains(prop)) {
      return DEFAULT_PROPERTY_DESCRIPTOR;
    } else {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  },
};

/**
 * TODO: Make this extends Collection<T> (once that doesn't have a nummeric index accessor)
 */
export class Dictionary<T = unknown> extends Collection<T, DictionaryChangeCallback> {
  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   * @param internal The internal representation of the dictionary.
   */
  constructor(internal: binding.Dictionary) {
    super(() => {
      throw new Error("Not yet implemented!");
    });

    Object.defineProperties(this, {
      [INTERNAL]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
    });

    return new Proxy(this, PROXY_HANDLER) as Dictionary<T>;
  }

  /**
   * The representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.Dictionary;

  // @ts-expect-error Collection is declaring types that doesn't match the index access
  [key: string]: T;

  /**
   * Adds given element to the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the users value namespace
  set(element: { [key: string]: T }): this {
    throw new Error("Not yet implemented");
  }

  /**
   * Removes given element from the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the users value namespace
  remove(key: string | string[]): this {
    throw new Error("Not yet implemented");
  }
}
