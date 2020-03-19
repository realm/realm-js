import { Transport, Request, PrefixedTransport } from "../transports";
import { MockNetworkTransport } from "./MockNetworkTransport";

/**
 * A mocked network transport, which gets created with a list of responses to return in the order it's being requested.
 */
export class MockTransport implements Transport {
    private readonly networkTransport: MockNetworkTransport;
    private readonly baseUrl: string;

    constructor(responses: object[] = [], baseUrl = "http://localhost:1337") {
        this.networkTransport = new MockNetworkTransport(responses);
        this.baseUrl = baseUrl;
    }

    /** @inheritdoc */
    public async fetch(request: Request<any>) {
        const { path, ...restOfRequest } = request;
        return this.networkTransport.fetchAndParse({
            ...restOfRequest,
            url: this.baseUrl + path
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }

    /** Captured requests */
    get requests() {
        return this.networkTransport.requests;
    }

    /** Outstanding responses */
    get responses() {
        return this.networkTransport.responses;
    }
}
