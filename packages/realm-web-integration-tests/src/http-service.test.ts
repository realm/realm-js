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
import { Credentials } from "realm-web";

import { createApp } from "./utils";

describe("HTTP", () => {
    let app: Realm.App;

    before(async () => {
        // Create an app
        app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
    });

    it("can send GET request", async () => {
        const http = app.services.http("custom-http-service");
        const response = await http.get(
            "https://api.github.com/repos/realm/realm-js",
        );
        expect(response.status).equals("200 OK");
        expect(response.statusCode).equals(200);
        const body = JSON.parse(response.body.value());
        expect(body.name).equals("realm-js");
    });
});
