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

import { SENDING_JSON_HEADERS, ACCEPT_JSON_HEADERS, createMockFetch } from "./utils";

describe("Fetcher", () => {
  it("constructs", () => {
    const fetcher = new Fetcher({
      appId: "test-app-id",
      fetch: createMockFetch([]),
      userContext: { currentUser: null },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
      },
    });
    expect(typeof fetcher.fetch).equals("function");
  });

  it("sends access token when requesting", async () => {
    const fetch = createMockFetch([{ foo: "bar" }]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      fetch,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
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
    expect(fetch.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/w00t",
        body: { something: "interesting" },
        headers: {
          ...SENDING_JSON_HEADERS,
          Cookie: "yes-please",
          Authorization: "Bearer my-access-token",
        },
      },
    ]);
    expect(response).deep.equals({ foo: "bar" });
  });

  it("allows overwriting headers", async () => {
    const fetch = createMockFetch([{}]);
    const fetcher = new Fetcher({
      appId: "test-app-id",
      fetch,
      userContext: {
        currentUser: { accessToken: "my-access-token" } as User,
      },
      locationUrlContext: {
        locationUrl: Promise.resolve("http://localhost:1337"),
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
    expect(fetch.requests).deep.equals([
      {
        method: "GET",
        url: "http://localhost:1337/w00t",
        headers: {
          ...ACCEPT_JSON_HEADERS,
          Authorization: "Bearer my-custom-token",
        },
      },
    ]);
  });
});
