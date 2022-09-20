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

export class AssertionError extends Error {
  constructor(message = "Assertion failed!") {
    super(message);
  }
}

export function assert(value: unknown, err?: string | Error): asserts value {
  if (!value) {
    if (err instanceof Error) {
      throw err;
    } else {
      throw new AssertionError(err);
    }
  }
}

function deriveActualType(value: unknown) {
  if (typeof value === "object") {
    if (value === null) {
      return "null";
    } else {
      const name = value.constructor.name;
      if (name === "Object") {
        return "an object";
      } else if (name === "Array") {
        return "an array";
      } else {
        return "an instance of " + name;
      }
    }
  } else if (typeof value === "undefined") {
    return typeof value;
  } else {
    return "a " + typeof value;
  }
}

function createTypeError(expected: string, value: unknown, name: string | undefined) {
  const actual = deriveActualType(value);
  return new TypeError(`Expected ${name ? "'" + name + "'" : "value"} to be ${expected}, got ${actual}`);
}

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.instanceOf = <T extends Function>(
  value: unknown,
  constructor: T,
  name?: string,
): asserts value is T["prototype"] => {
  if (!(value instanceof constructor)) {
    throw createTypeError(`an instance of ${constructor.name}`, value, name);
  }
};

assert.string = (value: unknown, name?: string): asserts value is string => {
  if (typeof value !== "string") {
    throw createTypeError("a string", value, name);
  }
};

assert.number = (value: unknown, name?: string): asserts value is number => {
  if (typeof value !== "number") {
    throw createTypeError("a number", value, name);
  }
};

assert.boolean = (value: unknown, name?: string): asserts value is boolean => {
  if (typeof value !== "boolean") {
    throw createTypeError("a boolean", value, name);
  }
};

assert.bigInt = (value: unknown, name?: string): asserts value is bigint => {
  if (typeof value !== "bigint") {
    throw createTypeError("a bigint", value, name);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.function = (value: unknown, name?: string): asserts value is Function => {
  if (typeof value !== "function") {
    throw createTypeError("a function", value, name);
  }
};

assert.symbol = (value: unknown, name?: string): asserts value is symbol => {
  if (typeof value !== "symbol") {
    throw createTypeError("a symbol", value, name);
  }
};

assert.object = <K extends string | number | symbol = string, V = unknown>(
  value: unknown,
  name?: string,
): asserts value is Record<K, V> => {
  if (typeof value !== "object") {
    throw createTypeError("an object", value, name);
  }
};

assert.undefined = (value: unknown, name?: string): asserts value is undefined => {
  if (typeof value !== "undefined") {
    throw createTypeError("undefined", value, name);
  }
};

assert.null = (value: unknown, name?: string): asserts value is bigint => {
  if (value !== null) {
    throw createTypeError("null", value, name);
  }
};

assert.array = (value: unknown, name?: string): asserts value is Array<unknown> => {
  if (!Array.isArray(value)) {
    throw createTypeError("an array", value, name);
  }
};
