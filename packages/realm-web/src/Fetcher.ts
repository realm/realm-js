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

import {
    NetworkTransport,
    Request,
    FetchResponse,
    Headers,
} from "realm-network-transport";

import { MongoDBRealmError } from "./MongoDBRealmError";

import { User } from "./User";
import routes from "./routes";
import { AppLocation } from "./AppLocation";
import { deserialize, serialize } from "./utils/ejson";

/**
 * Used to control which user is currently active - this would most likely be the {App} instance.
 */
export type UserContext = {
    /**
     * The currently active user.
     */
    currentUser: User<object, object> | null;
};

type TokenType = "access" | "refresh" | "none";

interface RequestWithUrl<RequestBody> extends Request<RequestBody> {
    path?: never;
}

interface RequestWithPath<RequestBody>
    extends Omit<Request<RequestBody>, "url"> {
    /** Construct a URL from the location URL prepended is path */
    path: string;
    url?: never;
}

/**
 * A request which will send the access or refresh token of the current user.
 */
export type AuthenticatedRequest<RequestBody> = {
    /**
     * Which token should be used when requesting?
     *
     * @default "access"
     */
    tokenType?: TokenType;
    /**
     * The user issuing the request.
     */
    user?: User<object, object>;
} & (RequestWithUrl<RequestBody> | RequestWithPath<RequestBody>);

/**
 *
 */
export type FetcherConfig = {
    /**
     * The base URL of the server, before the app location has been resolved.
     */
    baseUrl: string;
    /**
     * The id of the app.
     */
    appId: string;
    /**
     * The underlying network transport.
     */
    transport: NetworkTransport;
    /**
     * An object which can be used to determine the currently active user.
     */
    userContext: UserContext;
    /**
     * An optional promise which resolves to the response of the app location request.
     */
    location?: Promise<AppLocation> | null;
};

/**
 * Wraps a NetworkTransport from the "realm-network-transport" package.
 * Extracts error messages and throws `MongoDBRealmError` objects upon failures.
 * Injects access or refresh tokens for a current or specific user.
 * Refreshes access tokens if requests fails due to a 401 error.
 * Optionally parses response as JSON before returning it.
 * Fetches and exposes an app's location url.
 */
export class Fetcher {
    /**
     * The id of the app, which this Fetcher was created for.
     */
    public readonly baseUrl: string;
    private readonly appId: string;
    private readonly transport: NetworkTransport;
    private readonly userContext: UserContext;
    private location: Promise<AppLocation> | null = null;

    /**
     * @param config A configuration of the fetcher.
     */
    constructor({
        baseUrl,
        appId,
        transport,
        userContext,
        location = null,
    }: FetcherConfig) {
        this.baseUrl = baseUrl;
        this.appId = appId;
        this.transport = transport;
        this.userContext = userContext;
        this.location = location;
    }

    clone(config: Partial<FetcherConfig>) {
        return new Fetcher({
            baseUrl: this.baseUrl,
            appId: this.appId,
            transport: this.transport,
            userContext: this.userContext,
            location: this.location,
            ...config,
        });
    }

    /**
     * Fetch a network resource as an authenticated user.
     *
     * @param request The request which should be sent to the server.
     * @param attempts Number of times this request has been attempted. Used when retrying, callers don't need to pass a value.
     * @returns The response from the server.
     */
    public async fetch<RequestBody = any>(
        request: AuthenticatedRequest<RequestBody>,
        attempts = 0,
    ): Promise<FetchResponse> {
        const {
            path,
            url,
            tokenType = "access",
            user = this.userContext.currentUser,
            ...restOfRequest
        } = request;

        if (typeof path === "string" && typeof url === "string") {
            throw new Error("Use of 'url' and 'path' mutually exclusive");
        } else if (typeof path === "string") {
            // Derive the URL
            const url = (await this.getLocationUrl()) + path;
            return this.fetch({ ...request, path: undefined, url });
        } else if (typeof url === "string") {
            const response = await this.transport.fetch({
                ...restOfRequest,
                url,
                headers: {
                    ...this.buildAuthorizationHeader(user, tokenType),
                    ...request.headers,
                },
            });

            if (response.ok) {
                return response;
            } else if (
                user &&
                response.status === 401 &&
                tokenType === "access" &&
                attempts === 0
            ) {
                // Refresh the access token
                await user.refreshAccessToken();
                // Retry with the specific user, since the currentUser might have changed.
                return this.fetch({ ...request, user }, attempts + 1);
            } else {
                // Throw an error with a message extracted from the body
                throw await MongoDBRealmError.fromRequestAndResponse(
                    request as Request<RequestBody>,
                    response,
                );
            }
        } else {
            throw new Error("Expected either 'url' or 'path'");
        }
    }

