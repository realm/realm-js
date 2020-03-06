import { expect } from "chai";

import { App, Credentials, User } from "realm-web";

// This global is injected by WebPack
declare const APP_ID: string;

describe("Realm.Credentials", () => {
    describe("AnonymousCredentials", () => {
        it("can authenticate", async () => {
            const app = new App(APP_ID, {
                baseUrl: "http://localhost:8080"
            });
            const credentials = Credentials.anonymous();
            const user = await app.login(credentials);
            expect(user).to.be.instanceOf(User);
        });
    });
});
