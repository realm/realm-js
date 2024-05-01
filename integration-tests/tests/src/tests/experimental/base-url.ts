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

import { expect } from "chai";
import "realm/experimental/base-url";

import { baseUrl as originalBaseUrl, importAppBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

describe.skipIf(environment.missingServer, "Base URL", () => {
  importAppBefore(buildAppConfig("with-anon").anonAuth());

  it("returns the base URL used", function (this: AppContext) {
    expect(this.app.baseUrl).equals(originalBaseUrl);
  });

  // TODO: Should implement when I've got a working fetch mock.
  it.skip("updates the URL", async function (this: AppContext) {
    // TODO
  });

  it.skip("resets to default URL", async function (this: AppContext) {
    // TODO
  });

  it("throws when assigning via setter", function (this: AppContext) {
    // @ts-expect-error Assigning to read-only property.
    expect(() => (this.app.baseUrl = "new URL")).to.throw("Cannot assign the base URL, please use 'updateBaseUrl()'");

    expect(this.app.baseUrl).equals(originalBaseUrl);
  });

  it("rejects when updating to invalid URL", async function (this: AppContext) {
    await expect(this.app.updateBaseUrl("https://invalid")).to.be.rejectedWith(
      "request to https://invalid/api/client/",
    );

    expect(this.app.baseUrl).equals(originalBaseUrl);
  });
});
