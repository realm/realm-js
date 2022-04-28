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

import { NetworkTransport, Request, FetchResponse, Headers } from "realm-network-transport";

import { MongoDBRealmError } from "./MongoDBRealmError";

import { User } from "./User";
import routes from "./routes";
import { deserialize, serialize } from "./utils/ejson";

type SimpleObject = Record<string, unknown>;

type StreamReader = {
  closed: boolean;
  cancel(reason?: string): Promise<string | undefined>;
  read<T>(): Promise<{ value: T | undefined; done: boolean }>;
  releaseLock(): void;
};
type ReadableStream = { getReader(): StreamReader };

/**
 * @param body A possible resonse body.
 * @returns An async iterator.
 */
function asyncIteratorFromResponseBody(body: unknown): AsyncIterable<Uint8Array> {
  if (typeof body !== "object" || body === null) {
    throw new Error("Expected a non-null object");
  } else if (Symbol.asyncIterator in body) {
    return body as AsyncIterable<Uint8Array>;
  } else if ("getReader" in body) {
    const stream = body as ReadableStream;
    return {
      [Symbol.asyncIterator]() {
        const reader = stream.getReader();
        return {
          next() {
            return reader.read();
          },
          async return() {
            await reader.cancel();
            return { done: true, value: null };
          },
        };
      },
    };
  } else {
    throw new Error("Expected an AsyncIterable or a ReadableStream");
  }
}

/**
 * Used to control which user is currently active - this would most likely be the {App} instance.
 */
export type UserContext = {
  /**
   * The currently active user.
   */
  currentUser: User | null;
};

/**
 * Used when getting the location url of the app.
 */
export type LocationUrlContext = {
  /** The location URL of the app, used instead of the base url. */
  locationUrl: Promise<string>;
};

type TokenType = "access" | "refresh" | "none";

interface RequestWithUrl<RequestBody> extends Request<RequestBody> {
  path?: never;
}

interface RequestWithPath<RequestBody> extends Omit<Request<RequestBody>, "url"> {
  /** Construct a URL from the location URL prepended is path */
  path: string;
  url?: never;
}

/**
 * A request which will send the access or refresh token of the current user.
 */
export type AuthenticatedRequest<RequestBody = unknown> = {
  /**
   * Which token should be used when requesting?
   *
   * @default "access"
   */
  tokenType?: TokenType;
  /**
   * The user issuing the request.
   */
  user?: User;
} & (RequestWithUrl<RequestBody> | RequestWithPath<RequestBody>);

/**
 *
 */
export type FetcherConfig = {
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
  locationUrlContext: LocationUrlContext;
};

/**
 * Wraps a NetworkTransport from the "realm-network-transport" package.
 * Extracts error messages and throws `MongoDBRealmError` objects upon failures.
 * Injects access or refresh tokens for a current or specific user.
 * Refreshes access tokens if requests fails due to a 401 error.
 * Optionally parses response as JSON before returning it.
 * Fetches and exposes an app's location url.
 */
