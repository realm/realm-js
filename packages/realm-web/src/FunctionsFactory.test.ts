import { expect } from "chai";

import {
    create as createFunctionsFactory,
    FunctionsFactory
} from "./FunctionsFactory";
import { MockTransport } from "./test/MockTransport";

describe("FunctionsFactory", () => {
    it("can be created", () => {
        const factory = createFunctionsFactory({ transport: {} as any });
        expect(factory).to.be.instanceOf(FunctionsFactory);
    });

    it("calls the network transport correctly", async () => {
        const transport = new MockTransport([
            { message: `hello friendly world!` }
        ]);
        const factory = createFunctionsFactory({
            transport,
            serviceName: "custom-service"
        });
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
                    arguments: ["friendly"]
                }
            }
        ]);
    });
});
