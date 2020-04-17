import { expect } from "chai";

import { App } from "./App";
import { User, UserState } from "./User";
import { Credentials } from "./Credentials/index";
import { MockNetworkTransport } from "./test/MockNetworkTransport";

/* eslint-disable @typescript-eslint/camelcase */

describe("App", () => {
    it("can call the App as a constructor", () => {
        const app = new App("default-app-id");
        expect(app).to.be.instanceOf(App);
    });

    it("can call the App as a constructor with options", () => {
        const app = new App({
            id: "default-app-id",
            baseUrl: "http://localhost:3000",
        });
        expect(app).to.be.instanceOf(App);
    });

    it("throws if no id is provided", () => {
        expect(() => {
            new (App as any)();
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("throws if an object is provided instead of an id", () => {
        expect(() => {
            new (App as any)({});
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("expose the id", () => {
        const app = new App("default-app-id");
        expect(app.id).equals("default-app-id");
    });

    it("expose a functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions).equals("object");
    });

    it("expose a callable functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions.hello).equals("function");
    });

    it("can log in a user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {
                first_name: "John",
                last_name: "Doe",
            },
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.emailPassword(
            "gilfoil@testing.mongodb.com",
            "v3ry-s3cret",
        );
        const user = await app.logIn(credentials);
        // Expect logging in returns a user
        expect(user).is.instanceOf(User);
        // Expect the user has an id
        expect(user.id).equals("totally-valid-user-id");
        // Expect the user has an access token
        expect(user.accessToken).equal("deadbeef");
        // Expect the user is logged in (active)
        expect(user.state).equals("active");
        expect(user.state).equals(UserState.Active);
        // Expect the request made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/local-userpass/login",
                body: { username: "gilfoil@testing.mongodb.com", password: "v3ry-s3cret" },
            },
            {
                method: "GET",
                url: "http://localhost:1337/api/client/v2.0/auth/profile",
                headers: {
                    Authorization: "Bearer deadbeef",
                },
            },
        ]);
    });

    it("can log out a user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {},
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Expect that we logged in
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        await app.logOut();
        expect(app.currentUser).equals(null);
        expect(user.state).equals(UserState.LoggedOut);
        expect(user.state).equals("logged-out");
        expect(app.allUsers).deep.equals([user]);
        // Assume the correct requests made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
            },
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
    });

    it("can remove an active user", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            {},
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        const user = await app.logIn(credentials, false);
        // Expect that we logged in
        expect(app.currentUser).equals(user);
        expect(app.allUsers).deep.equals([user]);
        await app.removeUser(user);
        expect(app.currentUser).equals(null);
        expect(user.state).equals(UserState.Removed);
        expect(user.state).equals("removed");
        expect(app.allUsers).deep.equals([]);
        // Assume the correct requests made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
            },
            {
                method: "DELETE",
                url: "http://localhost:1337/api/client/v2.0/auth/session",
                headers: {
                    Authorization: "Bearer very-refreshing",
                },
            },
        ]);
    });

    it("expose a callable functions factory", async () => {
        const transport = new MockNetworkTransport([
            {
                user_id: "totally-valid-user-id",
                access_token: "deadbeef",
                refresh_token: "very-refreshing",
            },
            { msg: "hi there!" },
        ]);
        const app = new App({
            id: "default-app-id",
            transport,
            baseUrl: "http://localhost:1337",
        });
        const credentials = Credentials.anonymous();
        await app.logIn(credentials, false);
        // Call the function
        const response = await app.functions.hello();
        expect(response).to.deep.equal({ msg: "hi there!" });
        expect(transport.requests).to.deep.equal([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {},
            },
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/functions/call",
                body: { name: "hello", arguments: [] },
                headers: { Authorization: "Bearer deadbeef" },
            },
        ]);
    });
});
