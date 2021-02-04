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

import { User } from "..";
import { ApiKeyAuth } from "../auth-providers/ApiKeyAuth";

import {
    ACCEPT_JSON_HEADERS,
    SENDING_JSON_HEADERS,
    MockFetcher,
} from "./utils";

describe("ApiKeyAuth", () => {
    it("can create an api key", async () => {
        const fetcher = new MockFetcher([
            {
                _id: {
                    $oid: "deadbeefdeadbeefdeadbeef",
                },
                name: "my-key-name",
                key: "super-secret-key",
                disabled: true,
            },
        ]);

        const client = new ApiKeyAuth(fetcher);

        const apiKey = await client.create("my-key-name");
        // Expect something of the newly created key
        expect(typeof apiKey._id).equals("object");
        expect(apiKey._id.constructor.name).equals("ObjectId");
        expect(apiKey.name).equals("my-key-name");
        expect(apiKey.key).equals("super-secret-key");
        expect(apiKey.disabled).equals(true);
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "POST",
                url: "http://localhost:1337/api/client/v2.0/auth/api_keys",
                body: {
                    name: "my-key-name",
                },
                headers: SENDING_JSON_HEADERS,
            },
        ]);
    });

    it("can get an api key", async () => {
        const fetcher = new MockFetcher([
            {
                _id: "deadbeefdeadbeefdeadbeef",
                name: "my-key-name",
                key: "super-secret-key",
                disabled: true,
            },
        ]);

        const client = new ApiKeyAuth(fetcher);

        const apiKey = await client.fetch("deadbeefdeadbeefdeadbeef");
        // Expect something of the key
        expect(apiKey._id).equals("deadbeefdeadbeefdeadbeef");
        expect(apiKey.name).equals("my-key-name");
        expect(apiKey.key).equals("super-secret-key");
        expect(apiKey.disabled).equals(true);
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "GET",
                url:
                    "http://localhost:1337/api/client/v2.0/auth/api_keys/deadbeefdeadbeefdeadbeef",
                headers: ACCEPT_JSON_HEADERS,
            },
        ]);
    });

    it("can list all api keys", async () => {
        const fetcher = new MockFetcher([
            [
                {
                    _id: "deadbeefdeadbeefdeadbee1",
                    name: "my-key-name-1",
                    key: "super-secret-key-1",
                    disabled: true,
                },
                {
                    _id: "deadbeefdeadbeefdeadbee2",
                    name: "my-key-name-2",
                    key: "super-secret-key-2",
                    disabled: true,
                },
            ],
        ]);

        const client = new ApiKeyAuth(fetcher);

        const apiKeys = await client.fetchAll();
        // Expect something of the first key
        const [firstKey, secondKey] = apiKeys;
        expect(firstKey._id).equals("deadbeefdeadbeefdeadbee1");
        expect(firstKey.name).equals("my-key-name-1");
        expect(firstKey.key).equals("super-secret-key-1");
        expect(firstKey.disabled).equals(true);
        // Expect something of the second key
        expect(secondKey._id).equals("deadbeefdeadbeefdeadbee2");
        expect(secondKey.name).equals("my-key-name-2");
        expect(secondKey.key).equals("super-secret-key-2");
        expect(secondKey.disabled).equals(true);
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "GET",
                url: "http://localhost:1337/api/client/v2.0/auth/api_keys",
                headers: ACCEPT_JSON_HEADERS,
            },
        ]);
    });

    it("can delete a key", async () => {
        const fetcher = new MockFetcher([{}], {
            currentUser: { refreshToken: "very-refreshing" } as User,
        });
        const client = new ApiKeyAuth(fetcher);

        await client.delete("deadbeefdeadbeefdeadbeef");
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "DELETE",
                url:
                    "http://localhost:1337/api/client/v2.0/auth/api_keys/deadbeefdeadbeefdeadbeef",
                headers: {
                    ...ACCEPT_JSON_HEADERS,
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
    });

    it("can enable a key", async () => {
        const fetcher = new MockFetcher([{}], {
            currentUser: { refreshToken: "very-refreshing" } as User,
        });
        const client = new ApiKeyAuth(fetcher);

        await client.enable("deadbeefdeadbeefdeadbeef");
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "PUT",
                url:
                    "http://localhost:1337/api/client/v2.0/auth/api_keys/deadbeefdeadbeefdeadbeef/enable",
                headers: {
                    ...ACCEPT_JSON_HEADERS,
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
    });

    it("can disable a key", async () => {
        const fetcher = new MockFetcher([{}], {
            currentUser: { refreshToken: "very-refreshing" } as User,
        });
        const client = new ApiKeyAuth(fetcher);

        await client.disable("deadbeefdeadbeefdeadbeef");
        // Expect something of the request
        expect(fetcher.requests).deep.equals([
            {
                method: "PUT",
                url:
                    "http://localhost:1337/api/client/v2.0/auth/api_keys/deadbeefdeadbeefdeadbeef/disable",
                headers: {
                    ...ACCEPT_JSON_HEADERS,
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
    });
});
