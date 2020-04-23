import { expect } from "chai";

import * as Realm from ".";

describe("Realm Web module", () => {
    it("expose the App constructor", () => {
        expect(typeof Realm.App).to.equal("function");
    });

    describe("Credentials", () => {
        it("expose a credentials factory", () => {
            expect(typeof Realm.Credentials).to.equal("function");
        });
    });

    describe("static app function", () => {
        it("return the same App instance only if ids match", () => {
            const app1 = Realm.app("default-app-id");
            expect(app1).to.be.instanceOf(Realm.App);
            const app2 = Realm.app("default-app-id");
            expect(app2).to.equal(app1);
            const app3 = Realm.app("another-app-id");
            expect(app2).to.not.equal(app3);
        });
    });
});
