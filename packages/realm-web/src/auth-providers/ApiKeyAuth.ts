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

import { AuthenticatedTransport } from "../transports/AuthenticatedTransport";
import { deserialize } from "../utils/ejson";

/** @inheritdoc */
export class ApiKeyAuth implements Realm.Auth.ApiKeyAuth {
    /**
     * The transport used to send requests to services.
     */
    private readonly transport: AuthenticatedTransport;

    /**
     * Construct an interface to the API-key authentication provider.
     *
     * @param transport The transport used to send requests to services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(transport: AuthenticatedTransport, providerName = "api-key") {
        this.transport = transport.prefix("/auth/api_keys");
    }

    /** @inheritdoc */
    create(name: string): Promise<Realm.Auth.ApiKey> {
        return this.transport
            .fetch({
                method: "POST",
                body: { name },
                tokenType: "refresh",
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    fetch(keyId: string): Promise<Realm.Auth.ApiKey> {
        return this.transport
            .fetch({
                method: "GET",
                path: `/${keyId}`,
                tokenType: "refresh",
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    fetchAll(): Promise<Realm.Auth.ApiKey[]> {
        return this.transport
            .fetch({ method: "GET", tokenType: "refresh" })
            .then(deserialize);
    }

    /** @inheritdoc */
    delete(keyId: string): Promise<void> {
        return this.transport
            .fetch({
                method: "DELETE",
                path: `/${keyId}`,
                tokenType: "refresh",
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    enable(keyId: string): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: `/${keyId}/enable`,
                tokenType: "refresh",
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    disable(keyId: string): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: `/${keyId}/disable`,
                tokenType: "refresh",
            })
            .then(deserialize);
    }
}
