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
import { serialize } from "v8";
import { EJSON } from "bson";

import { importAppBefore } from "../../hooks";

describe.skipIf(environment.missingServer, "custom-function credentials", () => {
  importAppBefore("with-custom-function");

  it("authenticates", async function (this: AppContext) {
    this.timeout(60 * 1000); // 1 min
    // Log in
    const credentials = Credentials.function({
      username: "my-very-own-username",
      secret: "v3ry-s3cret",
    });
    const user = await this.app.logIn(credentials);
    expect(user).to.be.instanceOf(User);
  });
});
