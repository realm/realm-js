import type { NetworkTransport } from "realm-network-transport";

import { App } from "../App"
import { MockNetworkTransport } from "./MockNetworkTransport";

export class MockApp extends App<any> {
    constructor(id: string, requests: object[] = []) {
        super(id, {
            baseUrl: "http://fake-mongodb-realm-server:1337",
            transport: new MockNetworkTransport(requests),
        });
    }
}
