////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import Realm from "realm";

import { ATLAS_APP_ID } from "./config";
import { logger } from "../logger";

let app: Realm.App | null = null;

export const getAtlasApp = function getAtlasApp() {
  if (!app) {
    if (ATLAS_APP_ID === "YOUR_APP_ID") {
      throw new Error(
        "Please add your Atlas App ID to `src/atlas-app-services/config.ts`. Refer to `README.md` on how to find your ID.",
      );
    }

    app = new Realm.App({ id: ATLAS_APP_ID });

    // Using log level "all", "trace", or "debug" is good for debugging during developing.
    // Lower log levels are recommended in production for performance improvement.
    // logLevels = ["all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"];
    // You may import `NumericLogLevel` to get them as numbers starting from 0 (`all`).
    Realm.setLogLevel("error");
    Realm.setLogger((logLevel, message) => {
      logger.info(`Log level: ${logLevel} - Log message: ${message}`);
    });
  }

  return app;
};
