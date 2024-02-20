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

import nodeFetch from "node-fetch";
import Realm from "realm";

import { importAppBefore } from "../hooks";
import { buildAppConfig } from "../utils/build-app-config";
import { baseUrl } from "../hooks/import-app-before";

describe("passing node-fetch to AppConfiguration", () => {
  importAppBefore(buildAppConfig().anonAuth());

  it("is supported", async function (this: AppContext) {
    const app = new Realm.App({ id: this.app.id, baseUrl, fetch: nodeFetch });
    await app.logIn(Realm.Credentials.anonymous());
  });
});
