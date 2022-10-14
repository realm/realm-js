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

import { AssertionError, TypeAssertionError } from "./errors";
import { DefaultObject } from "./schema";
import type { Realm } from "./Realm";

export function assert(value: unknown, err?: string | Error): asserts value {
  if (!value) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new AssertionError(err);
    }
  }
}

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.instanceOf = <T extends Function>(
  value: unknown,
  constructor: T,
  name?: string,
): asserts value is T["prototype"] => {
  if (!(value instanceof constructor)) {
    throw new TypeAssertionError(`an instance of ${constructor.name}`, value, name);
  }
};

assert.string = (value: unknown, name?: string): asserts value is string => {
  if (typeof value !== "string") {
    throw new TypeAssertionError("a string", value, name);
  }
};

assert.number = (value: unknown, name?: string): asserts value is number => {
  if (typeof value !== "number") {
    throw new TypeAssertionError("a number", value, name);
  }
};

assert.boolean = (value: unknown, name?: string): asserts value is boolean => {
  if (typeof value !== "boolean") {
    throw new TypeAssertionError("a boolean", value, name);
  }
};

assert.bigInt = (value: unknown, name?: string): asserts value is bigint => {
  if (typeof value !== "bigint") {
    throw new TypeAssertionError("a bigint", value, name);
  }
};

assert.numberOrBigInt = (value: unknown, name?: string): asserts value is number => {
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new TypeAssertionError("a number or bigint", value, name);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.function = (value: unknown, name?: string): asserts value is (...args: unknown[]) => unknown => {
  if (typeof value !== "function") {
    throw new TypeAssertionError("a function", value, name);
  }
};

assert.symbol = (value: unknown, name?: string): asserts value is symbol => {
  if (typeof value !== "symbol") {
    throw new TypeAssertionError("a symbol", value, name);
  }
};

assert.object = <K extends string | number | symbol = string, V = unknown>(
  value: unknown,
  name?: string,
): asserts value is Record<K, V> => {
  if (typeof value !== "object" || value === null) {
    throw new TypeAssertionError("an object", value, name);
  }
};

assert.undefined = (value: unknown, name?: string): asserts value is undefined => {
  if (typeof value !== "undefined") {
    throw new TypeAssertionError("undefined", value, name);
  }
};

assert.null = (value: unknown, name?: string): asserts value is null => {
  if (value !== null) {
    throw new TypeAssertionError("null", value, name);
  }
};

assert.array = (value: unknown, name?: string): asserts value is Array<unknown> => {
  if (!Array.isArray(value)) {
    throw new TypeAssertionError("an array", value, name);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.extends = <T extends Function>(
  value: unknown,
  constructor: T,
  name?: string,
): asserts value is T & DefaultObject => {
  assert.function(value, name);
  if (!(value.prototype instanceof constructor)) {
    throw new TypeAssertionError(`a class extending ${constructor.name}`, value, name);
  }
};

assert.iterable = (value: unknown, name?: string): asserts value is Iterable<unknown> => {
  assert.object(value, name);
  if (!(Symbol.iterator in value)) {
    throw new TypeAssertionError("iterable", value, name);
  }
};

// SDK specific

assert.open = (realm: Realm) => {
  assert(!realm.isClosed, "Cannot access realm that has been closed.");
};

assert.inTransaction = (realm: Realm) => {
  assert.open(realm);
  assert(realm.isInTransaction, "Cannot modify managed objects outside of a write transaction.");
};
