////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { DefaultNetworkTransport, FetchRequestInit } from "@realm/network-transport";
import {
  App,
  AppResponse,
  assertAppResponse,
  assertAppsResponse,
  assertAuthProvidersResponse,
  assertFunctionResponse,
  assertFunctionsResponse,
  assertLoginResponse,
  assertProfileResponse,
  assertServiceResponse,
  isErrorResponse,
} from "./types";

export type Credentials =
  | {
      kind: "api-key";
      publicKey: string;
      privateKey: string;
    }
  | {
      kind: "username-password";
      username: string;
      password: string;
    };

type ClientFetchRequest = Omit<FetchRequestInit, "headers"> & { route: string[]; headers?: Record<string, string> };

type AdminApiClientConfig = {
  baseUrl: string;
};

export type SyncConfig = {
  development_mode_enabled?: boolean;
};

/**
 * Simplified client for the Atlas App Services Admin API.
 */
export class AdminApiClient {
  private accessToken: string | null;
  private _groupId: Promise<string> | null;

  constructor(private config: AdminApiClientConfig) {}

  public get groupId(): Promise<string> {
    if (!this._groupId) {
      this._groupId = this.getGroupId();
    }
    return this._groupId;
  }

  public async logIn(credentials: Credentials) {
    if (credentials.kind === "api-key") {
      const response = await this.fetch({
        route: ["auth", "providers", "mongodb-cloud", "login"],
        method: "POST",
        body: {
          username: credentials.publicKey,
          apiKey: credentials.privateKey,
        },
      });
      assertLoginResponse(response);
      this.accessToken = response.access_token;
    } else if (credentials.kind === "username-password") {
      const response = await this.fetch({
        route: ["auth", "providers", "local-userpass", "login"],
        method: "POST",
        body: {
          username: credentials.username,
          password: credentials.password,
        },
      });
      assertLoginResponse(response);
      this.accessToken = response.access_token;
    } else {
      throw new Error(`Unexpected credentials: ${credentials}`);
    }
  }

  public async ensureLogIn(credentials: Credentials) {
    if (!this.accessToken) {
      await this.logIn(credentials);
    }
  }

  public async createApp(name: string): Promise<AppResponse> {
    this.assertLoggedIn();
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps"],
      method: "POST",
      body: {
        name,
        sync: {
          development_mode_enabled: true,
        },
      },
    });
    assertAppResponse(response);
    return response;
  }

  public async deleteApp(_id: string): Promise<void> {
    this.assertLoggedIn();
    await this.fetch({
      route: ["groups", await this.groupId, "apps", _id],
      method: "DELETE",
    });
  }

  public async createSecret(internalAppId: string, name: string, value: string) {
    this.assertLoggedIn();
    await this.fetch({
      route: ["groups", await this.groupId, "apps", internalAppId, "secrets"],
      body: { name, value },
      method: "POST",
    });
  }

  public async createValue(appId: string, config: Record<string, unknown>) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "values"],
      method: "POST",
      body: config,
    });
  }

  public async createService(appId: string, config: Record<string, unknown>) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "services"],
      method: "POST",
      body: config,
    });
    assertServiceResponse(response);
    return response;
  }

  public async findApp(name: string) {
    this.assertLoggedIn();
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps"],
      method: "GET",
    });
    assertAppsResponse(response);
    const app = response.find((app) => app.name === name);
    if (!app) {
      throw new Error(`App with name '${name}' not found`);
    }
  }

  public async getAppByClientAppId(clientAppId: string): Promise<App> {
    this.assertLoggedIn();
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps"],
      method: "GET",
    });
    assertAppsResponse(response);
    const app = response.find((app) => app.client_app_id === clientAppId);
    if (!app) {
      throw new Error(`App with client app ID '${clientAppId}' not found`);
    }
    return app;
  }

  public async getProfile() {
    this.assertLoggedIn();
    const response = await this.fetch({
      route: ["auth", "profile"],
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    assertProfileResponse(response);
    return response;
  }

  public async getAuthProviders(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "auth_providers"],
      method: "GET",
    });
    assertAuthProvidersResponse(response);
    return response;
  }

  public async createAuthProvider(appId: string, config: Record<string, unknown>) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "auth_providers"],
      method: "POST",
      body: config,
    });
  }

  public async patchAuthProvider(appId: string, _id: string, config: Record<string, unknown>) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "auth_providers", _id],
      method: "PATCH",
      body: { ...config, _id },
    });
  }

  public async getFunctions(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "functions"],
      method: "GET",
    });
    assertFunctionsResponse(response);
    return response;
  }

  public async createFunction(appId: string, config: Record<string, unknown>) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "functions"],
      method: "POST",
      body: config,
    });
    assertFunctionResponse(response);
    return response;
  }

  public async createRule(appId: string, serviceId: string, serviceType: string, config: Record<string, unknown>) {
    const schemaConfig = config.schema || null;
    if (schemaConfig) {
      // Schema is not valid in a rule request, but is included when exporting an app from realm
      delete config.schema;
    }

    const relationshipsConfig = config.relationships || null;
    if (relationshipsConfig) {
      // Relationships is not valid in a rule request, but is included when exporting an app from realm
      delete config.relationships;
    }

    await this.fetch({
      route: [
        "groups",
        await this.groupId,
        "apps",
        appId,
        "services",
        serviceId,
        serviceType === "mongodb" || serviceType === "mongodb-atlas" ? "default_rule" : "rules",
      ],
      method: "POST",
      body: config,
    });
  }

  public async applySyncConfig(appId: string, config: SyncConfig) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "sync", "config"],
      method: "PUT",
      body: config,
    });
  }

  public async applyAllowedRequestOrigins(origins: string[], appId: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "security", "allowed_request_origins"],
      method: "PUT",
      body: origins,
    });
  }

  private assertLoggedIn() {
    if (!this.accessToken) {
      throw new Error("Need a log in before calling this method");
    }
  }

  private async fetch({ route, body, headers = {}, ...rest }: ClientFetchRequest) {
    const url = [this.config.baseUrl, "api/admin/v3.0", ...route].join("/");
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    if (typeof body === "object") {
      headers["content-type"] = "application/json";
    }
    const response = await DefaultNetworkTransport.fetch(url, { ...rest, body: JSON.stringify(body), headers });
    if (response.ok) {
      if (response.headers.get("content-type") === "application/json") {
        return response.json();
      }
    } else {
      const json = await response.json();
      const error = isErrorResponse(json) ? json.error : "No error message";
      throw new Error(`Failed to fetch ${url}: ${error} (${response.status} ${response.statusText})`);
    }
  }

  private async getGroupId(): Promise<string> {
    const profile = await this.getProfile();
    const groupIds = profile.roles.map((r) => r.group_id).filter((id) => typeof id === "string");
    const uniqueGroupIds = [...new Set(groupIds)];
    if (uniqueGroupIds.length === 1) {
      return uniqueGroupIds[0];
    } else {
      throw new Error("Expected user to have a role in a single group");
    }
  }
}
