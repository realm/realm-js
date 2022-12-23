////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import { BSON, assert } from "../internal";
/**
 * Authentication provider where users identify using an API-key.
 */
export class ApiKeyAuthClient {
    /** @internal */
    user;
    /** @internal */
    internal;
    /** @internal */
    constructor(user, internal) {
        this.user = user;
        this.internal = internal;
    }
    /**
     * Creates an API key that can be used to authenticate as the current user.
     *
     * @param keyName the name of the API key to be created.
     */
    async create(keyName) {
        const { id, key, name, disabled } = await this.internal.createApiKey(keyName, this.user);
        assert.string(key);
        return { _id: id.toHexString(), key, name, disabled };
    }
    /**
     * Fetches an API key associated with the current user.
     *
     * @param keyId the id of the API key to fetch.
     */
    async fetch(keyId) {
        const { id, name, disabled } = await this.internal.fetchApiKey(new BSON.ObjectId(keyId), this.user);
        return { _id: id.toHexString(), name, disabled };
    }
    /**
     * Fetches the API keys associated with the current user.
     */
    async fetchAll() {
        const keys = await this.internal.fetchApiKeys(this.user);
        return keys.map(({ id, name, disabled }) => ({ _id: id.toHexString(), name, disabled }));
    }
    /**
     * Deletes an API key associated with the current user.
     *
     * @param keyId the id of the API key to delete
     */
    async delete(keyId) {
        await this.internal.deleteApiKey(new BSON.ObjectId(keyId), this.user);
    }
    /**
     * Enables an API key associated with the current user.
     *
     * @param keyId the id of the API key to enable
     */
    async enable(keyId) {
        await this.internal.enableApiKey(new BSON.ObjectId(keyId), this.user);
    }
    /**
     * Disable an API key associated with the current user.
     *
     * @param keyId the id of the API key to disable
     */
    async disable(keyId) {
        await this.internal.disableApiKey(new BSON.ObjectId(keyId), this.user);
    }
}
//# sourceMappingURL=ApiKeyAuthClient.js.map