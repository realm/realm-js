import { expect } from "chai";

import { App, Credentials } from "realm-web";

import { createApp } from "./utils";

describe("ApiKeyAuthProvider", () => {
    it("lists, creates, gets, enables, authenticates, disables and deletes api keys", async () => {
        const app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        // List all existing keys
        const keys = await app.auth.apiKey.list();
        console.log(keys);
        // Create an api key
        const key = await app.auth.apiKey.create("my-key");
        console.log(key);
    });
});
