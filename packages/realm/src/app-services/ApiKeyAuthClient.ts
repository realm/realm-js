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

import { User, binding } from "../internal";

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
  key: string;

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
  private user: binding.UserApiKeyProviderClient;
  /** @internal */
  private internal: binding.UserApiKeyProviderClient;

  /** @internal */
  constructor(user: User<unknown, unknown, unknown>, internal: binding.UserApiKeyProviderClient) {
    this.user = user;
    this.internal = internal;
  }

  /**
   * Creates an API key that can be used to authenticate as the current user.
   *
   * @param name the name of the API key to be created.
   */
  async create(name: string): Promise<ApiKey> {
    throw new Error("Not yet implemented");
  }

  /**
   * Fetches an API key associated with the current user.
   *
   * @param keyId the id of the API key to fetch.
   */
  async fetch(keyId: string): Promise<ApiKey> {
    throw new Error("Not yet implemented");
  }

  /**
   * Fetches the API keys associated with the current user.
   */
  async fetchAll(): Promise<ApiKey[]> {
    throw new Error("Not yet implemented");
  }

  /**
   * Deletes an API key associated with the current user.
   *
   * @param keyId the id of the API key to delete
   */
  async delete(keyId: string) {
    throw new Error("Not yet implemented");
  }

  /**
   * Enables an API key associated with the current user.
   *
   * @param keyId the id of the API key to enable
   */
  async enable(keyId: string) {
    throw new Error("Not yet implemented");
  }

  /**
   * Disable an API key associated with the current user.
   *
   * @param keyId the id of the API key to disable
   */
  async disable(keyId: string) {
    throw new Error("Not yet implemented");
  }
}
