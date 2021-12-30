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
import { testContext } from "../tests/testContext";
import { importApp, TemplateReplacements } from "../utils/import-app";

export function importAppBefore(
  name: string,
  replacements: TemplateReplacements = {},
  logLevel: Realm.App.Sync.LogLevel = "warn",
): void {
  before(async function () {
    this.timeout(10000);
    if (testContext.app) {
      throw new Error("Unexpected app on context, use only one importAppBefore per test");
    } else {
      testContext.app = await importApp(name, replacements);
      Realm.App.Sync.setLogLevel(testContext.app, logLevel);
    }
  });
}
