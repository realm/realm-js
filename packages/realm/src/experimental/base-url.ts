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
     * Get the current base URL used for sending requests to Atlas App Services.
     *
     * If an {@link App.updateBaseUrl | updateBaseUrl} operation is currently in
     * progress, this value will not be updated with the new value until that
     * operation has completed.
     * @experimental This feature is experimental and may be changed or removed.
     */
    get baseUrl(): string;

    /**
     * Update the base URL used for sending requests to Atlas App Services. If this is
     * set to an empty string or `null`, it will reset the base URL to the default one.
     *
     * If this operation fails, the app will continue to use the original base URL.
     * If another {@link App} operation is started while this function is in progress,
     * that request will use the original base URL location information.
     * @experimental This feature is experimental and may be changed or removed.
     */
    updateBaseUrl(newUrl: string | null): Promise<void>;
  }
}

Object.defineProperty(App.prototype, "baseUrl", {
  get(this: App) {
    return this.internal.getBaseUrl();
  },
  set() {
    throw new Error("Cannot assign the base URL, please use 'updateBaseUrl()'.");
  },
});

App.prototype.updateBaseUrl = function (this: App, newUrl: string | null) {
  return this.internal.updateBaseUrl(newUrl ?? undefined);
};
