import { Transport, Request } from "./Transport";

/**
 * Prefixes all request with a path prefix
 */
export class PrefixedTransport implements Transport {
    private readonly transport: Transport;
    private readonly pathPrefix: string;

    constructor(transport: Transport, pathPrefix: string) {
        this.transport = transport;
        this.pathPrefix = pathPrefix;
    }

    /** @inheritdoc */
    fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user?: Realm.User | null
    ): Promise<ResponseBody> {
        const prefixedRequest = {
            ...request,
            path: `${this.pathPrefix}${request.path}`
        };
        return this.transport.fetch(prefixedRequest, user);
    }

    /** @inheritdoc */
    prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
