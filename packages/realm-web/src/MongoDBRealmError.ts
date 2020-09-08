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

import { Method, FetchResponse, Request } from "realm-network-transport";

// TODO: Determine if the shape of an error response is specific to each service or widely used.

/**
 * An error produced while communicating with the MongoDB Realm server.
 */
export class MongoDBRealmError extends Error {
    /**
     * The method used when requesting.
     */
    public readonly method: Method;
    /**
     * The URL of the resource which got fetched.
     */
    public readonly url: string;
    /**
     * The HTTP status code of the response.
     */
    public readonly statusCode: number;
    /**
     * A human readable version of the HTTP status.
     */
    public readonly statusText: string;
    /**
     * Any application-level error message.
     */
    public readonly error: string | undefined;
    /**
     * Any application-level error code.
     */
    public readonly errorCode: string | undefined;
    /**
     * Any application-level (URL) link containing details about the error.
     */
    public readonly link: string | undefined;

    /**
     * Constructs and returns an error from a request and a response.
     * Note: The caller must throw this error themselves.
     *
     * @param request The request sent to the server.
     * @param response A raw response, as returned from the server.
     */
    public static async fromRequestAndResponse(
        request: Request<unknown>,
        response: FetchResponse,
    ): Promise<MongoDBRealmError> {
        const { url, method } = request;
        const { status, statusText } = response;
        if (
            response.headers.get("content-type")?.startsWith("application/json")
        ) {
            const body = await response.json();
            const error = body.error || "No message";
            const errorCode = body.error_code;
            const link = body.link;
            return new MongoDBRealmError(
                method,
                url,
                status,
                statusText,
                error,
                errorCode,
                link,
            );
        } else {
            return new MongoDBRealmError(method, url, status, statusText);
        }
    }

    constructor(
        method: Method,
        url: string,
        statusCode: number,
        statusText: string,
        error?: string,
        errorCode?: string,
        link?: string,
    ) {
        const summary = statusText
            ? `status ${statusCode} ${statusText}`
            : `status ${statusCode}`;
        if (typeof error === "string") {
            super(`Request failed (${method} ${url}): ${error} (${summary})`);
        } else {
            super(`Request failed (${method} ${url}): (${summary})`);
        }
        this.method = method;
        this.url = url;
        this.statusText = statusText;
        this.statusCode = statusCode;
        this.error = error;
        this.errorCode = errorCode;
        this.link = link;
    }
}
