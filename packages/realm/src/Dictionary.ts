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

import {
  AssertionError,
  Collection,
  DefaultObject,
  COLLECTION_HELPERS as HELPERS,
  IllegalConstructorError,
  JSONCacheMap,
  List,
  Realm,
  RealmObject,
  TypeHelpers,
  assert,
  binding,
  createListHelpers,
  insertIntoListInMixed,
  isJsOrRealmList,
} from "./internal";

/* eslint-disable jsdoc/multiline-blocks -- We need this to have @ts-expect-error located correctly in the .d.ts bundle */

const REALM = Symbol("Dictionary#realm");
const INTERNAL = Symbol("Dictionary#internal");

export type DictionaryChangeSet = {
  deletions: string[];
  modifications: string[];
  insertions: string[];
};

export type DictionaryChangeCallback<T = unknown> = (dictionary: Dictionary<T>, changes: DictionaryChangeSet) => void;

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true };
const PROXY_HANDLER: ProxyHandler<Dictionary> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "undefined" && typeof prop === "string") {
      return target[HELPERS].get(target[INTERNAL], prop);
    } else {
      return value;
    }
  },
  set(target, prop, value) {
    if (typeof prop === "string") {
      target[HELPERS].set(target[INTERNAL], prop, value);
      return true;
    } else {
      assert(typeof prop !== "symbol", "Symbols cannot be used as keys of a dictionary");
      return false;
    }
  },
  deleteProperty(target, prop) {
    // We're intentionally not checking !Reflect.has(target, prop) below to allow deletes to propagate for any key
    if (typeof prop === "string") {
      const internal = target[INTERNAL];
      internal.tryErase(prop);
      // We consider any key without a value as "deletable", the same way `const foo = {}; delete foo.bar;` returns true
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
 * Instances of this class are returned when accessing object properties whose type is `"Dictionary"`
 *
 * Dictionaries behave mostly like a JavaScript object i.e., as a key/value pair
 * where the key is a string.
 */
export class Dictionary<T = unknown> extends Collection<
  string,
  T,
  [string, T],
  [string, T],
  DictionaryChangeCallback<T>,
  DictionaryHelpers<T>
> {
  /** @internal */
  private declare [REALM]: Realm;

  /**
   * The representation in the binding.
   * @internal
   */
  private readonly [INTERNAL]: binding.Dictionary;

  /**
   * Create a `Results` wrapping a set of query `Results` from the binding.
   * @internal
   */
  constructor(realm: Realm, internal: binding.Dictionary, helpers: DictionaryHelpers<T>) {
    if (arguments.length === 0 || !(internal instanceof binding.Dictionary)) {
      throw new IllegalConstructorError("Dictionary");
    }
    super(helpers, (listener, keyPaths) => {
      return this[INTERNAL].addKeyBasedNotificationCallback(
        ({ deletions, insertions, modifications }) => {
          try {
            listener(proxied, {
              deletions: deletions.map((value) => {
                assert.string(value);
                return value;
              }),
              insertions: insertions.map((value) => {
                assert.string(value);
                return value;
              }),
              modifications: modifications.map((value) => {
                assert.string(value);
                return value;
              }),
            });
          } catch (err) {
            // Scheduling a throw on the event loop,
            // since throwing synchronously here would result in an abort in the calling C++
            setImmediate(() => {
              throw err;
            });
          }
        },
        keyPaths ? realm.internal.createKeyPathArray(internal.objectSchema.name, keyPaths) : keyPaths,
      );
    });

    const proxied = new Proxy(this, PROXY_HANDLER as ProxyHandler<this>);

    Object.defineProperty(this, REALM, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: realm,
    });

    this[INTERNAL] = internal;

    return proxied;
  }

  /** @ts-expect-error We're exposing methods in the end-users namespace of keys */
  [key: string]: T;

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.entries}
   * @returns An iterator with all entries in the dictionary.
   */
  *[Symbol.iterator](): Generator<[string, T]> {
    yield* this.entries();
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys Array.prototype.keys}
   * @returns An iterator with all values in the dictionary.
   * @since 10.5.0
   * @ts-expect-error We're exposing methods in the end-users namespace of keys */
  *keys(): Generator<string> {
    const snapshot = this[INTERNAL].keys.snapshot();
    const size = snapshot.size();
    for (let i = 0; i < size; i++) {
      const key = snapshot.getAny(i);
      assert.string(key);
      yield key;
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values Array.prototype.values}
   * @returns An iterator with all values in the dictionary.
   * @since 10.5.0
   * @ts-expect-error We're exposing methods in the end-users namespace of values */
  *values(): Generator<T> {
    const snapshot = this[INTERNAL].values.snapshot();
    const size = snapshot.size();

    const { snapshotGet } = this[HELPERS];
    for (let i = 0; i < size; i++) {
      yield snapshotGet(snapshot, i);
    }
  }

  /**
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries Array.prototype.entries}
   * @returns An iterator with all key/value pairs in the dictionary.
   * @since 10.5.0
   * @ts-expect-error We're exposing methods in the end-users namespace of entries */
  *entries(): Generator<[string, T]> {
    const keys = this[INTERNAL].keys.snapshot();
    const snapshot = this[INTERNAL].values.snapshot();
    const size = keys.size();
    assert(size === snapshot.size(), "Expected keys and values to equal in size");

    const { snapshotGet } = this[HELPERS];
    for (let i = 0; i < size; i++) {
      const key = keys.getAny(i);
      const value = snapshotGet(snapshot, i);
      yield [key, value] as [string, T];
    }
  }

  /**
   * Checks if this dictionary has not been deleted and is part of a valid Realm.
   * @returns `true` if the dictionary can be safely accessed.
   * @since 0.14.0
   * @ts-expect-error We're exposing methods in the end-users namespace of keys */
  isValid() {
    return this[INTERNAL].isValid;
  }

  /**
   * Adds one or more elements with specified key and value to the dictionary or updates value if key exists.
   * @param elements The object of element(s) to add.
   * @throws an {@link AssertionError} If not inside a write transaction, input object contains symbol keys or if any value violates types constraints.
   * @returns The dictionary.
   * @since 10.6.0
   * @ts-expect-error We're exposing methods in the end-users namespace of keys */
  set(elements: { [key: string]: T }): this;
  /**
   * Adds an element with the specified key and value to the dictionary or updates value if key exists.
   * @param key The key of the element to add.
   * @param value The value of the element to add.
   * @throws an {@link AssertionError} If not inside a write transaction, key is a symbol or if value violates type constraints.
   * @returns The dictionary.
   * @since 12.0.0
   */
  set(key: string, value: T): this;
  /**
   * Adds one or more elements with the specified key and value to the dictionary or updates value if key exists.
   * @param elementsOrKey - The element to add or the key of the element to add.
   * @param value - The value of the element to add.
   * @throws An {@link AssertionError} if not inside a write transaction, if using symbol as keys, or if any value violates type constraints.
   * @returns The dictionary.
   * @since 10.6.0
   */
  set(elementsOrKey: string | { [key: string]: T }, value?: T): this {
    assert.inTransaction(this[REALM]);
    const elements = typeof elementsOrKey === "object" ? elementsOrKey : { [elementsOrKey]: value };
    assert(Object.getOwnPropertySymbols(elements).length === 0, "Symbols cannot be used as keys of a dictionary");

    const internal = this[INTERNAL];
    const { set } = this[HELPERS];
    const entries = Object.entries(elements);
    for (const [key, value] of entries) {
      set(internal, key, value!);
    }
    return this;
  }

  /**
   * Removes elements from the dictionary, with the keys provided.
   * This does not throw if the keys are already missing from the dictionary.
   * @param key - The key to be removed.
   * @throws An {@link AssertionError} if not inside a write transaction.
   * @returns The dictionary
   * @since 10.6.0
   * @ts-expect-error We're exposing methods in the end-users namespace of keys */
  remove(key: string | string[]): this {
    assert.inTransaction(this[REALM]);
    const internal = this[INTERNAL];
    const keys = typeof key === "string" ? [key] : key;
    for (const k of keys) {
      internal.tryErase(k);
    }
    return this;
  }

  /**
   * The plain object representation for JSON serialization.
   * Use circular JSON serialization libraries such as [@ungap/structured-clone](https://www.npmjs.com/package/@ungap/structured-clone)
   * and [flatted](https://www.npmjs.com/package/flatted) to stringify Realm entities that have circular structures.
   * @returns A plain object.
   * @ts-expect-error We're exposing methods in the end-users namespace of keys */
  toJSON(_?: string, cache?: unknown): DefaultObject;
  /** @internal */
  toJSON(_?: string, cache = new JSONCacheMap()): DefaultObject {
    return Object.fromEntries(
      Object.entries(this).map(([k, v]) => [k, v instanceof RealmObject ? v.toJSON(k, cache) : v]),
    );
  }
}

/**
 * Helpers for getting and setting dictionary entries, as well as
 * converting the values to and from their binding representations.
 * @internal
 */
export type DictionaryHelpers<T = unknown> = TypeHelpers<T> & {
  get: (dictionary: binding.Dictionary, key: string) => T;
  set: (dictionary: binding.Dictionary, key: string, value: T) => void;
  snapshotGet: (snapshot: binding.Results, index: number) => T;
};

type DictionaryHelpersFactoryOptions<T> = {
  realm: Realm;
  typeHelpers: TypeHelpers<T>;
  isMixedItem?: boolean;
};

/** @internal */
export function createDictionaryHelpers<T>(options: DictionaryHelpersFactoryOptions<T>): DictionaryHelpers<T> {
  return options.isMixedItem
    ? createDictionaryHelpersForMixed<T>(options)
    : createDictionaryHelpersForKnownType<T>(options);
}

function createDictionaryHelpersForMixed<T>({
  realm,
  typeHelpers,
}: Pick<DictionaryHelpersFactoryOptions<T>, "realm" | "typeHelpers">): DictionaryHelpers<T> {
  return {
    get: (...args) => getMixed(realm, typeHelpers, ...args),
    set: (...args) => setMixed(realm, typeHelpers.toBinding, ...args),
    snapshotGet: (...args) => snapshotGetMixed(realm, typeHelpers, ...args),
    ...typeHelpers,
  };
}

function createDictionaryHelpersForKnownType<T>({
  realm,
  typeHelpers: { fromBinding, toBinding },
}: Pick<DictionaryHelpersFactoryOptions<T>, "realm" | "typeHelpers">): DictionaryHelpers<T> {
  return {
    get: (...args) => getKnownType(fromBinding, ...args),
    set: (...args) => setKnownType(realm, toBinding, ...args),
    snapshotGet: (...args) => snapshotGetKnownType(fromBinding, ...args),
    fromBinding,
    toBinding,
  };
}

function getKnownType<T>(fromBinding: TypeHelpers<T>["fromBinding"], dictionary: binding.Dictionary, key: string): T {
  return fromBinding(dictionary.tryGetAny(key));
}

function snapshotGetKnownType<T>(
  fromBinding: TypeHelpers<T>["fromBinding"],
  snapshot: binding.Results,
  index: number,
): T {
  return fromBinding(snapshot.getAny(index));
}

function getMixed<T>(realm: Realm, typeHelpers: TypeHelpers<T>, dictionary: binding.Dictionary, key: string): T {
  const value = dictionary.tryGetAny(key);
  if (value === binding.ListSentinel) {
    const listHelpers = createListHelpers<T>({ realm, typeHelpers, isMixedItem: true });
    return new List<T>(realm, dictionary.getList(key), listHelpers) as T;
  }
  if (value === binding.DictionarySentinel) {
    const dictionaryHelpers = createDictionaryHelpers<T>({ realm, typeHelpers, isMixedItem: true });
    return new Dictionary<T>(realm, dictionary.getDictionary(key), dictionaryHelpers) as T;
  }
  return typeHelpers.fromBinding(value) as T;
}

function snapshotGetMixed<T>(realm: Realm, typeHelpers: TypeHelpers<T>, snapshot: binding.Results, index: number): T {
  const value = snapshot.getAny(index);
  if (value === binding.ListSentinel) {
    const listHelpers = createListHelpers<T>({ realm, typeHelpers, isMixedItem: true });
    return new List<T>(realm, snapshot.getList(index), listHelpers) as T;
  }
  if (value === binding.DictionarySentinel) {
    const dictionaryHelpers = createDictionaryHelpers<T>({ realm, typeHelpers, isMixedItem: true });
    return new Dictionary<T>(realm, snapshot.getDictionary(index), dictionaryHelpers) as T;
  }
  return typeHelpers.fromBinding(value);
}

function setKnownType<T>(
  realm: Realm,
  toBinding: TypeHelpers<T>["toBinding"],
  dictionary: binding.Dictionary,
  key: string,
  value: T,
): void {
  assert.inTransaction(realm);
  dictionary.insertAny(key, toBinding(value));
}

function setMixed<T>(
  realm: Realm,
  toBinding: TypeHelpers<T>["toBinding"],
  dictionary: binding.Dictionary,
  key: string,
  value: T,
): void {
  assert.inTransaction(realm);

  if (isJsOrRealmList(value)) {
    dictionary.insertCollection(key, binding.CollectionType.List);
    insertIntoListInMixed(value, dictionary.getList(key), toBinding);
  } else if (isJsOrRealmDictionary(value)) {
    dictionary.insertCollection(key, binding.CollectionType.Dictionary);
    insertIntoDictionaryInMixed(value, dictionary.getDictionary(key), toBinding);
  } else {
    dictionary.insertAny(key, toBinding(value));
  }
}

/** @internal */
export function insertIntoDictionaryInMixed(
  dictionary: Dictionary | Record<string, unknown>,
  internal: binding.Dictionary,
  toBinding: TypeHelpers["toBinding"],
) {
  for (const key in dictionary) {
    const value = dictionary[key];
    if (isJsOrRealmList(value)) {
      internal.insertCollection(key, binding.CollectionType.List);
      insertIntoListInMixed(value, internal.getList(key), toBinding);
    } else if (isJsOrRealmDictionary(value)) {
      internal.insertCollection(key, binding.CollectionType.Dictionary);
      insertIntoDictionaryInMixed(value, internal.getDictionary(key), toBinding);
    } else {
      internal.insertAny(key, toBinding(value));
    }
  }
}

/** @internal */
export function isJsOrRealmDictionary(value: unknown): value is Dictionary | Record<string, unknown> {
  return isPOJO(value) || value instanceof Dictionary;
}

/** @internal */
export function isPOJO(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    // Lastly check for the absence of a prototype as POJOs
    // can still be created using `Object.create(null)`.
    (value.constructor === Object || !Object.getPrototypeOf(value))
  );
}
