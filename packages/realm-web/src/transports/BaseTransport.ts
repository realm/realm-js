import {
    NetworkTransport,
    DefaultNetworkTransport,
} from "realm-network-transport";

import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

/**
 * A basic transport, wrapping a NetworkTransport from the "realm-network-transport" package, injecting a baseUrl.
 */
export class BaseTransport implements Transport {
    /**
     *The base URL to prepend to paths.
     */
    private readonly baseUrl: string;

    /**
     * The underlying network transport.
     */
    private readonly networkTransport: NetworkTransport;

    /**
     * Constructs a base transport, which takes paths (prepended by a base URL) instead of absolute urls.
     *
     * @param baseUrl The base URL to prepend to paths.
     * @param networkTransport The underlying network transport.
     */
    constructor(
        baseUrl: string,
        networkTransport: NetworkTransport = new DefaultNetworkTransport(),
    ) {
        this.baseUrl = baseUrl;
        this.networkTransport = networkTransport;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: any,
    ): Promise<ResponseBody> {
        if (user) {
            throw new Error(
                "BaseTransport doesn't support fetching as a particular user",
            );
        }
        const { path, ...restOfRequest } = request;
        return this.networkTransport.fetchAndParse({
            ...restOfRequest,
            url: this.baseUrl + path,
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
