import { Transport, Request } from "./Transport";

/**
 * Prefixes all request with a path prefix
 */
export class PrefixedTransport implements Transport {
    /**
     * Underlying transport.
     */
    private readonly transport: Transport;

    /**
     * The prefix prepended to paths before fetching via the underlying transport.
     */
    private readonly pathPrefix: string;

    /**
     * Constructs a transport that prefix the path of all requests performed.
     *
     * @param transport The underlying transport used to issue requests.
     * @param pathPrefix The path being prefixed onto requests.
     */
    constructor(transport: Transport, pathPrefix: string) {
        this.transport = transport;
        this.pathPrefix = pathPrefix;
    }

    /** @inheritdoc */
    fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user?: Realm.User | null,
    ): Promise<ResponseBody> {
        const prefixedRequest = {
            ...request,
            path: `${this.pathPrefix}${request.path}`,
        };
        return this.transport.fetch(prefixedRequest, user);
    }

    /** @inheritdoc */
    prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
