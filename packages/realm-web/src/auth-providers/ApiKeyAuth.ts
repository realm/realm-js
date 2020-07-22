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

import { Fetcher } from "../Fetcher";

/** @inheritdoc */
export class ApiKeyAuth implements Realm.Auth.ApiKeyAuth {
    /**
     * The fetcher used to send requests to services.
     */
    private readonly fetcher: Fetcher;

    /**
     * Construct an interface to the API-key authentication provider.
     *
     * @param fetcher The fetcher used to send requests to services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(fetcher: Fetcher, providerName = "api-key") {
        this.fetcher = fetcher;
    }

    /** @inheritdoc */
    async create(name: string): Promise<Realm.Auth.ApiKey> {
        const locationUrl = await this.fetcher.getLocationUrl();
        return this.fetcher.fetchJSON({
            method: "POST",
            body: { name },
            url: locationUrl.auth().apiKeys().url,
            tokenType: "refresh",
        });
    }

    /** @inheritdoc */
    async fetch(keyId: string): Promise<Realm.Auth.ApiKey> {
        const locationUrl = await this.fetcher.getLocationUrl();
        return this.fetcher.fetchJSON({
            method: "GET",
            url: locationUrl.auth().apiKeys().key(keyId).url,
            tokenType: "refresh",
        });
    }

    /** @inheritdoc */
    async fetchAll(): Promise<Realm.Auth.ApiKey[]> {
        const locationUrl = await this.fetcher.getLocationUrl();
        return this.fetcher.fetchJSON({
            method: "GET",
            tokenType: "refresh",
            url: locationUrl.auth().apiKeys().url,
        });
    }

    /** @inheritdoc */
    async delete(keyId: string): Promise<void> {
        const locationUrl = await this.fetcher.getLocationUrl();
        await this.fetcher.fetchJSON({
            method: "DELETE",
            url: locationUrl.auth().apiKeys().key(keyId).url,
            tokenType: "refresh",
        });
    }

    /** @inheritdoc */
    async enable(keyId: string): Promise<void> {
        const locationUrl = await this.fetcher.getLocationUrl();
        await this.fetcher.fetchJSON({
            method: "PUT",
            url: locationUrl.auth().apiKeys().key(keyId).enable().url,
            tokenType: "refresh",
        });
    }

    /** @inheritdoc */
    async disable(keyId: string): Promise<void> {
        const locationUrl = await this.fetcher.getLocationUrl();
        await this.fetcher.fetchJSON({
            method: "PUT",
            url: locationUrl.auth().apiKeys().key(keyId).disable().url,
            tokenType: "refresh",
        });
    }
}
