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

import { createService } from "../services/HTTPService";

import { SENDING_JSON_HEADERS, MockFetcher } from "./utils";

describe("HTTP service", () => {
    it("sends a GET request", async () => {
        const fetcher = new MockFetcher([
            {
                hello: "world",
            },
        ]);
        const service = createService(fetcher, "my-http-service");
        const result = await service.get("http://localhost:1234/some-path", {
            headers: { "content-type": ["application/json"] },
        });
        expect(result).deep.equals({ hello: "world" });
        expect(fetcher.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/mocked-app-id/functions/call",
                body: {
                    name: "get",
                    service: "my-http-service",
                    arguments: [
                        {
                            headers: { "content-type": ["application/json"] },
                            url: "http://localhost:1234/some-path",
                        },
                    ],
                },
                headers: SENDING_JSON_HEADERS,
            },
        ]);
    });

    it("sends a POST request", async () => {
        const fetcher = new MockFetcher([{}]);
        const service = createService(fetcher);
        await service.post("http://localhost:1234/some-path");
        expect(fetcher.requests[0].body.name).equals("post");
    });

    it("sends a PUT request", async () => {
        const fetcher = new MockFetcher([{}]);
        const service = createService(fetcher);
        await service.put("http://localhost:1234/some-path");
        expect(fetcher.requests[0].body.name).equals("put");
    });

    it("sends a DELETE request", async () => {
        const fetcher = new MockFetcher([{}]);
        const service = createService(fetcher);
        await service.delete("http://localhost:1234/some-path");
        expect(fetcher.requests[0].body.name).equals("delete");
    });

    it("sends a HEAD request", async () => {
        const fetcher = new MockFetcher([{}]);
        const service = createService(fetcher);
        await service.head("http://localhost:1234/some-path");
        expect(fetcher.requests[0].body.name).equals("head");
    });

    it("sends a PATCH request", async () => {
        const fetcher = new MockFetcher([{}]);
        const service = createService(fetcher);
        await service.patch("http://localhost:1234/some-path");
        expect(fetcher.requests[0].body.name).equals("patch");
    });
});
