import { expect } from "chai";

import { AuthenticatedTransport } from "./AuthenticatedTransport";
import { MockTransport } from "../test/MockTransport";

describe("AuthenticatedTransport", () => {
    it("constructs", () => {
        const transport = new AuthenticatedTransport(
            { currentUser: null },
            new MockTransport(),
            "http://localhost:1337"
        );
        // Expect something of the getters and setters
        expect(typeof transport.fetch).equals("function");
    });
});
