import { expect } from "chai";

import { Credentials } from "realm-web";

import { createApp } from "./utils";

interface TranslateFunctions {
    translate: (sentence: string, languages: string) => Promise<string>;
}

describe("Realm.FunctionsFactory", () => {
    it("can be called authenticated", async () => {
        const app = createApp<TranslateFunctions>();
        // Login a user
        const credentials = Credentials.anonymous();
        await app.logIn(credentials);
        // Call a function
        const response = await app.functions.translate("hello", "en_fr");
        expect(response).to.equal("bonjour");
    });
});
