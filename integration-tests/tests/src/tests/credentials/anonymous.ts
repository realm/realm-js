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
import { buildAppConfig } from "../../utils/build-app-config";

describe.skipIf(environment.missingServer, "anonymous credentials", () => {
  importAppBefore(buildAppConfig("with-anon").anonAuth());

  it("authenticates", async function (this: AppContext) {
    const credentials = Credentials.anonymous();
    const user = await this.app.logIn(credentials);
    expect(user).instanceOf(User);
  });
});
