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
import { IllegalConstructorError } from "./errors";
import { INTERNAL } from "./internal";
import { DefaultObject } from "./schema";
import { Object as RealmObject } from "./Object";
import { TypeHelpers } from "./types";
import { JSONCacheMap } from "./JSONCacheMap";

const HELPERS = Symbol("Dictionary#helpers");

// TODO: Implement this

type DictionaryChangeSet = {
  deletions: string[];
  modifications: string[];
  insertions: string[];
};
type DictionaryChangeCallback = (dictionary: Dictionary, changes: DictionaryChangeSet) => void;

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true };
const PROXY_HANDLER: ProxyHandler<Dictionary> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "undefined" && typeof prop === "string") {
      const internal = target[INTERNAL];
      const fromBinding = target[HELPERS].fromBinding;
      return fromBinding(internal.tryGetAny(prop));
    } else {
      return value;
    }
  },
  set(target, prop, value) {
    if (typeof prop === "string") {
      const internal = target[INTERNAL];
      const toBinding = target[HELPERS].toBinding;
      internal.insertAny(prop, toBinding(value));
      /*
      if (value instanceof RealmObject) {
        internal.insertAny(prop, value[INTERNAL]);
      } else {
        internal.insertAny(prop, value);
      }
      */
      return true;
    } else {
      return false;
    }
  },
  deleteProperty(target, prop) {
    if (typeof prop === "string") {
      const internal = target[INTERNAL];
      return internal.tryErase(prop);
    } else {
      return false;
    }
  },
  ownKeys(target) {
    const internal = target[INTERNAL];
    const result: (string | symbol)[] = Reflect.ownKeys(target);
    // assert(internal.isValid, "Expected a valid dicitonary");
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
      return {
        ...DEFAULT_PROPERTY_DESCRIPTOR,
        get: PROXY_HANDLER.get?.bind(null, target, prop, null),
        set: PROXY_HANDLER.set?.bind(null, target, prop, null),
      };
    } else {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  },
};

/**
 * TODO: Make this extends Collection<T> (once that doesn't have a nummeric index accessor)
 */
export class Dictionary<T = unknown> extends Collection<string, T, [string, T], DictionaryChangeCallback> {
  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   * @param internal The internal representation of the dictionary.
   */
  constructor(internal: binding.Dictionary, helpers: TypeHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.Dictionary)) {
      throw new IllegalConstructorError("Dictionary");
    }
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

    this[HELPERS] = helpers;

    return new Proxy(this, PROXY_HANDLER) as Dictionary<T>;
  }

  /**
   * The representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.Dictionary;

  /**
   * @internal
   */
  public [HELPERS]: TypeHelpers;

  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  [key: string]: T;

  *[Symbol.iterator]() {
    yield* this.entries();
  }

  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  *keys() {
    const snapshot = this[INTERNAL].keys.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const key = snapshot.getAny(i);
      assert.string(key);
      yield key;
    }
  }

  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  *values() {
    const { fromBinding } = this[HELPERS];
    const snapshot = this[INTERNAL].values.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const value = snapshot.getAny(i);
      yield fromBinding(value) as T;
    }
  }

  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  *entries() {
    const { fromBinding } = this[HELPERS];
    const snapshot = this[INTERNAL].snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const [key, value] = snapshot.getDictionaryElement(i);
      yield [key, fromBinding(value)] as [string, T];
    }
  }

  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  isValid() {
    return this[INTERNAL].isValid;
  }

  /**
   * Adds given element to the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  set(element: { [key: string]: T }): this {
    const internal = this[INTERNAL];
    const toBinding = this[HELPERS].toBinding;
    for (const [key, value] of Object.entries(element)) {
      internal.insertAny(key, toBinding(value));
    }
  }

  /**
   * Removes given element from the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the end-users namespace of keys
  remove(key: string | string[]): this {
    const internal = this[INTERNAL];
    const keys = typeof key === "string" ? [key] : key;
    const missingKeys: string[] = [];
    for (const k of keys) {
      const success = internal.tryErase(k);
      if (!success) {
        missingKeys.push(k);
      }
    }
    if (missingKeys.length > 0) {
      const keysSummary = missingKeys.map((k) => `'${k}'`).join(", ");
      const keySuffix = missingKeys.length > 0 ? "s" : "";
      throw new Error(`Failed to remove missing key${keySuffix} from dictionary: ${keysSummary}`);
    }
  }

  /**
   * @returns A plain object for JSON serialization.
   **/
  // @ts-expect-error We're exposing methods in the users value namespace
  toJSON(_?: string, cache = new JSONCacheMap()): DefaultObject {
    return Object.fromEntries(
      Object.entries(this).map(([k, v]) => [k, v instanceof RealmObject ? v.toJSON(k, cache) : v]),
    );
  }
}
