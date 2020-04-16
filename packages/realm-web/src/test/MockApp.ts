import { App } from "../App";
import { MockNetworkTransport } from "./MockNetworkTransport";

/**
 * An App using the MockTransport
 */
export class MockApp extends App<any> {
    /**
     * Create mocked App, useful when testing.
     *
     * @param id The ID of the app.
     * @param requests An array of requests returned by the underlying mocked network transport.
     */
    constructor(id: string, requests: object[] = []) {
        super({
            id,
            baseUrl: "http://localhost:1337",
            transport: new MockNetworkTransport(requests),
        });
    }
}
