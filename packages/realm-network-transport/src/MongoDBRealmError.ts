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

import { Method } from "./types";

/**
 * TODO: Determine if the shape of an error response is specific to each service or widely used
 */

export class MongoDBRealmError extends Error {
    public readonly method: Method;
    public readonly url: string;
    public readonly statusCode: number;
    public readonly statusText: string;
    public readonly errorCode: string | undefined;
    public readonly link: string | undefined;

    constructor(
        method: Method,
        url: string,
        statusCode: number,
        statusText: string,
        response: any,
    ) {
        if (
            typeof response === "object" &&
            typeof response.error === "string"
        ) {
            const statusSummary = statusText
                ? `status ${statusCode} ${statusText}`
                : `status ${statusCode}`;
            super(
                `Request failed (${method} ${url}): ${response.error} (${statusSummary})`,
            );
            this.method = method;
            this.url = url;
            this.statusText = statusText;
            this.statusCode = statusCode;
            this.errorCode = response.error_code;
            this.link = response.link;
        } else {
            throw new Error("Unexpected error response format");
        }
    }
}
