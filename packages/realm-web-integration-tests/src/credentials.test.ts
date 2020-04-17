import { expect } from "chai";

import { Credentials, User } from "realm-web";

import { createApp } from "./utils";

describe("Realm.Credentials", () => {
    describe("AnonymousCredentials", () => {
        it("can authenticate", async () => {
            const app = createApp();
            const credentials = Credentials.anonymous();
            const user = await app.logIn(credentials);
            expect(user).to.be.instanceOf(User);
        });
    });

    describe("UsernamePasswordCredentials", () => {
        // TODO: Re-enable when we have a way to register users
        it.skip("can authenticate", async () => {
            const app = createApp();
            const credentials = Credentials.emailPassword(
                "gilfoil@testing.mongodb.com",
                "v3ry-s3cret",
            );
            const user = await app.logIn(credentials);
            expect(user).to.be.instanceOf(User);
        });
    });
});
