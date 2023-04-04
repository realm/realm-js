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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used by TS docs
  ClientResetMode,
  Configuration,
  PrimaryKey,
  assert,
  binding,
} from "./internal";

export class AssertionError extends Error {
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
    } else {
      return "a " + typeof value;
    }
  }

  /**
   * Get an error message for when the target's value is of
   * the wrong type. Single quotes are added around the target
   * string if it does not already contain one.
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

  constructor(private expected: string, private value: unknown, target?: string) {
    super(TypeAssertionError.message(expected, value, target));
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

export class TimeoutError extends Error {
  constructor(message: string) {
    super(`Timed out: ${message}`);
  }
}

/** @internal */
export function fromBindingSyncError(error: binding.SyncError) {
  if (error.systemError.code === 231) {
    return new CompensatingWriteError(error);
  } else if (error.isClientResetRequested) {
    return new ClientResetError(error);
  } else {
    return new SyncError(error);
  }
}

/**
 * An class describing a sync error.
 */
export class SyncError extends Error {
  public name = "SyncError";

  /**
   * The error code that represents this error.
   */
  public code: number;

  /**
   * The category of this error.
   */
  public category: string;

  /**
   * The URL to the associated server log, if available. The string will be empty
   * if the sync error is not initiated by the server.
   */
  public logUrl: string;

  /**
   * A record of extra user information associated with this error.
   */
  public userInfo: Record<string, string>;

  /**
   * @deprecated Check the error message instead.
   */
  public isFatal: boolean;

  /** @internal */
  constructor(error: binding.SyncError) {
    super(error.simpleMessage);
    const { systemError } = error;
    this.code = systemError.code;
    this.category = systemError.category;
    this.logUrl = error.logUrl;
    this.userInfo = error.userInfo;
    this.isFatal = error.isFatal;
  }
}

const RECOVERY_FILE_PATH_KEY = "RECOVERY_FILE_PATH";

/**
 * @deprecated Use the another {@link ClientResetMode} than {@link ClientResetMode.Manual}.
 * @see https://github.com/realm/realm-js/blob/main/CHANGELOG.md#1110-2022-11-01
 * @see https://github.com/realm/realm-js/issues/4135
 */
export class ClientResetError extends SyncError {
  public name = "ClientReset";
  public config: Configuration;

  /** @internal */
  constructor(error: binding.SyncError) {
    super(error);
    this.config = {
      path: error.userInfo[RECOVERY_FILE_PATH_KEY],
      readOnly: true,
    };
  }
}

/**
 * An error class that indicates that one or more object changes have been reverted by the server.
 * This can happen when the client creates/updates objects that do not match any subscription, or performs writes on
 * an object it didn't have permission to access.
 */
export class CompensatingWriteError extends SyncError {
  /**
   * The array of information about each object that caused the compensating write.
   */
  public writes: CompensatingWriteInfo[] = [];

  /** @internal */
  constructor(error: binding.SyncError) {
    super(error);
    for (const { objectName, primaryKey, reason } of error.compensatingWritesInfo) {
      assert.primaryKey(primaryKey);
      this.writes.push({ objectName, reason, primaryKey });
    }
  }
}

/**
 * The details of a compensating write performed by the server.
 */
export type CompensatingWriteInfo = {
  /**
   * The type of the object that caused the compensating write.
   */
  objectName: string;

  /**
   * The reason for the compensating write.
   */
  reason: string;

  /**
   * The primary key of the object that caused the compensating write.
   */
  primaryKey: PrimaryKey;
};
