import { expect } from "chai";

import { App } from "./App";
import { User } from "./User";
import { Credentials } from "./Credentials/index";
import { MockNetworkTransport } from "./test/MockNetworkTransport";

describe("App", () => {
    it("can call the App as a constructor", () => {
        const app = new App("default-app-id");
        expect(app).to.be.instanceOf(App);
    });

    it("can call the App as a constructor with options", () => {
        const app = new App("default-app-id", {
            baseUrl: "http://localhost:3000"
        });
        expect(app).to.be.instanceOf(App);
        expect(app.baseUrl).to.equal("http://localhost:3000");
    });

    it("throws if no id is provided", () => {
        expect(() => {
            // Call the constructor without providing an id
            const app = new (App as any)();
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("throws if an object is provided instead of an id", () => {
        expect(() => {
            // Call the constructor providing a non-string as id
            const app = new (App as any)({});
        }).to.throw("Missing a MongoDB Realm app-id");
    });

    it("expose the id", () => {
        const app = new App("default-app-id");
        expect(app.id).to.equal("default-app-id");
    });

    it("expose a baseUrl", () => {
        const app = new App("default-app-id");
        expect(typeof app.baseUrl).to.equal("string");
    });

    it("expose a functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions).to.equal("object");
    });

    it("expose a callable functions factory", () => {
        const app = new App("default-app-id");
        expect(typeof app.functions.hello).to.equal("function");
    });

    it("can log in a user", async () => {
        const transport = new MockNetworkTransport([
            {
                access_token: "deadbeef",
                refresh_token: "very-refreshing"
            }
        ]);
        const app = new App("default-app-id", {
            transport,
            baseUrl: "http://localhost:1337"
        });
        const credentials = Credentials.usernamePassword(
            "gilfoil",
            "v3ry-s3cret"
        );
        const user = await app.logIn(credentials);
        // Assume logging in returns a user
        expect(user).to.be.instanceOf(User);
        // Assume that the user has an access token
        expect(user.accessToken).to.equal("deadbeef");
        // Assume the request made it to the transport
        expect(transport.requests).deep.equals([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/local-userpass/login",
                body: { username: "gilfoil", password: "v3ry-s3cret" }
            }
        ]);
    });

    it("expose a callable functions factory", async () => {
        const transport = new MockNetworkTransport([
            {
                access_token: "deadbeef",
                refresh_token: "very-refreshing"
            },
            { msg: "hi there!" }
        ]);
        const app = new App("default-app-id", {
            transport,
            baseUrl: "http://localhost:1337"
        });
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        // Call the function
        const response = await app.functions.hello();
        expect(response).to.deep.equal({ msg: "hi there!" });
        expect(transport.requests).to.deep.equal([
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/auth/providers/anon-user/login",
                body: {}
            },
            {
                method: "POST",
                url:
                    "http://localhost:1337/api/client/v2.0/app/default-app-id/functions/call",
                body: { name: "hello", arguments: [] },
                headers: { Authorization: "Bearer deadbeef" }
            }
        ]);
    });
});
