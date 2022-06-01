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
import { deleteApp, importApp, TemplateReplacements } from "../utils/import-app";

export function importAppBefore(
  name: string,
  replacements?: TemplateReplacements,
  logLevel: Realm.App.Sync.LogLevel = (environment.syncLogLevel as Realm.App.Sync.LogLevel) || "warn",
): void {
  before(async function (this: Partial<AppContext> & Mocha.Context) {
    // Importing an app might take up to 5 minutes when the app has a MongoDB Atlas service enabled.
    this.timeout(5 * 60 * 1000);
    if (this.app) {
      throw new Error("Unexpected app on context, use only one importAppBefore per test");
    } else {
      this.app = await importApp(name, replacements);
      Realm.App.Sync.setLogLevel(this.app, logLevel);
    }
  });

  // Delete our app after we have finished, otherwise the server can slow down
  // (in the case of flexible sync, with lots of apps with subscriptions created)
  after(async function (this: Partial<AppContext> & Mocha.Context) {
    if (environment.preserveAppAfterRun) return;
    if (this.app) {
      await deleteApp(this.app.id);
    } else {
      console.warn("No app on context when trying to delete app");
    }
  });
}
