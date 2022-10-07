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

export class TypeAssertionError extends AssertionError {
  /** @internal */
  private static deriveType(value: unknown) {
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
    } else if (typeof value === "function") {
      return `a function or class named ${value.name}`;
    } else {
      return "a " + typeof value;
    }
  }

  private static message(expected: string, value: unknown, name?: string) {
    const actual = TypeAssertionError.deriveType(value);
    return `Expected ${name ? "'" + name + "'" : "value"} to be ${expected}, got ${actual}`;
  }

  constructor(private expected: string, private value: unknown, name?: string) {
    super(TypeAssertionError.message(expected, value, name));
  }

  public rename(name: string) {
    this.message = TypeAssertionError.message(this.expected, this.value, name);
  }
}

export class IllegalConstructorError extends Error {
  constructor(type: string) {
    super(`Illegal constructor: ${type} objects are read from managed objects only.`);
  }
}
