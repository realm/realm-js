////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { MongoDBRealmError } from "./MongoDBRealmError";

declare const process: any;
declare const require: ((id: string) => any) | undefined;

const isNodeProcess = typeof process === "object" && "node" in process.versions;

export type Method = "GET" | "POST" | "DELETE" | "PUT";

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

export interface ResponseHandler {
    onSuccess: SuccessCallback;
    onError: ErrorCallback;
}

export interface NetworkTransport {
    fetchAndParse<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody>;
    fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        handler: ResponseHandler
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
            } else if (isNodeProcess && typeof require === "function") {
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
            } else if (isNodeProcess && typeof require === "function") {
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
                if (contentType === null) {
                    return null as any;
                } else if (contentType.startsWith("application/json")) {
                    // Awaiting the response to ensure we'll throw our own error
                    return await response.json();
                } else {
                    throw new Error("Expected an empty or a JSON response");
                }
            } else if (
                contentType &&
                contentType.startsWith("application/json")
            ) {
                throw new MongoDBRealmError(
                    response.status,
                    response.statusText,
                    await response.json(),
                );
            } else {
                if (contentType && contentType.startsWith("application/json")) {
                    // Awaiting the response to ensure we'll throw our own error
                    const json = await response.json();
                    throw new MongoDBRealmError(
                        response.status,
                        response.statusText,
                        json,
                    );
                } else {
                    throw new Error(
                        `Unexpected status code (${response.status} ${response.statusText})`,
                    );
                }
            }
        } catch (err) {
            throw new Error(
                `Request failed (${request.method} ${request.url}): ${err.message}`,
            );
        }
    }

    public fetchWithCallbacks<RequestBody extends any>(
        request: Request<RequestBody>,
        handler: ResponseHandler
    ) {
        // tslint:disable-next-line: no-console
        this.fetch(request)
            .then(async response => {
                const decodedBody = await response.text();
                if (response.status >= 400) {
                    throw {
                        statusCode: response.status,
                        errorMessage: decodedBody,
                    };
                }
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
            .then(r => handler.onSuccess(r))
            .catch(e => handler.onError(e));
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
            const controller = new DefaultNetworkTransport.AbortController();
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
