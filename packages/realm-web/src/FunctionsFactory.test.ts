import { expect } from "chai";
import type { NetworkTransport } from "realm-network-transport";

import { create as createFunctionsFactory, FunctionFactory } from "./FunctionsFactory";

describe("FunctionsFactory", () => {
    it("can be created", () => {
        const transport: NetworkTransport = {} as any;
        const factory = createFunctionsFactory(transport, 'http://localhost:1337');
        expect(factory).to.be.instanceOf(FunctionFactory);
    });

    it("calls the network transport correctly", async () => {
        class MockNetworkTransport {
            fetchAndParse({ url, body }: any) {
                expect(this).to.equal(fetcher);
                expect(url).to.equal("http://localhost:1337/functions/call"); // TODO: Fix this to include the base URL
                expect(typeof body).to.equal("object");
                expect(body.name).to.equal("hello");
                expect(body.service).to.equal("custom-service");
                expect(body.arguments).to.deep.equal(["friendly"]);
                return Promise.resolve({ message: `hello ${body.arguments[0]} world!` }) as Promise<any>;
            }
        }
        const fetcher = new MockNetworkTransport() as NetworkTransport;
        const factory = createFunctionsFactory(fetcher, 'http://localhost:1337', 'custom-service');
        const response = factory.hello("friendly");
        expect(response).to.be.instanceOf(Promise);
        const { message } = await response;
        expect(message).to.equal("hello friendly world!");
    });
});