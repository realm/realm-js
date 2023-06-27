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
import routes from "../routes";

/** @inheritdoc */
export class ApiKeyAuth implements Realm.Auth.ApiKeyAuth {
  /**
   * The fetcher used to send requests to services.
   */
  private readonly fetcher: Fetcher;

  /**
   * Construct an interface to the API-key authentication provider.
   * @param fetcher The fetcher used to send requests to services.
   */
  constructor(fetcher: Fetcher) {
    this.fetcher = fetcher;
  }

  /** @inheritdoc */
  create(name: string): Promise<Realm.Auth.ApiKey> {
    return this.fetcher.fetchJSON({
      method: "POST",
      body: { name },
      path: routes.api().auth().apiKeys().path,
      tokenType: "refresh",
    });
  }

  /** @inheritdoc */
  fetch(keyId: string): Promise<Realm.Auth.ApiKey> {
    return this.fetcher.fetchJSON({
      method: "GET",
      path: routes.api().auth().apiKeys().key(keyId).path,
      tokenType: "refresh",
    });
  }

  /** @inheritdoc */
  fetchAll(): Promise<Realm.Auth.ApiKey[]> {
    return this.fetcher.fetchJSON({
      method: "GET",
      tokenType: "refresh",
      path: routes.api().auth().apiKeys().path,
    });
  }

  /** @inheritdoc */
  async delete(keyId: string): Promise<void> {
    await this.fetcher.fetchJSON({
      method: "DELETE",
      path: routes.api().auth().apiKeys().key(keyId).path,
      tokenType: "refresh",
    });
  }

  /** @inheritdoc */
  async enable(keyId: string): Promise<void> {
    await this.fetcher.fetchJSON({
      method: "PUT",
      path: routes.api().auth().apiKeys().key(keyId).enable().path,
      tokenType: "refresh",
    });
  }

  /** @inheritdoc */
  async disable(keyId: string): Promise<void> {
    await this.fetcher.fetchJSON({
      method: "PUT",
      path: routes.api().auth().apiKeys().key(keyId).disable().path,
      tokenType: "refresh",
    });
  }
}
