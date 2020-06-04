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

import { AuthenticatedTransport } from "./AuthenticatedTransport";
import { MockTransport } from "../test/MockTransport";

describe("AuthenticatedTransport", () => {
    it("constructs", () => {
        const transport = new AuthenticatedTransport(new MockTransport(), {
            currentUser: null,
        });
        expect(typeof transport.fetch).equals("function");
    });

    it("sends access token when requesting", async () => {
        const baseTransport = new MockTransport([{ foo: "bar" }]);
        const transport = new AuthenticatedTransport(baseTransport, {
            currentUser: { accessToken: "my-access-token" } as Realm.User,
        });
        // Send a request
        const response = await transport.fetch({
            method: "POST",
            path: "/w00t",
            body: { something: "interesting" },
            headers: { Cookie: "yes-please" },
        });
        // Expect something of the request and response
        expect(baseTransport.requests).deep.equals([
            {
                method: "POST",
                url: "http://localhost:1337/w00t",
                body: { something: "interesting" },
                headers: {
                    Cookie: "yes-please",
                    Accept: "application/json",
                    Authorization: "Bearer my-access-token",
                    "Content-Type": "application/json",
                },
            },
        ]);
        expect(response).deep.equals({ foo: "bar" });
    });

    it("allows overwriting headers", async () => {
        const baseTransport = new MockTransport([{}]);
        const transport = new AuthenticatedTransport(baseTransport, {
            currentUser: { accessToken: "my-access-token" } as Realm.User,
        });
        // Send a request
        await transport.fetch({
            method: "GET",
            path: "/w00t",
            headers: {
                Authorization: "Bearer my-custom-token",
            },
        });
        // Expect something of the request
        expect(baseTransport.requests).deep.equals([
            {
                method: "GET",
                url: "http://localhost:1337/w00t",
                headers: {
                    Authorization: "Bearer my-custom-token",
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            },
        ]);
    });
});
