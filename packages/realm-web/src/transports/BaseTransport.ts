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
    DefaultNetworkTransport,
} from "realm-network-transport";

import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

/**
 * A basic transport, wrapping a NetworkTransport from the "realm-network-transport" package, injecting a baseUrl.
 */
export class BaseTransport implements Transport {
    /**
     * Default headers that will always be sat on requests
     */
    private static readonly DEFAULT_HEADERS = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    /**
     * The underlying network transport.
     */
    private readonly networkTransport: NetworkTransport;

    /**
     *The base URL to prepend to paths.
     */
    private readonly baseUrl: string;

    /**
     * Constructs a base transport, which takes paths (prepended by a base URL) instead of absolute urls.
     *
     * @param networkTransport The underlying network transport.
     * @param baseUrl The base URL to prepend to paths.
     */
    constructor(
        networkTransport: NetworkTransport = new DefaultNetworkTransport(),
        baseUrl: string,
    ) {
        this.baseUrl = baseUrl;
        this.networkTransport = networkTransport;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: any,
    ): Promise<ResponseBody> {
        if (user) {
            throw new Error(
                "BaseTransport doesn't support fetching as a particular user",
            );
        }
        const { path, headers, ...restOfRequest } = request;
        return this.networkTransport.fetchAndParse({
            ...restOfRequest,
            url: this.baseUrl + path,
            headers: { ...BaseTransport.DEFAULT_HEADERS, ...headers },
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
