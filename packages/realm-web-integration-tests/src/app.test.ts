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

import { App, Credentials } from "realm-web";

import { createApp, clearStorage } from "./utils";

async function logOutAllUsers(app: App<object>) {
    for (const user of app.allUsers) {
        await user.logOut();
    }
}

describe("App#constructor", () => {
    it("constructs", () => {
        const app = new App("default-app-id");
        expect(app).to.be.instanceOf(App);
    });

    afterEach(() => {
        clearStorage();
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
        // Switch back to the first user
        app.switchUser(user1);
        expect(app.currentUser).equals(user1);
        expect(app.allUsers).deep.equals([user1, user2]);
        // Switch back to the second user
        app.switchUser(user2);
        expect(app.currentUser).equals(user2);
        expect(app.allUsers).deep.equals([user2, user1]);
        // Switch back to the first user and log out
        app.switchUser(user1);
        expect(app.currentUser).equals(user1);
        await user1.logOut();
        expect(app.currentUser).equals(user2);
        expect(app.allUsers).deep.equals([user2, user1]);
        await app.removeUser(user1);
        expect(app.allUsers).deep.equals([user2]);
    });
});
