import { expect } from "chai";

import { App, Credentials } from "realm-web";

import { createApp } from "./utils";

describe("App#constructor", () => {
    it("constructs", () => {
        const app = new App("default-app-id");
        expect(app).to.be.instanceOf(App);
    });

    it("can login a user", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials);
        expect(typeof user.id).equals("string");
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
    });

    it("can log in two users, switch between them and log out", async () => {
        const app = createApp();
        const credentials = Credentials.anonymous();
        // Authenticate the first user
        const user1 = await app.logIn(credentials);
        expect(app.currentUser).equals(user1);
        expect(app.allUsers).deep.equals([user1]);
        // Authenticate the second user
        const user2 = await app.logIn(credentials);
        expect(app.currentUser).equals(user2);
        expect(app.allUsers).deep.equals([user2, user1]);
        // Ensure that the two users are not one and the same
        expect(user1.id).to.not.equals(user2.id);
        // Switch back to the first user, by object reference
        app.switchUser(user1);
        expect(app.currentUser).equals(user1);
        expect(app.allUsers).deep.equals([user1, user2]);
        // Switch back to the second user, by user id
        app.switchUser(user2.id);
        expect(app.currentUser).equals(user2);
        expect(app.allUsers).deep.equals([user2, user1]);
        // Switch back to the first user and log out
        app.switchUser(user1);
        expect(app.currentUser).equals(user1);
        await app.logOut();
        expect(app.currentUser).equals(user2);
        expect(app.allUsers).deep.equals([user2, user1]);
    });
});
