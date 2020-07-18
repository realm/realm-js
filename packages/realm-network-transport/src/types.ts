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
        handler: ResponseHandler,
    ): void;
}

// AbortController

type AbortSignal = any;

/** A controller object that allows you to abort one or more DOM requests as and when desired. */

export type AbortController = {
    /**
     * The prototype of an instance is the class.
     */
    prototype: AbortController;

    /**
     * Constructs an AbortController.
     */
    new (): AbortController;

    /**
     * Returns the AbortSignal object associated with this object.
     */
    readonly signal: AbortSignal;
    /**
     * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
     */
    abort(): void;
};

// Environment independent Fetch API

type FetchRequestInfo = FetchRequest | string;
type FetchBodyInit = unknown;
type FetchHeadersInit = FetchHeaders | string[][] | Record<string, string>;
type FetchRequestCache = unknown;
type FetchRequestCredentials = unknown;
type FetchRequestMode = unknown;
type FetchRequestRedirect = unknown;
type FetchReferrerPolicy = unknown;
type FetchRequestDestination = unknown;

interface FetchBody {
    readonly body: unknown | null;
    readonly bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<unknown>;
    // formData(): Promise<unknown>;
    json(): Promise<any>;
    text(): Promise<string>;
}

interface FetchHeaders {
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    // forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
    forEach(callback: (value: string, name: string) => void): void;
}

/** This Fetch API interface represents a resource request. */
interface FetchRequest extends FetchBody {
    /**
     * Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching.
     */
    readonly cache: FetchRequestCache;
    /**
     * Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL.
     */
    readonly credentials: FetchRequestCredentials;
    /**
     * Returns the kind of resource requested by request, e.g., "document" or "script".
     */
    readonly destination: FetchRequestDestination;
    /**
     * Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.
     */
    readonly headers: FetchHeaders;
    /**
     * Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI]
     */
    readonly integrity: string;
    /**
     * Returns a boolean indicating whether or not request is for a history navigation (a.k.a. back-foward navigation).
     */
    readonly isHistoryNavigation: boolean;
    /**
     * Returns a boolean indicating whether or not request is for a reload navigation.
     */
    readonly isReloadNavigation: boolean;
    /**
     * Returns a boolean indicating whether or not request can outlive the global in which it was created.
     */
    readonly keepalive: boolean;
    /**
     * Returns request's HTTP method, which is "GET" by default.
     */
    readonly method: string;
    /**
     * Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs.
     */
    readonly mode: FetchRequestMode;
    /**
     * Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default.
     */
    readonly redirect: FetchRequestRedirect;
    /**
     * Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made.
     */
    readonly referrer: string;
    /**
     * Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer.
     */
    readonly referrerPolicy: FetchReferrerPolicy;
    /**
     * Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.
     */
    readonly signal: AbortSignal;
    /**
     * Returns the URL of request as a string.
     */
    readonly url: string;
    clone(): FetchRequest;

    // Allow the individual environments to extend this
    // [ key: string ]: any;
}

interface FetchResponse extends FetchBody {
    readonly headers: FetchHeaders;
    readonly ok: boolean;
    readonly redirected: boolean;
    readonly status: number;
    readonly statusText: string;
    // readonly trailer: Promise<Headers>;
    readonly type: unknown;
    readonly url: string;
    clone(): FetchResponse;
}

interface FetchRequestInit {
    /**
     * A BodyInit object or null to set request's body.
     */
    body?: FetchBodyInit | null;
    /**
     * A string indicating how the request will interact with the browser's cache to set request's cache.
     */
    cache?: FetchRequestCache;
    /**
     * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
     */
    credentials?: FetchRequestCredentials;
    /**
     * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
     */
    headers?: FetchHeadersInit;
    /**
     * A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
     */
    integrity?: string;
    /**
     * A boolean to set request's keepalive.
     */
    keepalive?: boolean;
    /**
     * A string to set request's method.
     */
    method?: string;
    /**
     * A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
     */
    mode?: FetchRequestMode;
    /**
     * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
     */
    redirect?: FetchRequestRedirect;
    /**
     * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
     */
    referrer?: string;
    /**
     * A referrer policy to set request's referrerPolicy.
     */
    referrerPolicy?: FetchReferrerPolicy;
    /**
     * An AbortSignal to set request's signal.
     */
    signal?: AbortSignal | null;
    /**
     * Can only be null. Used to disassociate request from any Window.
     */
    window?: any;
}

export type Fetch = (
    input: FetchRequestInfo,
    init?: FetchRequestInit,
) => Promise<FetchResponse>;
