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

import { Credentials } from "..";

describe("Credentials", () => {
    it("expose the anonymous credentials", () => {
        expect(typeof Credentials.anonymous).equals("function");
        const credentials = Credentials.anonymous();
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({});
    });

    it("expose the email/password credentials", () => {
        expect(typeof Credentials.emailPassword).equals("function");
        const credentials = Credentials.emailPassword(
            "gilfoyle@testing.mongodb.com",
            "s3cr3t",
        );
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({
            username: "gilfoyle@testing.mongodb.com",
            password: "s3cr3t",
        });
    });

    describe("Google", () => {
        it("is exposed", () => {
            expect(typeof Credentials.google).equals("function");
        });

        it("produce a redirectUrl payload from a string", () => {
            const credentials = Credentials.google(
                "https://localhost:1337/google-redirect",
            );
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                redirectUrl: "https://localhost:1337/google-redirect",
            });
        });

        it("produce an OAuth 2.0 auth code payload from a string", () => {
            const credentials = Credentials.google("4/some-auth-code");
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                authCode: "4/some-auth-code",
            });
        });

        it("produce an OAuth 2.0 OpenID Connect id token payload from a string", () => {
            const credentials = Credentials.google(
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.Et9HFtf9R3GEMA0IICOfFMVXY7kkTX1wr4qCyhIf58U",
            );
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                // eslint-disable-next-line @typescript-eslint/camelcase
                id_token:
                    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.Et9HFtf9R3GEMA0IICOfFMVXY7kkTX1wr4qCyhIf58U",
            });
        });

        it("produce redirect payloads payloads", () => {
            const credentials = Credentials.google({
                redirectUrl: "some-redirect-url",
            });
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                redirectUrl: "some-redirect-url",
            });
        });

        it("produce auth codes payloads", () => {
            const credentials = Credentials.google({
                authCode: "some-auth-code",
            });
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                authCode: "some-auth-code",
            });
        });

        it("produce id token payloads", () => {
            const credentials = Credentials.google({
                idToken: "some-id-token",
            });
            expect(credentials).to.be.instanceOf(Credentials);
            expect(credentials.payload).deep.equals({
                // eslint-disable-next-line @typescript-eslint/camelcase
                id_token: "some-id-token",
            });
        });

        it("throws if an unexpected format is encountered", () => {
            expect(() => {
                Credentials.google("whatever");
            }).throws("Unexpected payload: whatever");
        });

        it("throws if called with multiple properties", () => {
            expect(() => {
                Credentials.google({
                    authCode: "some-auth-code",
                    idToken: "an-id-token",
                });
            }).throws("Expected only one property in payload");
        });
    });
});