    /**
     * Fetch a network resource as an authenticated user and parse the result as extended JSON.
     *
     * @param request The request which should be sent to the server.
     * @returns The response from the server, parsed as extended JSON.
     */
    public async fetchJSON<
        RequestBody extends object = any,
        ResponseBody extends object = any
    >(request: AuthenticatedRequest<RequestBody>): Promise<ResponseBody> {
        const { body } = request;
        const serializedBody =
            typeof body === "object" ? JSON.stringify(serialize(body)) : body;
        const contentTypeHeaders = this.buildJsonHeader(body);
        const response = await this.fetch<RequestBody>({
            ...request,
            body: serializedBody,
            headers: {
                Accept: "application/json",
                ...contentTypeHeaders,
                ...request.headers,
            },
        });
        const contentType = response.headers.get("content-type");
        if (contentType?.startsWith("application/json")) {
            const responseBody = await response.json();
            return deserialize<ResponseBody>(responseBody);
        } else if (contentType === null) {
            return (null as unknown) as ResponseBody;
        } else {
            throw new Error(`Expected JSON response, got "${contentType}"`);
        }
    }

    public makeStreamingRequest(
        name: string,
        func_args: any[],
        service_name: string,
    ): RequestWithPath<undefined> {
        let full_args: any = {
            "arguments": func_args,
            name,
        };
        if (service_name) {
            full_args.service = service_name;
        }
        const args_json = JSON.stringify(full_args);
        const args_base64 = Base64.encode(args_json);

        let path = this.getAppPath().functionsCall().path + "?stitch_request=" + encodeURIComponent(args_base64);

        return {
            method: "GET",
            path,
            headers: {
                Accept: "text/event-stream",
            },
        };
    }

    /**
     * @returns A promise of the app URL, with the app location resolved.
     */
    public async getLocationUrl() {
        if (!this.location) {
            const path = routes.api().app(this.appId).location().path;
            this.location = this.fetchJSON({
                method: "GET",
                url: this.baseUrl + path,
                tokenType: "none",
            }).catch(err => {
                // Reset the location to allow another request to fetch again.
                this.location = null;
                throw err;
            });
        }
        // Return the hostname as the location URL.
        const { hostname } = await this.location;
        if (typeof hostname !== "string") {
            throw new Error("Expected response to contain a 'hostname'");
        }
        return hostname;
    }

    /**
     * @returns The path of the app route.
     */
    public getAppPath() {
        return routes.api().app(this.appId);
    }

    /**
     * @param user An optional user to generate the header for.
     * @param tokenType The type of token (access or refresh).
     * @returns An object containing the user's token as "Authorization" header or undefined if no user is given.
     */
    private buildAuthorizationHeader(
        user: User<object, object> | null,
        tokenType: TokenType,
    ): Headers {
        if (!user || tokenType === "none") {
            return {};
        } else if (tokenType === "access") {
            return { Authorization: `Bearer ${user.accessToken}` };
        } else if (tokenType === "refresh") {
            return { Authorization: `Bearer ${user.refreshToken}` };
        } else {
            throw new Error(`Unexpected token type (${tokenType})`);
        }
    }

    /**
     * @param body The body string or object passed from a request.
     * @returns An object optionally specifying the "Content-Type" header.
     */
    private buildJsonHeader(body: string | object | undefined): Headers {
        if (body) {
            return { "Content-Type": "application/json" };
        } else {
            return {};
        }
    }
}
