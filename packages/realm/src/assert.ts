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

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.instanceOf = <T extends Function>(obj: unknown, constructor: T): asserts obj is T["prototype"] => {
  let msg = `Expected ${obj} to be instance of ${constructor.name}`;
  if (typeof obj === "object" && obj) {
    msg += ", got " + obj.constructor.name;
  }
  if (!(obj instanceof constructor)) {
    throw new TypeError(msg);
  }
};

assert.string = (value: unknown): asserts value is string => {
  if (typeof value !== "string") {
    throw new TypeError(`Expected ${value} to be a string, got ${typeof value}`);
  }
};

assert.number = (value: unknown): asserts value is number => {
  if (typeof value !== "number") {
    throw new TypeError(`Expected ${value} to be a number, got ${typeof value}`);
  }
};

assert.boolean = (value: unknown): asserts value is boolean => {
  if (typeof value !== "boolean") {
    throw new TypeError(`Expected ${value} to be a boolean, got ${typeof value}`);
  }
};

assert.bigInt = (value: unknown): asserts value is bigint => {
  if (typeof value !== "bigint") {
    throw new TypeError(`Expected ${value} to be a bigint, got ${typeof value}`);
  }
};

/* eslint-disable-next-line @typescript-eslint/ban-types */
assert.function = (value: unknown): asserts value is Function => {
  if (typeof value !== "function") {
    throw new TypeError(`Expected ${value} to be a function, got ${typeof value}`);
  }
};

assert.symbol = (value: unknown): asserts value is symbol => {
  if (typeof value !== "symbol") {
    throw new TypeError(`Expected ${value} to be a symbol, got ${typeof value}`);
  }
};

assert.object = (value: unknown): asserts value is object => {
  if (typeof value !== "object") {
    throw new TypeError(`Expected ${value} to be an object, got ${typeof value}`);
  }
};

assert.undefined = (value: unknown): asserts value is undefined => {
  if (typeof value !== "undefined") {
    throw new TypeError(`Expected ${value} to be undefined, got ${typeof value}`);
  }
};

assert.null = (value: unknown): asserts value is bigint => {
  if (value !== null) {
    throw new TypeError(`Expected ${value} to be null, got ${typeof value}`);
  }
};
