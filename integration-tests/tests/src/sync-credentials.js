////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

const { expect } = require("chai");

describe("Realm.Sync.Credentials", () => {
    it("defines the object", () => {
        expect(Realm).has.key('Sync');
        expect(Realm.Sync).has.key('User');
        expect(Realm.Sync.Credentials).to.be.an("object");
    });

    it("can build admin-token credentials", () => {
        const credentials = Realm.Sync.Credentials.adminToken("secret-admin-token");
        expect(credentials).to.deep.equal({
            identityProvider: "adminToken",
            token: "secret-admin-token",
            userInfo: {},
        });
    });

    it("can build anonymous credentials", () => {
        const credentials = Realm.Sync.Credentials.anonymous();
        expect(credentials).to.deep.equal({
            identityProvider: "anonymous",
            token: undefined,
            userInfo: {},
        });
    });

    it("can build azureAD credentials", () => {
        const credentials = Realm.Sync.Credentials.azureAD("secret-azure-ad-token");
        expect(credentials).to.deep.equal({
            identityProvider: "azuread",
            token: "secret-azure-ad-token",
            userInfo: {},
        });
    });

    it("can build custom credentials", () => {
        const credentials = Realm.Sync.Credentials.custom("custom-provider", "token-a", { customProperty: "customValue" });
        expect(credentials).to.deep.equal({
            identityProvider: "custom-provider",
            token: "token-a",
            userInfo: { customProperty: "customValue" },
        });
    });

    it("can build facebook credentials", () => {
        const credentials = Realm.Sync.Credentials.facebook("facebook-token");
        expect(credentials).to.deep.equal({
            identityProvider: "facebook",
            token: "facebook-token",
            userInfo: {},
        });
    });

    it("can build google credentials", () => {
        const credentials = Realm.Sync.Credentials.google("google-token");
        expect(credentials).to.deep.equal({
            identityProvider: "google",
            token: "google-token",
            userInfo: {},
        });
    });

    it("can build jwt credentials", () => {
        const credentials = Realm.Sync.Credentials.jwt("jwt-token");
        expect(credentials).to.deep.equal({
            identityProvider: "jwt",
            token: "jwt-token",
            userInfo: {},
        });
    });

    it("can build jwt credentials (with custom providerName)", () => {
        const credentials = Realm.Sync.Credentials.jwt("jwt-token", "jwt/custom-name");
        expect(credentials).to.deep.equal({
            identityProvider: "jwt/custom-name",
            token: "jwt-token",
            userInfo: {},
        });
    });

    it("can build nickname credentials", () => {
        const credentials = Realm.Sync.Credentials.nickname("nicky");
        expect(credentials).to.deep.equal({
            identityProvider: "nickname",
            token: "nicky",
            userInfo: {
                is_admin: false,
            },
        });
    });

    it("can build nickname credentials (as an admin)", () => {
        const credentials = Realm.Sync.Credentials.nickname("nicky", true);
        expect(credentials).to.deep.equal({
            identityProvider: "nickname",
            token: "nicky",
            userInfo: {
                is_admin: true,
            },
        });
    });

    it("can build username + password credentials", () => {
        const credentials = Realm.Sync.Credentials.usernamePassword("someone", "very-secret");
        expect(credentials).to.deep.equal({
            identityProvider: "password",
            token: "someone",
            userInfo: {
                password: "very-secret",
                register: undefined,
            },
        });
    });

    it("can build username + password credentials (creating the user)", () => {
        const credentials = Realm.Sync.Credentials.usernamePassword("someone", "very-secret", true);
        expect(credentials).to.deep.equal({
            identityProvider: "password",
            token: "someone",
            userInfo: {
                password: "very-secret",
                register: true,
            },
        });
    });
});
