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

import { Transport, Request } from "./Transport";
import { PrefixedTransport } from "./PrefixedTransport";

/**
 * Used to control which user is currently active - this would most likely be the {App} instance.
 */
interface UserContext {
    /**
     * The currently active user
     */
    currentUser: Realm.User | null;
}

/**
 * Fetches resources as a particular user.
 */
export class AuthenticatedTransport implements Transport {
    /**
     * Underlying transport.
     */
    private readonly transport: Transport;

    /**
     * An object controlling which user is currently active.
     */
    private readonly userContext: UserContext;

    /**
     * Constructs a transport that injects authorization headers to requests.
     *
     * @param transport The underlying transport.
     * @param userContext The context controlling what user is authenticated.
     */
    public constructor(transport: Transport, userContext: UserContext) {
        this.transport = transport;
        this.userContext = userContext;
    }

    /** @inheritdoc */
    public fetch<RequestBody extends any, ResponseBody extends any>(
        request: Request<RequestBody>,
        user: Realm.User | null = this.userContext.currentUser,
    ): Promise<ResponseBody> {
        return this.transport.fetch({
            ...request,
            headers: {
                ...this.buildAuthorizationHeader(user),
                ...request.headers,
            },
        });
    }

    /** @inheritdoc */
    public prefix(pathPrefix: string): Transport {
        return new PrefixedTransport(this, pathPrefix);
    }

    /**
     * Generate an object with an authorization header to issue requests as a specific user.
     *
     * @param user An optional user to generate the header for
     * @returns An object containing with the users access token as authorization header or undefined if no user is given.
     */
    private buildAuthorizationHeader(user: Realm.User | null) {
        if (user) {
            // TODO: Ensure the access token is valid
            return {
                Authorization: `Bearer ${user.accessToken}`,
            };
        }
    }
}
