////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { Storage } from "./storage";
import { Window } from "./OAuth2Helper";

/**
 * Helps decode buffers into strings of various encodings.
 */
declare class TextDecoder {
  decode(buffer: Uint8Array, options?: { stream: boolean }): string;
}

/** An object with values specific to the runtime environment. */
export type Environment = {
  /**
   * The default storage instance on the environment.
   */
  defaultStorage: Storage;

  /**
   * Open a browser window.
   */
  openWindow: (url: string) => Window | null;

  /**
   * The name of the executing platform.
   */
  platform: string;

  /**
   * The version of the executing platform.
   */
  platformVersion: string;

  /**
   * Helps decode buffers into strings of various encodings.
   */
  TextDecoder: typeof TextDecoder;
};

let environment: Environment | null = null;

/**
 * Set the environment of execution.
 * Note: This should be called as the first thing before executing any code which calls getEnvironment()
 * @param e An object containing environment specific implementations.
 */
export function setEnvironment(e: Environment): void {
  environment = e;
}

/**
 * Get the environment of execution.
 * @returns An object containing environment specific implementations.
 */
export function getEnvironment(): Environment {
  if (environment) {
    return environment;
  } else {
    throw new Error("Cannot get environment before it's set");
  }
}
