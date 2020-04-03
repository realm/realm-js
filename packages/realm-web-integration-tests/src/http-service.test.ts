import { expect } from "chai";
import { Credentials } from "realm-web";

import { createApp } from "./utils";

describe("HTTP", () => {
    let app: Realm.App;

    before(async () => {
        // Create an app
        app = createApp();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
    });

    it("can send GET request", async () => {
        const http = app.services.http("custom-http-service");
        const response = await http.get(
            "https://api.github.com/repos/realm/realm-js"
        );
        expect(response.status).equals("200 OK");
        expect(response.statusCode).equals(200);
        const body = JSON.parse(response.body.value());
        expect(body.name).equals("realm-js");
    });
});
