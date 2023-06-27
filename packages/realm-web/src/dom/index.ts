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

import { detect } from "detect-browser";

declare global {
  type TimerHandle = ReturnType<typeof setTimeout>;
}

export * from "../index";

import { setEnvironment, Environment } from "../environment";
import { MemoryStorage } from "../storage/MemoryStorage";
import { OAuth2Helper } from "../OAuth2Helper";

import { LocalStorage } from "./LocalStorage";
import { safeGlobalThis } from "@realm/common";
export { LocalStorage };

const browser = detect();

const DefaultStorage = "localStorage" in safeGlobalThis ? LocalStorage : MemoryStorage;

/**
 * Attempt to use the browser to open a window
 * @param url The url to open a window to.
 * @returns Then newly create window.
 */
function openWindow(url: string) {
  if (typeof safeGlobalThis.open === "function") {
    return safeGlobalThis.open(url);
  } else {
    console.log(`Please open ${url}`);
    return null;
  }
}

const environment: Environment = {
  defaultStorage: new DefaultStorage().prefix("realm-web"),
  openWindow,
  platform: browser?.name || "web",
  platformVersion: browser?.version || "0.0.0",
  TextDecoder,
};

setEnvironment(environment);

/**
 * Handle an OAuth 2.0 redirect.
 * @param location An optional location to use (defaults to the windows current location).
 * @param storage Optional storage used to save any results from the location.
 */
export function handleAuthRedirect(location = safeGlobalThis.location, storage = environment.defaultStorage): void {
  try {
    const queryString = location.hash.substr(1); // Strip the initial # from the hash
    OAuth2Helper.handleRedirect(queryString, storage);
  } catch (err) {
    // Ensure calling this never throws: It should not interrupt a users flow.
    console.warn(err);
  }
}
