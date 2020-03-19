import { Transport, Request } from "./Transport";

/**
 * Prefixes all request with a path prefix
 */
export class PrefixedTransport implements Transport {
    private readonly fetcher: Transport;
    private readonly pathPrefix: string;

    constructor(fetcher: Transport, pathPrefix: string) {
        this.fetcher = fetcher;
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
        return this.fetcher.fetch(prefixedRequest, user);
    }

    /** @inheritdoc */
    prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
