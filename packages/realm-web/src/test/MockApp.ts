import { App } from "../App";
import { MockTransport } from "./MockTransport";

/**
 * An App using the MockTransport
 */
export class MockApp extends App<any> {
    constructor(id: string, requests: object[] = []) {
        super(id, {
            baseUrl: "http://localhost:1337",
            transport: new MockTransport(requests)
        });
    }
}
