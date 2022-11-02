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
import { expect } from "chai";
import { Credentials, Realm, User } from "realm";
import { importAppBefore } from "../../hooks";

describe.skipIf(environment.missingServer, "email-password credentials", () => {
  importAppBefore("with-email-password-auth");

  it("authenticates", async function (this: AppContext) {
    const credential_blob = { email: "validEmail", password: "validPassword" };
    await this.app.emailPasswordAuth.registerUser(credential_blob);
    const user = await this.app.logIn(Credentials.emailPassword(credential_blob));
    expect(user).instanceOf(User);
  });
});
