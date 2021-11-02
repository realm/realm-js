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

import { EmailPasswordAuth } from "../auth-providers";

import { SENDING_JSON_HEADERS, MockFetcher } from "./utils";

describe("EmailPasswordAuth", () => {
  let fetcher: MockFetcher;
  let client: EmailPasswordAuth;

  beforeEach(() => {
    fetcher = new MockFetcher([
      {
        _id: {
          $oid: "deadbeefdeadbeefdeadbeef",
        },
        name: "my-key-name",
        key: "super-secret-key",
        disabled: true,
      },
    ]);
    client = new EmailPasswordAuth(fetcher);
  });

  it("can register a user", async () => {
    // Make a request
    await client.registerUser({ email: "gilfoyle@testing.mongodb.com", password: "s3cr3t" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/register",
        body: {
          email: "gilfoyle@testing.mongodb.com",
          password: "s3cr3t",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can confirm a user", async () => {
    // Make a request
    await client.confirmUser({ token: "token-value", tokenId: "token-id-value" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/confirm",
        body: {
          token: "token-value",
          tokenId: "token-id-value",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can request a resend of confirmation", async () => {
    // Make a request
    await client.resendConfirmationEmail({ email: "gilfoyle@testing.mongodb.com" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/confirm/send",
        body: {
          email: "gilfoyle@testing.mongodb.com",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can request a retry of custom confirmation", async () => {
    // Make a request
    await client.retryCustomConfirmation({ email: "gilfoyle@testing.mongodb.com" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/confirm/call",
        body: {
          email: "gilfoyle@testing.mongodb.com",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can reset a password", async () => {
    // Make a request
    await client.resetPassword({ token: "token-value", tokenId: "token-id-value", password: "my-new-password" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/reset",
        body: {
          token: "token-value",
          tokenId: "token-id-value",
          password: "my-new-password",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can request a password reset", async () => {
    // Make a request
    await client.sendResetPasswordEmail({ email: "gilfoyle@testing.mongodb.com" });
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/reset/send",
        body: {
          email: "gilfoyle@testing.mongodb.com",
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });

  it("can reset a password via a function", async () => {
    // Make a request
    await client.callResetPasswordFunction(
      { email: "gilfoyle@testing.mongodb.com", password: "my-new-password" },
      {
        someObjectId: ObjectId.createFromHexString("5f84057629c14b540462cd1d"),
      },
    );
    // Expect something of the request
    expect(fetcher.requests).deep.equals([
      {
        method: "POST",
        url: "http://localhost:1337/api/client/v2.0/app/mocked-app-id/auth/providers/local-userpass/reset/call",
        body: {
          email: "gilfoyle@testing.mongodb.com",
          password: "my-new-password",
          arguments: [{ someObjectId: { $oid: "5f84057629c14b540462cd1d" } }],
        },
        headers: SENDING_JSON_HEADERS,
      },
    ]);
  });
});
