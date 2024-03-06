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
  COLLECTION_ACCESSOR as ACCESSOR,
  AssertionError,
  Collection,
  DefaultObject,
  IllegalConstructorError,
  JSONCacheMap,
  List,
  Realm,
  RealmObject,
  Results,
  TypeHelpers,
  assert,
  binding,
  createListAccessor,
  createResultsAccessor,
  insertIntoListOfMixed,
  isJsOrRealmList,
  toItemType,
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
      return target[ACCESSOR].get(target[INTERNAL], prop);
    } else {
      return value;
    }
  },
  set(target, prop, value) {
    if (typeof prop === "string") {
      target[ACCESSOR].set(target[INTERNAL], prop, value);
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
  DictionaryAccessor<T>
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
  constructor(realm: Realm, internal: binding.Dictionary, accessor: DictionaryAccessor<T>) {
    if (arguments.length === 0 || !(internal instanceof binding.Dictionary)) {
      throw new IllegalConstructorError("Dictionary");
    }
    super(accessor, (listener, keyPaths) => {
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
    const realm = this[REALM];
    const snapshot = this[INTERNAL].values.snapshot();
    const itemType = toItemType(snapshot.type);
    const { fromBinding, toBinding } = this[ACCESSOR];
    const accessor = createResultsAccessor({ realm, typeHelpers: { fromBinding, toBinding }, itemType });
    const results = new Results<T>(realm, snapshot, accessor);
    const size = results.length;

    for (let i = 0; i < size; i++) {
      yield results[i];
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

    const realm = this[REALM];
    const itemType = toItemType(snapshot.type);
    const { fromBinding, toBinding } = this[ACCESSOR];
    const accessor = createResultsAccessor({ realm, typeHelpers: { fromBinding, toBinding }, itemType });
    const results = new Results<T>(realm, snapshot, accessor);

    for (let i = 0; i < size; i++) {
      const key = keys.getAny(i);
      const value = results[i];
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
    const elements = typeof elementsOrKey === "object" ? elementsOrKey : { [elementsOrKey]: value as T };
    assert(Object.getOwnPropertySymbols(elements).length === 0, "Symbols cannot be used as keys of a dictionary");

    for (const [key, value] of Object.entries(elements)) {
      this[key] = value;
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
 * Accessor for getting and setting items in the binding collection, as
 * well as converting the values to and from their binding representations.
 * @internal
 */
export type DictionaryAccessor<T = unknown> = TypeHelpers<T> & {
  get: (dictionary: binding.Dictionary, key: string) => T;
  set: (dictionary: binding.Dictionary, key: string, value: T) => void;
};

type DictionaryAccessorFactoryOptions<T> = {
  realm: Realm;
  typeHelpers: TypeHelpers<T>;
  itemType: binding.PropertyType;
  isEmbedded?: boolean;
};

/** @internal */
export function createDictionaryAccessor<T>(options: DictionaryAccessorFactoryOptions<T>): DictionaryAccessor<T> {
  return options.itemType === binding.PropertyType.Mixed
    ? createDictionaryAccessorForMixed<T>(options)
    : createDictionaryAccessorForKnownType<T>(options);
}

function createDictionaryAccessorForMixed<T>({
  realm,
  typeHelpers,
}: Pick<DictionaryAccessorFactoryOptions<T>, "realm" | "typeHelpers">): DictionaryAccessor<T> {
  return {
    get: (...args) => getMixed(realm, typeHelpers, ...args),
    set: (...args) => setMixed(realm, typeHelpers.toBinding, ...args),
    ...typeHelpers,
  };
}

function createDictionaryAccessorForKnownType<T>({
  realm,
  typeHelpers: { fromBinding, toBinding },
  isEmbedded,
}: Omit<DictionaryAccessorFactoryOptions<T>, "itemType">): DictionaryAccessor<T> {
  return {
    get: (...args) => getKnownType(fromBinding, ...args),
    set: (...args) => setKnownType(realm, toBinding, !!isEmbedded, ...args),
    fromBinding,
    toBinding,
  };
}

function getKnownType<T>(fromBinding: TypeHelpers<T>["fromBinding"], dictionary: binding.Dictionary, key: string): T {
  return fromBinding(dictionary.tryGetAny(key));
}

function getMixed<T>(realm: Realm, typeHelpers: TypeHelpers<T>, dictionary: binding.Dictionary, key: string): T {
  const value = dictionary.tryGetAny(key);
  switch (value) {
    case binding.ListSentinel: {
      const accessor = createListAccessor<T>({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
      return new List<T>(realm, dictionary.getList(key), accessor) as T;
    }
    case binding.DictionarySentinel: {
      const accessor = createDictionaryAccessor<T>({ realm, typeHelpers, itemType: binding.PropertyType.Mixed });
      return new Dictionary<T>(realm, dictionary.getDictionary(key), accessor) as T;
    }
    default:
      return typeHelpers.fromBinding(value) as T;
  }
}

function setKnownType<T>(
  realm: Realm,
  toBinding: TypeHelpers<T>["toBinding"],
  isEmbedded: boolean,
  dictionary: binding.Dictionary,
  key: string,
  value: T,
): void {
  assert.inTransaction(realm);

  if (isEmbedded) {
    toBinding(value, { createObj: () => [dictionary.insertEmbedded(key), true] });
  } else {
    dictionary.insertAny(key, toBinding(value));
  }
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
    insertIntoListOfMixed(value, dictionary.getList(key), toBinding);
  } else if (isJsOrRealmDictionary(value)) {
    dictionary.insertCollection(key, binding.CollectionType.Dictionary);
    insertIntoDictionaryOfMixed(value, dictionary.getDictionary(key), toBinding);
  } else {
    dictionary.insertAny(key, toBinding(value));
  }
}

/** @internal */
export function insertIntoDictionaryOfMixed(
  dictionary: Dictionary | Record<string, unknown>,
  internal: binding.Dictionary,
  toBinding: TypeHelpers["toBinding"],
) {
  // TODO: Solve the "removeAll()" case for self-assignment.
  internal.removeAll();

  for (const key in dictionary) {
    const value = dictionary[key];
    if (isJsOrRealmList(value)) {
      internal.insertCollection(key, binding.CollectionType.List);
      insertIntoListOfMixed(value, internal.getList(key), toBinding);
    } else if (isJsOrRealmDictionary(value)) {
      internal.insertCollection(key, binding.CollectionType.Dictionary);
      insertIntoDictionaryOfMixed(value, internal.getDictionary(key), toBinding);
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
