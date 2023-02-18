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

declare global {
  type TimerHandle = ReturnType<typeof setTimeout>;
}

import { setEnvironment, Environment } from "../environment";
import { MemoryStorage } from "../storage";
import { TextDecoder } from "util";

const environment: Environment = {
  defaultStorage: new MemoryStorage(),
  openWindow: (url) => {
    console.log(`Please open this URL: ${url}`);
    return null;
  },

  platform: process?.release?.name || "node",
  platformVersion: process?.versions?.node || 'unknown',

  TextDecoder,
};

setEnvironment(environment);

/**
 * Handle an OAuth 2.0 redirect.
 */
export function handleAuthRedirect(): void {
  throw new Error("Handling OAuth 2.0 redirects is not supported outside a browser");
}

// Export here to avoid getting the enviroment before its been sat (since this will be translated to commonjs)
export * from "../index";
