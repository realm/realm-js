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

    /**
     * Construct a transport that will prefix the app id to paths and determine location base URL.
     *
     * @param transport The base transport used to issue requests.
     * @param appId The id of the app.
     */
    constructor(transport: BaseTransport, appId: string) {
        this.transport = transport;
        this.appId = appId;
    }

    /** @inheritdoc */
    public async fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
    ): Promise<ResponseBody> {
        const { path, ...restOfRequest } = request;
        return this.transport.fetch({
            ...restOfRequest,
            path: `/app/${this.appId}${path}`,
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }
}
