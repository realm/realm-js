declare const process: any;
declare const require: ((id: string) => any) | undefined;

export type Method = "GET" | "POST";

export type Headers = { [name: string]: string };

export interface Request<RequestBody> {
    method: Method;
    url: string;
    timeoutMs?: number;
    headers?: Headers;
    body?: RequestBody | string;
}

export interface Response {
    statusCode: number;
    headers: Headers;
    body: string;
}

export type SuccessCallback = (response: Response) => void;

export type ErrorCallback = (err: Error) => void;

export interface NetworkTransport {
    fetchAndParse<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody>;
    fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        successCallback: SuccessCallback,
        errorCallback: ErrorCallback,
    ): void;
}

export class DefaultNetworkTransport implements NetworkTransport {
    public static fetch: typeof fetch;
    public static AbortController: typeof AbortController;

    public static DEFAULT_HEADERS = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    constructor() {
        // Determine the fetch implementation
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
                    "DefaultNetworkTransport.fetch must be set before it's used",
                );
            }
        }
        // Determine the AbortController implementation
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
                    "abort-controller",
                );
            } else {
                throw new Error(
                    "DefaultNetworkTransport.AbortController must be set before it's used",
                );
            }
        }
    }

    public async fetchAndParse<
        RequestBody extends any,
        ResponseBody extends any
    >(request: Request<RequestBody>): Promise<ResponseBody> {
        try {
            const response = await this.fetch(request);
            const contentType = response.headers.get("content-type");
            if (response.ok) {
                if (contentType && contentType.startsWith("application/json")) {
                    // Awaiting the response to ensure we'll throw our own error
                    return await response.json();
                } else {
                    throw new Error("Expected a JSON response");
                }
            } else {
                // TODO: Check if a message can be extracted from the response
                throw new Error(
                    `Unexpected status code (${response.status} ${response.statusText})`,
                );
            }
        } catch (err) {
            throw new Error(
                `Request failed (${request.method} ${request.url}): ${err.message}`,
            );
        }
    }

    public fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        successCallback: SuccessCallback,
        errorCallback: ErrorCallback,
    ) {
        this.fetch(request)
            .then(async response => {
                const decodedBody = await response.text();
                // Pull out the headers of the response
                const responseHeaders: Headers = {};
                response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                return {
                    statusCode: response.status,
                    headers: responseHeaders,
                    body: decodedBody,
                };
            })
            .then(successCallback, errorCallback);
    }

    private async fetch<RequestBody extends any>(
        request: Request<RequestBody>,
    ) {
        const {
            method,
            url,
            body,
            timeoutMs,
            headers = DefaultNetworkTransport.DEFAULT_HEADERS,
        } = request;
        const { signal, cancelTimeout } = this.createTimeoutSignal(timeoutMs);
        try {
            // We'll await the response to catch throw our own error
            return await DefaultNetworkTransport.fetch(url, {
                method,
                headers,
                body: typeof body === "string" ? body : JSON.stringify(body),
                signal, // Used to signal timeouts
            });
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
                },
            };
        } else {
            return {
                signal: undefined,
                cancelTimeout: () => {
                    /* No-op */
                },
            };
        }
    }
}
