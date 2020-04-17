import { expect } from "chai";

import { Credentials } from "realm-web";

import { createApp } from "./utils";

const runNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

describe("EmailPasswordAuthProvider", () => {
    // TODO: Fix this test
    it.skip("registers a user", async () => {
        const app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        const email = `test-user-${runNumber}@testing.mongodb.com`;
        const password = "my-super-secret-password";
        // List all existing keys
        await app.auth.emailPassword.registerUser(email, password);
        // Authenticate
        const newCredentials = Credentials.usernamePassword(email, password);
        await app.logIn(newCredentials);
    });
});