export class Fetcher implements LocationUrlContext {
  /**
   * @param user An optional user to generate the header for.
   * @param tokenType The type of token (access or refresh).
   * @returns An object containing the user's token as "Authorization" header or undefined if no user is given.
   */
  private static buildAuthorizationHeader(user: User | null, tokenType: TokenType): Headers {
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
  private static buildBody(body: unknown): string | undefined {
    if (!body) {
      return;
    } else if (typeof body === "object" && body !== null) {
      return JSON.stringify(serialize(body as SimpleObject));
    } else if (typeof body === "string") {
      return body;
    } else {
      console.log("body is", body);
      throw new Error("Unexpected type of body");
    }
  }

  /**
   * @param body The body string or object passed from a request.
   * @returns An object optionally specifying the "Content-Type" header.
   */
  private static buildJsonHeader(body: string | undefined): Headers {
    if (body && body.length > 0) {
      return { "Content-Type": "application/json" };
    } else {
      return {};
    }
  }

  /**
   * The id of the app, which this Fetcher was created for.
   */
  private readonly appId: string;
  private readonly transport: NetworkTransport;
  private readonly userContext: UserContext;
  private readonly locationUrlContext: LocationUrlContext;

  /**
   * @param config A configuration of the fetcher.
   * @param config.appId The application id.
   * @param config.transport The transport used when fetching.
   * @param config.userContext An object used to determine the requesting user.
   * @param config.locationUrlContext An object used to determine the location / base URL.
   */
  constructor({ appId, transport, userContext, locationUrlContext }: FetcherConfig) {
    this.appId = appId;
    this.transport = transport;
    this.userContext = userContext;
    this.locationUrlContext = locationUrlContext;
  }

  clone(config: Partial<FetcherConfig>): Fetcher {
    return new Fetcher({
      appId: this.appId,
      transport: this.transport,
      userContext: this.userContext,
      locationUrlContext: this.locationUrlContext,
      ...config,
    });
  }

  /**
   * Fetch a network resource as an authenticated user.
   *
   * @param request The request which should be sent to the server.
   * @returns The response from the server.
   */
  public async fetch<RequestBody = unknown>(request: AuthenticatedRequest<RequestBody>): Promise<FetchResponse> {
    const { path, url, tokenType = "access", user = this.userContext.currentUser, ...restOfRequest } = request;

    if (typeof path === "string" && typeof url === "string") {
      throw new Error("Use of 'url' and 'path' mutually exclusive");
    } else if (typeof path === "string") {
      // Derive the URL
      const url = (await this.locationUrlContext.locationUrl) + path;
      return this.fetch({ ...request, path: undefined, url });
    } else if (typeof url === "string") {
      const response = await this.transport.fetch({
        ...restOfRequest,
        url,
        headers: {
          ...Fetcher.buildAuthorizationHeader(user, tokenType),
          ...request.headers,
        },
      });

      if (response.ok) {
        return response;
      } else if (user && response.status === 401 && tokenType === "access") {
        // If the access token has expired, it would help refreshing it
        await user.refreshAccessToken();
        // Retry with the specific user, since the currentUser might have changed.
        return this.fetch({ ...request, user });
      } else {
        if (user && response.status === 401 && tokenType === "refresh") {
          // A 401 error while using the refresh token indicates the token has an issue.
          // Reset the tokens to prevent a lock.
          user.accessToken = null;
          user.refreshToken = null;
        }
        // Throw an error with a message extracted from the body
        throw await MongoDBRealmError.fromRequestAndResponse(request as Request<RequestBody>, response);
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
  public async fetchJSON<RequestBody = unknown, ResponseBody = unknown>(
    request: AuthenticatedRequest<RequestBody>,
  ): Promise<ResponseBody> {
    const { body } = request;
    const serializedBody = Fetcher.buildBody(body);
    const contentTypeHeaders = Fetcher.buildJsonHeader(serializedBody);
    const response = await this.fetch({
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
      return deserialize(responseBody as SimpleObject) as ResponseBody;
    } else if (contentType === null) {
      return null as unknown as ResponseBody;
    } else {
      throw new Error(`Expected JSON response, got "${contentType}"`);
    }
  }

  /**
   * Fetch an "event-stream" resource as an authenticated user.
   *
   * @param request The request which should be sent to the server.
   * @returns An async iterator over the response body.
   */
  public async fetchStream<RequestBody = unknown>(
    request: AuthenticatedRequest<RequestBody>,
  ): Promise<AsyncIterable<Uint8Array>> {
    const { body } = await this.fetch({
      ...request,
      headers: {
        Accept: "text/event-stream",
        ...request.headers,
      },
    });
    return asyncIteratorFromResponseBody(body);
  }

  /**
   * @returns The path of the app route.
   */
  public get appRoute() {
    return routes.api().app(this.appId);
  }

  /**
   * @returns A promise of the location URL of the app.
   */
  public get locationUrl(): Promise<string> {
    return this.locationUrlContext.locationUrl;
  }
}
