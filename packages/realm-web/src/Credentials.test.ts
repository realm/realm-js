import { expect } from "chai";

import { Credentials } from "./Credentials";

describe("Credentials", () => {
    it("expose the anonymous credentials", () => {
        expect(typeof Credentials.anonymous).to.equal("function");
        const credentials = Credentials.anonymous();
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({});
    });

    it("expose the email/password credentials", () => {
        expect(typeof Credentials.emailPassword).to.equal("function");
        const credentials = Credentials.emailPassword(
            "gilfoil@testing.mongodb.com",
            "s3cr3t",
        );
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({
            username: "gilfoil@testing.mongodb.com",
            password: "s3cr3t",
        });
    });
});
