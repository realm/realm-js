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

import { Credentials } from "realm";
import { expect } from "chai";

import { importAppBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

describe("User listener", () => {
  importAppBefore(buildAppConfig().emailPasswordAuth());

  it("is able to access app.currentUser", async function (this: AppContext) {
    this.timeout(10000);

    const email = `alice@testing.mongodb.com`;
    const password = "my-super-secret-password";

    await this.app.emailPasswordAuth.registerUser({ email, password });

    const credentials = Credentials.emailPassword(email, password);

    const user = await this.app.logIn(credentials);
    user.addListener(() => {
      console.log("Calling app.currentUser");
      expect(user.id).equals(this.app.currentUser?.id);
    });
    await this.app.logIn(credentials);
  });
});
