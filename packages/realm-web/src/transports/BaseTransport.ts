import {
    NetworkTransport,
    DefaultNetworkTransport
} from "realm-network-transport";

import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

/**
 * A basic transport, wrapping a NetworkTransport from the "realm-network-transport" package, injecting a baseUrl.
 */
export class BaseTransport implements Transport {
    private readonly baseUrl: string;
    private readonly networkTransport: NetworkTransport;

    constructor(
        baseUrl: string,
        networkTransport: NetworkTransport = new DefaultNetworkTransport()
    ) {
        this.baseUrl = baseUrl;
        this.networkTransport = networkTransport;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: any
    ): Promise<ResponseBody> {
        if (user) {
            throw new Error(
                "BaseTransport doesn't support fetching as a particular user"
            );
        }
        return this.networkTransport.fetchAndParse({
            ...request,
            url: `${this.baseUrl}${request.path}`
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
