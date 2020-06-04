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

import { Transport } from "../transports";
import { deserialize } from "../utils/ejson";

/** @inheritdoc */
export class ApiKeyAuthProvider
    implements Realm.AuthProviders.ApiKeyAuthProvider {
    /**
     * The transport used to send requests to services.
     */
    private readonly transport: Transport;

    /**
     * Construct an interface to the API-key authentication provider.
     *
     * @param transport The transport used to send requests to services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(transport: Transport, providerName = "api-key") {
        this.transport = transport.prefix("/auth/api_keys");
    }

    /** @inheritdoc */
    create(name: string): Promise<Realm.AuthProviders.ApiKey> {
        return this.transport
            .fetch({
                method: "POST",
                body: { name },
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    get(keyId: Realm.ObjectId): Promise<Realm.AuthProviders.ApiKey> {
        return this.transport
            .fetch({
                method: "GET",
                path: "/" + keyId.toHexString(),
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    list(): Promise<Realm.AuthProviders.ApiKey[]> {
        return this.transport.fetch({ method: "GET" }).then(deserialize);
    }

    /** @inheritdoc */
    delete(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "DELETE",
                path: "/" + keyId.toHexString(),
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    enable(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: "/enable/" + keyId.toHexString(),
            })
            .then(deserialize);
    }

    /** @inheritdoc */
    disable(keyId: Realm.ObjectId): Promise<void> {
        return this.transport
            .fetch({
                method: "PUT",
                path: "/disable/" + keyId.toHexString(),
            })
            .then(deserialize);
    }
}
