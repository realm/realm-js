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
  assertDeploymentDraftResponse,
  assertDeploymentResponse,
  assertDeploymentsDraftResponse,
  assertDeploymentsResponse,
  assertFunctionResponse,
  assertFunctionsResponse,
  assertLoginResponse,
  assertProfileResponse,
  assertSecretsResponse,
  assertServiceResponse,
  assertSessionRefreshResponse,
  isErrorResponse,
} from "./types";
import { AppConfig } from "./AppConfigBuilder";

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

export type AuthenticationMode = "access" | "refresh" | "none";

type ClientFetchRequest = Omit<FetchRequestInit, "headers"> & {
  route: string[];
  headers?: Record<string, string>;
  authentication?: AuthenticationMode;
};

type AdminApiClientConfig = {
  baseUrl: string;
};

/**
 * Simplified client for the Atlas App Services Admin API.
 */
export class AdminApiClient {
  private static readonly baseRoute = "api/admin/v3.0";

  private accessToken: string | null;
  private refreshToken: string | null;
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
        authentication: "none",
        route: ["auth", "providers", "mongodb-cloud", "login"],
        method: "POST",
        body: {
          username: credentials.publicKey,
          apiKey: credentials.privateKey,
        },
      });
      assertLoginResponse(response);
      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token;
    } else if (credentials.kind === "username-password") {
      const response = await this.fetch({
        authentication: "none",
        route: ["auth", "providers", "local-userpass", "login"],
        method: "POST",
        body: {
          username: credentials.username,
          password: credentials.password,
        },
      });
      assertLoginResponse(response);
      this.accessToken = response.access_token;
      this.refreshToken = response.refresh_token;
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
    await this.fetch({
      route: ["groups", await this.groupId, "apps", _id],
      method: "DELETE",
    });
  }

  public async configureDeployments(appId: string, config: Record<string, unknown>) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "deploy", "config"],
      method: "PATCH",
      body: config,
    });
  }

  public async createDeploymentDraft(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "drafts"],
      method: "POST",
    });
    assertDeploymentDraftResponse(response);
    return response;
  }

  public async deleteDeploymentDraft(appId: string, draftId: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "drafts", draftId],
      method: "DELETE",
    });
  }

  public async redeployDeployment(appId: string, deploymentId: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "deployments", deploymentId, "redeploy"],
      method: "POST",
    });
  }

  public async getDeployment(appId: string, deploymentId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "deployments", deploymentId],
      method: "GET",
    });
    assertDeploymentResponse(response);
    return response;
  }

  public async listDeploymentDrafts(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "drafts"],
      method: "GET",
    });
    assertDeploymentsDraftResponse(response);
    return response;
  }

  public async listDeployments(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "deployments"],
      method: "GET",
    });
    assertDeploymentsResponse(response);
    return response;
  }

  public async createSecret(appId: string, name: string, value: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "secrets"],
      body: { name, value },
      method: "POST",
    });
  }

  public async deleteSecret(appId: string, secretId: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "secrets", secretId],
      method: "DELETE",
    });
  }

  public async listSecrets(appId: string) {
    const response = await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "secrets"],
      method: "GET",
    });
    assertSecretsResponse(response);
    return response;
  }

  public async createValue(appId: string, name: string, value: string) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "values"],
      method: "POST",
      body: { name, value },
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
    const response = await this.fetch({
      route: ["auth", "profile"],
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    assertProfileResponse(response);
    return response;
  }

  public async listAuthProviders(appId: string) {
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

  public async listFunctions(appId: string) {
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

  public async createRule(
    appId: string,
    serviceId: string,
    config: AppConfig["services"][0][1][0],
    isDefault: boolean,
  ) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "services", serviceId, isDefault ? "default_rule" : "rules"],
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

  public async applyAllowedRequestOrigins(appId: string, origins: string[]) {
    await this.fetch({
      route: ["groups", await this.groupId, "apps", appId, "security", "allowed_request_origins"],
      method: "PUT",
      body: origins,
    });
  }

  private async refreshSession() {
    if (!this.refreshToken) {
      throw new Error("Need a refresh token before calling this method");
    }
    const response = await this.fetch({
      authentication: "refresh",
      route: ["auth", "session"],
      method: "POST",
    });
    assertSessionRefreshResponse(response);
    this.accessToken = response.access_token;
  }

  private async fetch(request: ClientFetchRequest) {
    try {
      const { route, body, headers = {}, authentication = "access", ...rest } = request;
      const url = [this.config.baseUrl, AdminApiClient.baseRoute, ...route].join("/");
      if (authentication === "access") {
        if (!this.accessToken) {
          throw new Error("Not yet authenticated");
        }
        headers["Authorization"] = `Bearer ${this.accessToken}`;
      } else if (authentication === "refresh") {
        if (!this.refreshToken) {
          throw new Error("Not yet authenticated");
        }
        headers["Authorization"] = `Bearer ${this.refreshToken}`;
      }
      if (typeof body === "object") {
        headers["content-type"] = "application/json";
      }
      const response = await DefaultNetworkTransport.fetch(url, {
        ...rest,
        body: JSON.stringify(body),
        headers,
        // Setting additional options to signal to the RN fetch polyfill that it shouldn't consider the response a "blob"
        // see https://github.com/react-native-community/fetch/issues/15
        reactNative: { textStreaming: true },
      } as FetchRequestInit);
      if (response.ok) {
        if (response.headers.get("content-type") === "application/json") {
          return response.json();
        }
      } else if (response.headers.get("content-type") === "application/json") {
        const json = await response.json();
        const error = isErrorResponse(json) ? json.error : "No error message";
        throw new Error(`Failed to fetch ${url}: ${error} (${response.status} ${response.statusText})`);
      } else {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText})`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("invalid session: access token expired")) {
        await this.refreshSession();
        return this.fetch(request);
      } else {
        throw err;
      }
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
