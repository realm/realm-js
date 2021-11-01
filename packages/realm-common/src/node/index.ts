////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { setIsDevelopmentMode } from "../environment";

// Exported for unit testing
export const isDevelopmentModeImpl = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require("electron");
    // We are in an electron app, check if the app is packaged (release mode)
    return app !== undefined && !app.isPackaged;
  } catch (_) {
    // ignore error
  }

  // Node.js has no default for NODE_ENV, so check if it is anything other than
  // "production" to catch cases where it is just started with `node index.js`
  return process.env?.NODE_ENV !== "production";
};

setIsDevelopmentMode(isDevelopmentModeImpl());

export * from "../index";
