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

import { expect } from "chai";
import Realm from "realm";

import { authenticateUserBefore, importAppBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

describe("Realm.open on a sync Realm", () => {
  importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
  authenticateUserBefore();

  it("fails gracefully when canceled while opening", async function (this: UserContext) {
    const result = Realm.open({ sync: { flexible: true, user: this.user } });
    result.cancel();
    await expect(result).to.be.rejectedWith("Async open canceled");
  });

  it("fails gracefully when clearing test state while opening", async function (this: UserContext) {
    const result = Realm.open({ sync: { flexible: true, user: this.user } });
    Realm.clearTestState();
    await expect(result).to.be.rejectedWith("Async open canceled");
  });
});
