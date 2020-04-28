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

import { Method } from "realm-network-transport";

/**
 * A request to be sent via the transport.
 * Note: This has a path instead of a url.
 */
export interface Request<RequestBody> {
    /** HTTP method used when fetching */
    method: Method;
    /** Path of the resource to fetch */
    path: string;
    /** Body to send when fetching */
    body?: RequestBody | string;
    /** Headers to send when fetching */
    headers?: { [name: string]: string };
}

/**
 * A transport takes care of fetching resources, more specialized than the `realm-network-transport`
 */
export interface Transport {
    /**
     * Fetch a network resource.
     *
     * @param request The request to issue towards the server
     * @param user The user used when fetching, defaults to the `app.currentUser`.
     *             If `null`, the fetch will be unauthenticated.
     */
    fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user?: Realm.User | null,
    ): Promise<ResponseBody>;

    /**
     * Creates another transport from this instance, adding a prefix to its path.
     *
     * @param pathPrefix Path to prefix
     */
    prefix(pathPrefix: string): Transport;
}
