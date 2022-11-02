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

import { SyncUser } from "../binding";
import { User, binding, Realm } from "../internal";

/**
 * The representation of an API-key stored in the service.
 */
export type ApiKey = {
  /**
   * The internal identifier of the key.
   */
  _id: string;

  /**
   * The secret part of the key.
   */
  key?: string;

  /**
   * A name for the key.
   */
  name: string;

  /**
   * When disabled, the key cannot authenticate.
   */
  disabled: boolean;
};

/**
 * Authentication provider where users identify using an API-key.
 */
export class ApiKeyAuthClient {
  /** @internal */
  private user: binding.SyncUser;
  /** @internal */
  private internal: binding.UserApiKeyProviderClient;

  /** @internal */
  constructor(user: binding.SyncUser, internal: binding.UserApiKeyProviderClient) {
    this.user = user;
    this.internal = internal;
  }

  /**
   * Creates an API key that can be used to authenticate as the current user.
   *
   * @param {string} name the name of the API key to be created.
   */
  async create(name: string): Promise<ApiKey> {
    return this.internal.createApiKey(name, this.user).then(({ id, key, name, disabled }) => {
      return { _id: id.toHexString(), key, name, disabled };
    });
  }

  /**
   * Fetches an API key associated with the current user.
   *
   * @param {string} keyId the id of the API key to fetch.
   */
  async fetch(keyId: string): Promise<ApiKey> {
    return this.internal.fetchApiKey(new Realm.BSON.ObjectId(keyId), this.user).then(({ id, key, name, disabled }) => {
      return { _id: id.toHexString(), key, name, disabled };
    });
  }

  /**
   * Fetches the API keys associated with the current user.
   */
  async fetchAll(): Promise<ApiKey[]> {
    return (await this.internal.fetchApiKeys(this.user)).map(({ id, key, name, disabled }) => {
      return { _id: id.toHexString(), key, name, disabled };
    });
  }

  /**
   * Deletes an API key associated with the current user.
   *
   * @param {string} keyId the id of the API key to delete
   */
  async delete(keyId: string) {
    this.internal.deleteApiKey(new Realm.BSON.ObjectId(keyId), this.user);
  }

  /**
   * Enables an API key associated with the current user.
   *
   * @param {string} keyId the id of the API key to enable
   */
  async enable(keyId: string) {
    this.internal.enableApiKey(new Realm.BSON.ObjectId(keyId), this.user);
  }

  /**
   * Disable an API key associated with the current user.
   *
   * @param {string} keyId the id of the API key to disable
   */
  async disable(keyId: string) {
    this.internal.disableApiKey(new Realm.BSON.ObjectId(keyId), this.user);
  }
}
