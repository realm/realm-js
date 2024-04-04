////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import { importAppBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

describe("Logging", () => {
  importAppBefore(buildAppConfig("with-pbs").anonAuth().flexibleSync());
  afterEach(() => Realm.clearTestState());

  it("can set custom logging function", async function (this: AppContext) {
    const credentials = Realm.Credentials.anonymous();

    const logLevelStr = "info"; // "all", "trace", "debug", "detail", "info", "warn", "error", "fatal", "off"
    const logLevelNum = 4; // == "info", see index.d.ts, logger.hpp for definitions

    const promisedLog = new Promise((resolve) => {
      Realm.App.Sync.setLogLevel(this.app, logLevelStr);
      Realm.App.Sync.setLogger(this.app, (level, message) => {
        if (level == logLevelNum && message.includes("Connection") && message.includes("Session")) {
          // we should, at some point, receive a log message that looks like
          // Connection[1]: Session[1]: client_reset_config = false, Realm exists = true, client reset = false
          resolve(true);
        }
      });
    });

    const user = await this.app.logIn(credentials);
    await Realm.open({ sync: { user, flexible: true } });
    await promisedLog;
  });
});
