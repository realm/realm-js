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

import { BaseTransport } from "./BaseTransport";
import { PrefixedTransport } from "./PrefixedTransport";
import { Transport, Request } from "./Transport";

/**
 * A transport prefixing request paths with the path of the App id and ensuring the corrent location is hit.
 */
export class AppTransport implements Transport {
    /** The underlying transport used to issue requests */
    private readonly transport: BaseTransport;

    /** The id of the app */
    private readonly appId: string;

    /** The base URL to use for requests */
    private baseUrl?: string;

    /**
     * Construct a transport that will prefix the app id to paths and determine location base URL.
     *
     * @param transport The base transport used to issue requests.
     * @param appId The id of the app.
     * @param baseUrl An optional URL that we need to use when requesting, will be determined if not provided.
     */
    constructor(transport: BaseTransport, appId: string, baseUrl?: string) {
        this.transport = transport;
        this.appId = appId;
        this.baseUrl = baseUrl;
    }

    /** @inheritdoc */
    public async fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody> {
        if (this.baseUrl) {
            const { path, ...restOfRequest } = request;
            return this.transport.fetch(
                {
                    ...restOfRequest,
                    path: `/app/${this.appId}` + path,
                },
                this.baseUrl,
            );
        } else {
            // Determine the hostname associated with the app before we fetch the real request
            const response = await this.transport.fetch({
                method: "GET",
                path: `/app/${this.appId}/location`,
            });
            // Read out the hostname from the response and try again
            if (typeof response.hostname === "string") {
                this.baseUrl = response.hostname;
                return this.fetch(request);
            } else {
                throw new Error("Expected a hostname in the response body");
            }
        }
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
