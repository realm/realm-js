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
  /** @internal */
  constructor(message = "Assertion failed!") {
    super(message);
  }
}

export class TypeAssertionError extends AssertionError {
  /** @internal */
  public static deriveType(value: unknown) {
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
    } else if (typeof value === "number") {
      if (Number.isNaN(value)) {
        return "NaN";
      } else if (!Number.isInteger(value)) {
        return "a decimal number";
      } else {
        return "a number";
      }
    } else {
      return "a " + typeof value;
    }
  }

  /**
   * Get an error message for when the target's value is of
   * the wrong type. Single quotes are added around the target
   * string if it does not already contain one.
   * @internal
   */
  private static message(expected: string, value: unknown, target?: string) {
    const actual = TypeAssertionError.deriveType(value);
    if (target) {
      target = target.includes("'") ? target : `'${target}'`;
    } else {
      target = "value";
    }
    return `Expected ${target} to be ${expected}, got ${actual}`;
  }

  /** @internal */
  constructor(/** @internal */ private expected: string, /** @internal */ private value: unknown, target?: string) {
    super(TypeAssertionError.message(expected, value, target));
  }

  /** @internal */
  public rename(name: string) {
    this.message = TypeAssertionError.message(this.expected, this.value, name);
  }
}

export class IllegalConstructorError extends Error {
  constructor(type: string) {
    super(`Illegal constructor: ${type} objects are read from managed objects only.`);
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(`Timed out: ${message}`);
  }
}

export class SchemaParseError extends Error {
  /** @internal */
  constructor(message: string) {
    super(message);
  }
}

export class ObjectSchemaParseError extends SchemaParseError {
  objectName: string;

  /** @internal */
  constructor(message: string, info: { objectName: string }) {
    const displayName = info.objectName ? `object '${info.objectName}'` : "unnamed object";
    super(`Invalid schema for ${displayName}: ${message}`);
    this.objectName = info.objectName;
  }
}

export class PropertySchemaParseError extends SchemaParseError {
  objectName: string;
  propertyName: string;

  /** @internal */
  constructor(message: string, info: { objectName: string; propertyName: string }) {
    super(`Invalid type declaration for property '${info.propertyName}' on '${info.objectName}': ${message}`);
    this.objectName = info.objectName;
    this.propertyName = info.propertyName;
  }
}
