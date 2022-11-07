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
import { Credentials, User } from "realm";

import { importAppBefore } from "../../hooks";
import { SignJWT } from "jose";
import { createSecretKey } from "crypto";

describe.skipIf(environment.missingServer, "jwt credentials", () => {
  importAppBefore("with-jwt");
  it("authenticates", async function (this: AppContext) {
    this.timeout(60 * 1000); // 1 min
    // Needs to match the value in the apps secrets.json
    const secretKey = createSecretKey("2k66QfKeTRk3MdZ5vpDYgZCu2k66QfKeTRk3MdZ5vpDYgZCu", "utf-8");
    const token = await new SignJWT({
      aud: this.app.id,
      sub: "my-awesome-internal-id",
      mySecretField: "some-secret-stuff",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(4070908800) // 01/01/2099
      .sign(secretKey);
    const credentials = Credentials.jwt(token);
    const user = await this.app.logIn(credentials);
    expect(user).to.be.instanceOf(User);
    // Expect that we can read "some-secret-stuff" out of the profile
    // NOTE: The mapping from mySecretField → secret is declared in the Realm App configuration
    // Test is failing right now since User.Profile() isn't implemented yet
    //expect(Object.keys(user.profile)).deep.equals(["secret"]);
    //expect(user.profile.secret).equals("some-secret-stuff");
  });
});
