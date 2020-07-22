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

import { Fetcher } from "../Fetcher";
import { User } from "../User";
import * as urls from "../urls";

import {
    MockNetworkTransport,
    DEFAULT_BODY_HEADERS,
    DEFAULT_HEADERS,
} from "./utils";

describe("Fetcher", () => {
    it("constructs", () => {
        const fetcher = new Fetcher({
            appId: "test-app-id",
            baseUrl: "http://localhost:1337",
            transport: new MockNetworkTransport(),
            userContext: { currentUser: null },
        });
        expect(typeof fetcher.fetch).equals("function");
    });

    it("sends access token when requesting", async () => {
        const transport = new MockNetworkTransport([{ foo: "bar" }]);
        const fetcher = new Fetcher({
            appId: "test-app-id",
            baseUrl: "http://localhost:1337",
            transport,
            userContext: {
                currentUser: { accessToken: "my-access-token" } as User,
            },
        });
        // Send a request
        const response = await fetcher.fetchJSON({
            method: "POST",
            url: "http://localhost:1337/w00t",
            body: { something: "interesting" },
            headers: { Cookie: "yes-please" },
        });
        // Expect something of the request and response
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url: "http://localhost:1337/w00t",
                body: { something: "interesting" },
                headers: {
                    ...DEFAULT_BODY_HEADERS,
                    Cookie: "yes-please",
                    Authorization: "Bearer my-access-token",
                },
            },
        ]);
        expect(response).deep.equals({ foo: "bar" });
    });

    it("allows overwriting headers", async () => {
        const transport = new MockNetworkTransport([{}]);
        const fetcher = new Fetcher({
            appId: "test-app-id",
            baseUrl: "http://localhost:1337",
            transport,
            userContext: {
                currentUser: { accessToken: "my-access-token" } as User,
            },
        });
        // Send a request
        await fetcher.fetchJSON({
            method: "GET",
            url: "http://localhost:1337/w00t",
            headers: {
                Authorization: "Bearer my-custom-token",
            },
        });
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "GET",
                url: "http://localhost:1337/w00t",
                headers: {
                    ...DEFAULT_HEADERS,
                    Authorization: "Bearer my-custom-token",
                },
            },
        ]);
    });
});
