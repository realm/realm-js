import { Method } from "realm-network-transport";

export interface Request<RequestBody> {
    method: Method;
    path: string;
    body?: RequestBody | string;
    headers?: { [name: string]: string };
}

/**
 * A transport takes care of fetching resources.
 */
export interface Transport {
    /**
     * Fetch a network resource.
     * @param request The request to issue towards the server
     * @param user The user used when fetching, defaults to the `app.currentUser`.
     *             If `null`, the fetch will be unauthenticated.
     */
    fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user?: Realm.User | null
    ): Promise<ResponseBody>;

    /**
     * Creates another fetcher from this instance, adding a prefix to its path.
     * @param pathPrefix Path to prefix
     */
    prefix(pathPrefix: string): Transport;
}
