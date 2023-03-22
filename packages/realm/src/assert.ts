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

import { AssertionError, BSON, DefaultObject, PrimaryKey, Realm, TypeAssertionError, binding } from "./internal";

/**
 * Expects the condition to be truthy
 * @throws {@link Error} If the condition is not truthy. Throws either the {@link err} given as param if it's an {@link Error},
 * an {@link AssertionError} wrapping {@link err} if it's a string or undefined, or uses the result of invoking {@link err} if it's a function.
 * @param condition The condition that must be truthy to avoid throwing.
 * @param err Optional message or error to throw.
 * Or a function producing this, which is useful to avoid computing the error message in case it's not needed.
 */
export function assert(
  condition: unknown,
  err?: string | Error | (() => undefined | string | Error),
): asserts condition {
  if (!condition) {
    // Call any function to generate the error lazily
    err = typeof err === "function" ? err() : err;
    if (err instanceof Error) {
      throw err;
    } else if (typeof err === "string" || typeof err === "undefined") {
      throw new AssertionError(err);
    } else {
      throw new Error("Expected err to be an Err, string, undefined or a function returning either.");
    }
  }
}

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.instanceOf = <T extends Function>(
  value: unknown,
  constructor: T,
  target?: string,
): asserts value is T["prototype"] => {
  assert(
    value instanceof constructor,
    () => new TypeAssertionError(`an instance of ${constructor.name}`, value, target),
  );
};

assert.string = (value: unknown, target?: string): asserts value is string => {
  assert(typeof value === "string", () => new TypeAssertionError("a string", value, target));
};

assert.number = (value: unknown, target?: string): asserts value is number => {
  assert(typeof value === "number", () => new TypeAssertionError("a number", value, target));
};

assert.boolean = (value: unknown, target?: string): asserts value is boolean => {
  assert(typeof value === "boolean", () => new TypeAssertionError("a boolean", value, target));
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.function = (value: unknown, target?: string): asserts value is (...args: unknown[]) => unknown => {
  assert(typeof value === "function", () => new TypeAssertionError("a function", value, target));
};

assert.symbol = (value: unknown, target?: string): asserts value is symbol => {
  assert(typeof value === "symbol", () => new TypeAssertionError("a symbol", value, target));
};

assert.primaryKey = (value: unknown, target?: string): asserts value is PrimaryKey => {
  assert(
    value === null ||
      typeof value === "number" ||
      typeof value === "string" ||
      value instanceof BSON.UUID ||
      value instanceof BSON.ObjectId,
    () => new TypeAssertionError("a primary key", value, target),
  );
};

assert.object = <K extends string | number | symbol = string, V = unknown>(
  value: unknown,
  target?: string,
  { allowArrays } = { allowArrays: true },
): asserts value is Record<K, V> => {
  assert(
    typeof value === "object" && value !== null && (allowArrays || !Array.isArray(value)),
    () => new TypeAssertionError("an object", value, target),
  );
};

assert.undefined = (value: unknown, target?: string): asserts value is undefined => {
  assert(typeof value === "undefined", () => new TypeAssertionError("undefined", value, target));
};

assert.null = (value: unknown, target?: string): asserts value is null => {
  assert(value === null, () => new TypeAssertionError("null", value, target));
};

assert.array = (value: unknown, target?: string): asserts value is Array<unknown> => {
  assert(Array.isArray(value), () => new TypeAssertionError("an array", value, target));
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.extends = <T extends Function>(
  value: unknown,
  constructor: T,
  target?: string,
): asserts value is T & DefaultObject => {
  assert.function(value, target);
  assert(
    value.prototype instanceof constructor,
    () => new TypeAssertionError(`a class extending ${constructor.name}`, value, target),
  );
};

assert.iterable = (value: unknown, target?: string): asserts value is Iterable<unknown> => {
  assert.object(value, target);
  assert(Symbol.iterator in value, () => new TypeAssertionError("iterable", value, target));
};

assert.never = (value: never, target?: string): asserts value is never => {
  throw new TypeAssertionError("never", value, target);
};

// SDK specific

assert.open = (realm: Realm) => {
  assert(!realm.isClosed, "Cannot access realm that has been closed.");
};

assert.inTransaction = (realm: Realm, message = "Cannot modify managed objects outside of a write transaction.") => {
  assert.open(realm);
  assert(realm.isInTransaction, message);
};

assert.outTransaction = (realm: Realm, message = "Expected realm to be outside of a write transaction") => {
  assert.open(realm);
  assert(!realm.isInTransaction, message);
};

assert.isValid = (obj: binding.Obj, message = "Accessing object which has been invalidated or deleted") => {
  assert(obj.isValid, message);
};

assert.isSameRealm = (realm1: binding.Realm, realm2: binding.Realm, message = "Expected the Realms to be the same") => {
  assert(realm1.$addr == realm2.$addr, message);
};
