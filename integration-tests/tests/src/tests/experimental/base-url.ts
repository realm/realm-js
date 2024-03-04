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
import { App } from "realm";
import "realm/experimental/base-url";

describe("Experimental", () => {
  it("updates base URL", function (this: Mocha.Context) {
    const app = new App("12345");
    expect(app.baseUrl).equals("https://realm.mongodb.com");

    // @ts-expect-error Assigning to read-only property.
    expect(() => (app.baseUrl = "new URL")).to.throw("Cannot assign the base URL, please use `updateBaseUrl()`");
    expect(app.baseUrl).equals("https://realm.mongodb.com");

    // Update to a URL that will not work.
    expect(app.updateBaseUrl("https://example")).to.be.rejectedWith("Error: request to https://example/");
  });
});
