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
     * This base route will be prefixed requests issued through by the base transport
     */
    private static readonly DEFAULT_BASE_ROUTE = "/api/client/v2.0";

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
     *The base URL to prepend to paths.
     */
    private readonly baseRoute: string;

    /**
     * Constructs a base transport, which takes paths (prepended by a base URL) instead of absolute urls.
     *
     * @param networkTransport The underlying network transport.
     * @param baseUrl The base URL to prepend to paths.
     * @param baseRoute The base route to prepend to the base URL.
     */
    constructor(
        networkTransport: NetworkTransport = new DefaultNetworkTransport(),
        baseUrl: string,
        baseRoute: string = BaseTransport.DEFAULT_BASE_ROUTE,
    ) {
        this.networkTransport = networkTransport;
        this.baseUrl = baseUrl;
        this.baseRoute = baseRoute;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        baseUrl: string = this.baseUrl,
    ): Promise<ResponseBody> {
        const { path, headers, ...restOfRequest } = request;
        return this.networkTransport.fetchAndParse({
            ...restOfRequest,
            url: baseUrl + this.baseRoute + path,
            headers: { ...BaseTransport.DEFAULT_HEADERS, ...headers },
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
