import { expect } from "chai";

import { MockApp } from "./test/MockApp";
import { User } from "./User";

describe("User", () => {
    it("sends a request when logging in", async () => {
        const app = new MockApp("my-mocked-app");
        const user = new User({
            app,
            accessToken: "deadbeef",
            refreshToken: "very-refreshing"
        });
        // Assume that the user has an access token
        expect(user.accessToken).to.equal("deadbeef");
    });
});
