////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { importAppBefore } from "../hooks";
import { buildAppConfig } from "../utils/build-app-config";
import fetch, { Request } from "node-fetch";
import Realm from "realm";

describe("custom fetch", () => {
  let called = false;

  const HTTP_METHOD: Record<number, string> = {
    [0]: "GET",
    [1]: "POST",
    [2]: "PUT",
    [3]: "PATCH",
    [4]: "DELETE",
  };

  const customFetch = async (request: Request) => {
    called = true;
    const { url, body, ...rest } = request;
    if (typeof request.method == "number") {
      rest.method = HTTP_METHOD[request.method];
    }
    const response = await fetch(url, rest);
    return response;
  };

  importAppBefore(buildAppConfig("with-anon").anonAuth(), { fetchOverride: customFetch });
  afterEach(() => {
    Realm.clearTestState();
  });

  it("custom fetch is called", async function (this: Mocha.Context & AppContext & RealmContext) {
    let user;
    called = false;
    try {
      expect(this.app).instanceOf(Realm.App);
      const credentials = Realm.Credentials.anonymous();
      user = await this.app.logIn(credentials);
      expect(called).equals(true);
      expect(user).instanceOf(Realm.User);
      expect(user.deviceId).to.not.be.null;
      expect(user.providerType).equals("anon-user");
    } finally {
      await user?.logOut();
    }
  });
});
