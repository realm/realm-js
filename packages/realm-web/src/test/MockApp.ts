import { App } from "../App";
import { MockNetworkTransport } from "./MockNetworkTransport";

/**
 * An App using the MockTransport
 */
export class MockApp extends App<any> {
    constructor(id: string, requests: object[] = []) {
        super(id, {
            baseUrl: "http://localhost:1337",
            transport: new MockNetworkTransport(requests)
        });
    }
}
