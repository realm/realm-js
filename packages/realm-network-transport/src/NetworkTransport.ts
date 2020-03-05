declare var process: any;
declare var require: ((id: string) => any) | undefined;

export type Method = "GET" | "POST";

export type Headers = { [name: string]: string };

export interface Request<RequestBody> {
    method: Method;
    url: string;
    timeoutMs?: number;
    headers?: Headers;
    body?: RequestBody | string;
}

export interface Response<ResponseBody> {
    statusCode: number;
    headers: Headers;
    body: string;
}

export interface NetworkTransport {
    fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>
    ): Promise<ResponseBody>;
}

export class DefaultNetworkTransport implements NetworkTransport {
    public static fetch: typeof fetch;
    public static AbortController: typeof AbortController;

    public static DEFAULT_HEADERS = {
        "Content-Type": "application/json"
    };

    constructor() {
        if (!DefaultNetworkTransport.fetch) {
            // Try to get it from the global
            if (typeof fetch === "function" && typeof window === "object") {
                DefaultNetworkTransport.fetch = fetch.bind(window);
            } else if (
                typeof process === "object" &&
                typeof require === "function" &&
                "node" in process.versions
            ) {
                // Making it harder for the static analyzers see this require call
                const nodeRequire = require;
                DefaultNetworkTransport.fetch = nodeRequire("node-fetch");
            } else {
                throw new Error(
                    "The static `fetch` property must be set before DefaultFetcher is used"
                );
            }
        }
        if (!DefaultNetworkTransport.AbortController) {
            if (typeof AbortController !== "undefined") {
                DefaultNetworkTransport.AbortController = AbortController;
            } else if (
                typeof process === "object" &&
                typeof require === "function" &&
                "node" in process.versions
            ) {
                // Making it harder for the static analyzers see this require call
                const nodeRequire = require;
                DefaultNetworkTransport.AbortController = nodeRequire(
                    "abort-controller"
                );
            }
        }
    }

    public async fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>
    ): Promise<ResponseBody>;
    public async fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        callback: (response: Response<ResponseBody>) => void
    ): Promise<void>;
    public async fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        callback?: (response: Response<ResponseBody>) => void
    ): Promise<ResponseBody | void> {
        const {
            method,
            url,
            body,
            timeoutMs,
            headers = DefaultNetworkTransport.DEFAULT_HEADERS
        } = request;
        const encodedBody =
            typeof body === "string" ? body : JSON.stringify(body);
        const { signal, cancelTimeout } = this.createTimeoutSignal(timeoutMs);
        try {
            const response = await DefaultNetworkTransport.fetch(url, {
                method,
                headers,
                body: encodedBody,
                signal // Used to signal timeouts
            });
            // If a callback is specified, call it with the entire response, instead of returning the JSON parsed body
            if (callback) {
                const decodedBody = await response.text();
                // Pull out the headers of the response
                const responseHeaders: Headers = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                // Call back the callback
                return callback({
                    statusCode: response.status,
                    headers: responseHeaders,
                    body: decodedBody
                });
            } else {
                if (response.ok) {
                    const json = await response.json();
                    return json as ResponseBody;
                } else {
                    // TODO: Check if a message can be extracted from the response
                    throw new Error(
                        `Unexpected status code (${response.status} ${response.statusText})`
                    );
                }
            }
        } catch (err) {
            throw new Error(
                `Request to MongoDB Realm failed (${method} ${url}): ${err.message}`
            );
        } finally {
            // Whatever happens, cancel any timeout
            cancelTimeout();
        }
    }

    private createTimeoutSignal(timeoutMs: number | undefined) {
        if (typeof timeoutMs === "number") {
            const controller = new AbortController();
            // Call abort after a specific number of milliseconds
            const timeout = setTimeout(() => {
                controller.abort();
            }, timeoutMs);
            return {
                signal: controller.signal,
                cancelTimeout: () => {
                    clearTimeout(timeout);
                }
            };
        } else {
            return {
                signal: undefined,
                cancelTimeout: () => {
                    /* No-op */
                }
            };
        }
    }
}
