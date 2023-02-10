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

import { AssertionError, DefaultObject, Realm, TypeAssertionError, binding } from "./internal";

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
    const errValue = typeof err === "function" ? err() : err;
    if (errValue instanceof Error) {
      throw err;
    } else if (typeof err === "string" || typeof err === "undefined") {
      throw new AssertionError(errValue);
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
  if (!(value instanceof constructor)) {
    throw new TypeAssertionError(`an instance of ${constructor.name}`, value, target);
  }
};

assert.string = (value: unknown, target?: string): asserts value is string => {
  if (typeof value !== "string") {
    throw new TypeAssertionError("a string", value, target);
  }
};

assert.number = (value: unknown, target?: string): asserts value is number => {
  if (typeof value !== "number") {
    throw new TypeAssertionError("a number", value, target);
  }
};

assert.boolean = (value: unknown, target?: string): asserts value is boolean => {
  if (typeof value !== "boolean") {
    throw new TypeAssertionError("a boolean", value, target);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.function = (value: unknown, target?: string): asserts value is (...args: unknown[]) => unknown => {
  if (typeof value !== "function") {
    throw new TypeAssertionError("a function", value, target);
  }
};

assert.symbol = (value: unknown, target?: string): asserts value is symbol => {
  if (typeof value !== "symbol") {
    throw new TypeAssertionError("a symbol", value, target);
  }
};

assert.object = <K extends string | number | symbol = string, V = unknown>(
  value: unknown,
  target?: string,
  { allowArrays } = { allowArrays: true },
): asserts value is Record<K, V> => {
  if (typeof value !== "object" || value === null || (!allowArrays && Array.isArray(value))) {
    throw new TypeAssertionError("an object", value, target);
  }
};

assert.undefined = (value: unknown, target?: string): asserts value is undefined => {
  if (typeof value !== "undefined") {
    throw new TypeAssertionError("undefined", value, target);
  }
};

assert.null = (value: unknown, target?: string): asserts value is null => {
  if (value !== null) {
    throw new TypeAssertionError("null", value, target);
  }
};

assert.array = (value: unknown, target?: string): asserts value is Array<unknown> => {
  if (!Array.isArray(value)) {
    throw new TypeAssertionError("an array", value, target);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.extends = <T extends Function>(
  value: unknown,
  constructor: T,
  target?: string,
): asserts value is T & DefaultObject => {
  assert.function(value, target);
  if (!(value.prototype instanceof constructor)) {
    throw new TypeAssertionError(`a class extending ${constructor.name}`, value, target);
  }
};

assert.iterable = (value: unknown, target?: string): asserts value is Iterable<unknown> => {
  assert.object(value, target);
  if (!(Symbol.iterator in value)) {
    throw new TypeAssertionError("iterable", value, target);
  }
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
