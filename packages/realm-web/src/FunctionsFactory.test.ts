import { expect } from "chai";

import {
    create as createFunctionsFactory,
    FunctionsFactory,
} from "./FunctionsFactory";
import { MockTransport } from "./test/MockTransport";

describe("FunctionsFactory", () => {
    it("can be created", () => {
        const factory = createFunctionsFactory({} as any);
        expect(factory).to.be.instanceOf(FunctionsFactory);
    });

    it("expose a callFunction method", () => {
        const factory = createFunctionsFactory({} as any);
        expect(typeof factory.callFunction).equals("function");
    });

    it("expose an interface that allows calling any function", () => {
        const factory = createFunctionsFactory({} as any);
        expect(typeof factory.anyFunction).equals("function");
    });

    it("calls the network transport correctly", async () => {
        const transport = new MockTransport([
            { message: `hello friendly world!` },
        ]);
        const factory = createFunctionsFactory(transport, "custom-service");
        const response = factory.hello("friendly");
        expect(response).to.be.instanceOf(Promise);
        const { message } = await response;
        expect(message).to.equal("hello friendly world!");
        expect(transport.requests).deep.equals([
            {
                url: "http://localhost:1337/functions/call",
                method: "POST",
                body: {
                    name: "hello",
                    service: "custom-service",
                    arguments: ["friendly"],
                },
            },
        ]);
    });
});
