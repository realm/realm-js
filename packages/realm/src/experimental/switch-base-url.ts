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

import { App } from "../app-services/App";

declare module "../app-services/App" {
  interface App {
    /**
     * Switch the base URL of the App.
     */
    switchBaseUrl(url: string): void;
  }
}

App.prototype.switchBaseUrl = function (this: App) {
  // TODO: Implementation
  console.log(`(App ID: ${this.id}) Switching base URL..`);
};
