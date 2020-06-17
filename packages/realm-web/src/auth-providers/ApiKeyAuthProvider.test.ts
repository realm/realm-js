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
import { ObjectId } from "bson";

import { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";
import { MockTransport } from "../test/MockTransport";

const DEFAULT_HEADERS = {
    Accept: "application/json",
    "Content-Type": "application/json",
};

describe("ApiKeyAuthProvider", () => {
    it("can create an api key", async () => {
        const transport = new MockTransport([
            {
                _id: {
                    $oid: "deadbeefdeadbeefdeadbeef",
                },
                name: "my-key-name",
                key: "super-secret-key",
                disabled: true,
            },
        ]);
        const provider = new ApiKeyAuthProvider(transport);
        const apiKey = await provider.create("my-key-name");
        // Expect something of the newly created key
        expect(typeof apiKey._id).equals("object");
        expect(apiKey._id.constructor.name).equals("ObjectId");
        expect(apiKey.name).equals("my-key-name");
        expect(apiKey.key).equals("super-secret-key");
        expect(apiKey.disabled).equals(true);
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url: "http://localhost:1337/auth/api_keys",
                body: {
                    name: "my-key-name",
                },
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("can get an api key", async () => {
        const transport = new MockTransport([
            {
                _id: {
                    $oid: "deadbeefdeadbeefdeadbeef",
                },
                name: "my-key-name",
                key: "super-secret-key",
                disabled: true,
            },
        ]);
        const provider = new ApiKeyAuthProvider(transport);
        const apiKey = await provider.fetch(
            ObjectId.createFromHexString("deadbeefdeadbeefdeadbeef"),
        );
        // Expect something of the key
        expect(typeof apiKey._id).equals("object");
        expect(apiKey._id.constructor.name).equals("ObjectId");
        expect(apiKey._id.toHexString()).equals("deadbeefdeadbeefdeadbeef");
        expect(apiKey.name).equals("my-key-name");
        expect(apiKey.key).equals("super-secret-key");
        expect(apiKey.disabled).equals(true);
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "GET",
                url:
                    "http://localhost:1337/auth/api_keys/deadbeefdeadbeefdeadbeef",
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("can list all api keys", async () => {
        const transport = new MockTransport([
            [
                {
                    _id: {
                        $oid: "deadbeefdeadbeefdeadbee1",
                    },
                    name: "my-key-name-1",
                    key: "super-secret-key-1",
                    disabled: true,
                },
                {
                    _id: {
                        $oid: "deadbeefdeadbeefdeadbee2",
                    },
                    name: "my-key-name-2",
                    key: "super-secret-key-2",
                    disabled: true,
                },
            ],
        ]);
        const provider = new ApiKeyAuthProvider(transport);
        const apiKeys = await provider.fetchAll();
        // Expect something of the first key
        const [firstKey, secondKey] = apiKeys;
        expect(firstKey._id.toHexString()).equals("deadbeefdeadbeefdeadbee1");
        expect(firstKey.name).equals("my-key-name-1");
        expect(firstKey.key).equals("super-secret-key-1");
        expect(firstKey.disabled).equals(true);
        // Expect something of the second key
        expect(secondKey._id.toHexString()).equals("deadbeefdeadbeefdeadbee2");
        expect(secondKey.name).equals("my-key-name-2");
        expect(secondKey.key).equals("super-secret-key-2");
        expect(secondKey.disabled).equals(true);
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "GET",
                url: "http://localhost:1337/auth/api_keys",
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("can delete a key", async () => {
        const transport = new MockTransport([{}]);
        const provider = new ApiKeyAuthProvider(transport);
        await provider.delete(
            ObjectId.createFromHexString("deadbeefdeadbeefdeadbeef"),
        );
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "DELETE",
                url:
                    "http://localhost:1337/auth/api_keys/deadbeefdeadbeefdeadbeef",
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("can enable a key", async () => {
        const transport = new MockTransport([{}]);
        const provider = new ApiKeyAuthProvider(transport);
        await provider.enable(
            ObjectId.createFromHexString("deadbeefdeadbeefdeadbeef"),
        );
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "PUT",
                url:
                    "http://localhost:1337/auth/api_keys/enable/deadbeefdeadbeefdeadbeef",
                headers: DEFAULT_HEADERS,
            },
        ]);
    });

    it("can disable a key", async () => {
        const transport = new MockTransport([{}]);
        const provider = new ApiKeyAuthProvider(transport);
        await provider.disable(
            ObjectId.createFromHexString("deadbeefdeadbeefdeadbeef"),
        );
        // Expect something of the request
        expect(transport.requests).deep.equals([
            {
                method: "PUT",
                url:
                    "http://localhost:1337/auth/api_keys/disable/deadbeefdeadbeefdeadbeef",
                headers: DEFAULT_HEADERS,
            },
        ]);
    });
});
