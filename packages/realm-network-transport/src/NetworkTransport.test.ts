import { expect } from "chai";

import { DefaultNetworkTransport } from "./NetworkTransport";

describe("Realm Network Transport", () => {
    // Create some tests!
    it("constructs", () => {
        const transport = new DefaultNetworkTransport();
        expect(transport).is.instanceOf(DefaultNetworkTransport);
    });
});
