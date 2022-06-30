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

import fetch from "node-fetch";
import path from "path";
import fs from "fs-extra";
import glob from "glob";
import deepmerge from "deepmerge";

/**
 * First level keys are file globs and the values are objects that are spread over the content of the files matching the glob.
 * @example { "config.json": { name: "overridden-name" }, "services/local-mongodb/rules/*.json": { database: "another-database" } }
 */
export type TemplateReplacements = Record<string, Record<string, unknown>>;

/* eslint-disable no-console */

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

type LoginResponse = {
  access_token: string;
  refresh_token: string;
};

type ErrorResponse = {
  error: string;
};

type ProfileResponse = {
  roles: Role[];
};

type Role = { role_name: string; group_id: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isObject(json: unknown): json is Record<string, unknown> {
  return typeof json === "object" && json !== null;
}

function isAppResponse(json: unknown): json is App {
  if (isObject(json)) {
    return typeof json.client_app_id === "string" && typeof json._id === "string";
  } else {
    return false;
  }
}

function isAppsResponse(json: unknown): json is App[] {
  return Array.isArray(json) && json.every(isAppResponse);
}

function isLoginResponse(json: unknown): json is LoginResponse {
  if (isObject(json)) {
    return typeof json.access_token === "string" && typeof json.refresh_token === "string";
  } else {
    return false;
  }
}

function isErrorResponse(json: unknown): json is ErrorResponse {
  if (isObject(json)) {
    return typeof json.error === "string";
  } else {
    return false;
  }
}

function isProfileResponse(json: unknown): json is ProfileResponse {
  if (isObject(json)) {
    return Array.isArray(json.roles) && json.roles.every((item) => typeof item.role_name === "string");
  } else {
    return false;
  }
}

export interface AppImporterOptions {
  baseUrl: string;
  credentials: Credentials;
  realmConfigPath: string;
  appsDirectoryPath: string;
  cleanUp?: boolean;
  atlasCluster?: string;
}

type App = {
  _id: string;
  client_app_id: string;
  name: string;
  location: string;
  deployment_model: string;
  domain_id: string;
  group_id: string;
  last_used: number;
  last_modified: number;
  product: string;
  environment: string;
};

export class AppImporter {
  private readonly baseUrl: string;
  private readonly credentials: Credentials;
  private readonly atlasCluster?: string;
  private readonly realmConfigPath: string;
  private readonly appsDirectoryPath: string;

  private accessToken: string | undefined;

  constructor({
    baseUrl,
    credentials,
    realmConfigPath,
    appsDirectoryPath,
    cleanUp = true,
    atlasCluster,
  }: AppImporterOptions) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.atlasCluster = atlasCluster;
    this.realmConfigPath = realmConfigPath;
    this.appsDirectoryPath = appsDirectoryPath;

    if (cleanUp) {
      process.on("exit", () => {
        // Remove any stitch configuration
        if (fs.existsSync(this.realmConfigPath)) {
          console.log(`Deleting ${this.realmConfigPath}`);
          fs.removeSync(this.realmConfigPath);
        }
        // If there is nothing the the apps directory, lets delete it
        if (fs.existsSync(this.appsDirectoryPath)) {
          console.log(`Deleting ${this.appsDirectoryPath}`);
          fs.removeSync(this.appsDirectoryPath);
        }
      });
    }
  }

  /**
   * @param appTemplatePath The path to a template directory containing the configuration files needed to import the app.
   * @param replacements An object with file globs as keys and a replacement object as values. Allows for just-in-time replacements of configuration parameters.
   * @returns A promise of an object containing the app id.
   */
  public async importApp(appTemplatePath: string, replacements: TemplateReplacements = {}): Promise<{ appId: string }> {
    const { name: appName } = this.loadAppConfigJson(appTemplatePath);
    await this.logIn();
    const groupId = await this.getGroupId();

    // Get or create an application
    //const foundApp = await this.findApp(groupId, appName);
    // if (foundApp && false) {
    //   console.log("App already deployed: ", foundApp);
    //   //await this.applyAppConfiguration(appTemplatePath, foundApp._id, groupId);
    //   return { appId: foundApp.client_app_id };
    // } else {
    const app = /*(await this.findApp(groupId, appName)) || */ await this.createApp(groupId, appName);
    const appId = app.client_app_id;

    // Determine the path of the new app
    const appPath = path.resolve(this.appsDirectoryPath, appId);
    console.log("copying app path: ", appPath);
    // Copy over the app template
    this.copyAppTemplate(appPath, appTemplatePath);
    console.log("copying app template path: ", appTemplatePath);
    // Apply any replacements to the files before importing from them
    this.applyReplacements(appPath, replacements);
    console.log("applying replacements: ", replacements);

    await this.applyAppConfiguration(appPath, app._id, groupId);

    return { appId };
    //}
  }

  public async deleteApp(clientAppId: string): Promise<void> {
    await this.logIn();
    const groupId = await this.getGroupId();

    const app = await this.getAppByClientAppId(groupId, clientAppId);
    const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps/${app._id}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to delete app with client app ID '${clientAppId}' in group '${groupId}'`);
    }
  }

  private get apiUrl() {
    return `${this.baseUrl}/api/admin/v3.0`;
  }

  private loadJson(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to load JSON (${filePath}): ${(err as Error).message}`);
    }
  }

  private loadAppConfigJson(appTemplatePath: string) {
    const configJsonPath = path.resolve(appTemplatePath, "config.json");
    return this.loadJson(configJsonPath);
  }

  private loadSecretsJson(appTemplatePath: string) {
    const secretsJsonPath = path.resolve(appTemplatePath, "secrets.json");
    if (fs.existsSync(secretsJsonPath)) {
      return this.loadJson(secretsJsonPath);
    } else {
      return {};
    }
  }

  private copyAppTemplate(appPath: string, appTemplatePath: string) {
    // Only copy over the template, if the app doesn't already exist
    if (!fs.existsSync(appPath)) {
      fs.mkdirpSync(appPath);
      fs.copySync(appTemplatePath, appPath, {
        recursive: true,
      });
    }
  }

  private applyReplacements(appPath: string, replacements: TemplateReplacements) {
    for (const [fileGlob, replacement] of Object.entries(replacements)) {
      console.log(`Applying replacements to ${fileGlob}`);
      const files = glob.sync(fileGlob, { cwd: appPath });
      for (const relativeFilePath of files) {
        const filePath = path.resolve(appPath, relativeFilePath);
        const content = fs.readJSONSync(filePath);
        const mergedContent = deepmerge(content, replacement);
        fs.writeJSONSync(filePath, mergedContent, { spaces: 2 });
      }
    }
  }

  private async enableDevelopmentMode(groupId: string, appId: string) {
    const configUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/sync/config`;
    const config = { development_mode_enabled: true };
    const response = await fetch(configUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      console.error("Could not apply development mode: ", config, configUrl);
    }
  }

  private async configureAuthProviders(authConfig: any, appId: string, groupId: string) {
    console.log("Applying auth providers... ");
    //TODO: Check if auth provider is already existing and patch it
    const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/auth_providers`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: authConfig,
    });
    if (!response.ok) {
      console.warn("Could not apply auth_provider: ", authConfig);
    }
  }

  private async configureServiceFromAppPath(appPath: string, appId: string, groupId: string) {
    const servicesDir = path.join(appPath, "services");
    if (fs.existsSync(servicesDir)) {
      console.log("Applying services... ");
      const serviceDirectories = fs.readdirSync(servicesDir);
      for (const serviceDir of serviceDirectories) {
        console.log("applying service: ", serviceDir);
        const configFilePath = path.join(servicesDir, serviceDir, "config.json");
        console.log(configFilePath);
        if (fs.existsSync(configFilePath)) {
          const config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
          const tmpConfig = { name: config.name, type: config.type, config: config.config };
          if (config.type === "mongodb-atlas") {
            tmpConfig.config = { clusterName: config.config.clusterName };
          }
          const dbName = config.config.sync
            ? config.config.sync.database_name
            : config.config.flexible_sync.database_name;
          const serviceUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/services`;
          console.log("config so far:", config);
          const response = await fetch(serviceUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) {
            console.warn("Could not create service: ", tmpConfig, serviceUrl, response.statusText);
          } else {
            await this.enableDevelopmentMode(groupId, appId);
            const rulesDir = path.join(servicesDir, serviceDir, "rules");
            const responseJson = await response.json();
            const serviceId = responseJson._id;
            if (fs.existsSync(rulesDir)) {
              console.log("applying rules");
              const ruleFiles = fs.readdirSync(rulesDir);
              for (const ruleFile of ruleFiles) {
                const ruleFilePath = path.join(rulesDir, ruleFile);
                const ruleConfig = JSON.parse(fs.readFileSync(ruleFilePath, "utf-8"));
                ruleConfig.database = dbName;
                const schemaConfig = ruleConfig.schema || null;
                if (schemaConfig) {
                  // Schema is not valid in a rule request
                  delete ruleConfig.schema;
                }
                const rulesUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/services/${serviceId}/rules`;
                const response = await fetch(rulesUrl, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "content-type": "application/json",
                  },
                  body: JSON.stringify(ruleConfig),
                });
                if (!response.ok) {
                  console.warn("Could not create rule: ", ruleConfig, rulesUrl, response.statusText);
                }
              }
            }
          }
        }
      }
    }
  }

  private async applyAppConfiguration(appPath: string, appId: string, groupId: string) {
    console.log("applyAppConfiguration v1: ", appPath);

    const authProviderDir = path.join(appPath, "auth_providers");

    if (fs.existsSync(authProviderDir)) {
      const authFileNames = fs.readdirSync(authProviderDir);
      for (const authFileName of authFileNames) {
        const authFilePath = path.join(authProviderDir, authFileName);
        const authConfig = fs.readFileSync(authFilePath, "utf-8");
        await this.configureAuthProviders(authConfig, appId, groupId);
      }
    }

    // Create all secrets in parallel
    const secrets = this.loadSecretsJson(appPath);
    await Promise.all(
      Object.entries<string>(secrets).map(async ([name, value]) => {
        if (typeof value !== "string") {
          throw new Error(`Expected a secret string value for '${name}'`);
        }
        return this.createSecret(groupId, appId, name, value);
      }),
    );

    await this.configureServiceFromAppPath(appPath, appId, groupId);

    const functionsPath = path.join(appPath, "functions");
    if (fs.existsSync(functionsPath)) {
      console.log("Applying functions... ");
    }
  }

  private performLogIn() {
    const { credentials } = this;
    if (credentials.kind === "api-key") {
      console.log(`${this.apiUrl}/auth/providers/mongodb-cloud/login`);
      return fetch(`${this.apiUrl}/auth/providers/mongodb-cloud/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: credentials.publicKey,
          apiKey: credentials.privateKey,
        }),
      });
    } else if (credentials.kind === "username-password") {
      return fetch(`${this.apiUrl}/auth/providers/local-userpass/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });
    } else {
      throw new Error(`Unexpected credentials: ${credentials}`);
    }
  }

  private async logIn() {
    // Store the access and refresh tokens
    const response = await this.performLogIn();
    const responseBody = await response.json();
    if (response.ok && isLoginResponse(responseBody)) {
      this.accessToken = responseBody.access_token;
      // Write the stitch config file
      const { credentials } = this;
      this.saveStitchConfig(
        credentials.kind === "api-key" ? credentials.publicKey : credentials.username,
        responseBody.refresh_token,
        responseBody.access_token,
      );
    } else if (isErrorResponse(responseBody)) {
      throw new Error(`Failed to log in: ${responseBody.error}`);
    } else {
      throw new Error("Failed to log in");
    }
  }

  private saveStitchConfig(username: string, refreshToken: string, accessToken: string) {
    const realmConfig = [
      `public_api_key: ${username}`,
      `refresh_token: ${refreshToken}`,
      `access_token: ${accessToken}`,
    ];
    fs.writeFileSync(this.realmConfigPath, realmConfig.join("\n"), "utf8");
  }

  private async getProfile() {
    if (!this.accessToken) {
      throw new Error("Login before calling this method");
    }
    const url = `${this.baseUrl}/api/admin/v3.0/auth/profile`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (response.ok) {
      const json = await response.json();
      if (!isProfileResponse(json)) {
        throw new Error("Expected a profile response");
      }
      return json;
    } else {
      throw new Error("Failed to get users profile");
    }
  }

  private async getGroupId(): Promise<string> {
    const profile = await this.getProfile();
    const groupIds = profile.roles.map((r) => r.group_id).filter(isString);
    const uniqueGroupIds = [...new Set(groupIds)];
    if (uniqueGroupIds.length === 1) {
      return uniqueGroupIds[0];
    } else {
      throw new Error("Expected user to have a role in a single group");
    }
  }

  private async getAppByClientAppId(groupId: string, clientAppId: string): Promise<App> {
    if (!this.accessToken) {
      throw new Error("Login before calling this method");
    }
    const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
    });
    if (response.ok) {
      const apps = await response.json();
      if (!isAppsResponse(apps)) {
        throw new Error("Expected a response with apps");
      }
      const app = apps.find((app) => app.client_app_id === clientAppId);
      if (!app) {
        throw new Error(`App with client app ID '${clientAppId}' in group '${groupId}' not found`);
      }
      return app;
    } else {
      throw new Error(`Failed to find app with client app ID '${clientAppId}' in group '${groupId}'`);
    }
  }

  private async findApp(groupId: string, name: string) {
    if (!this.accessToken) {
      throw new Error("Login before calling this method");
    }
    const response = await fetch(`${this.apiUrl}/groups/${groupId}/apps`, {
      method: "GET",
      headers: { authorization: `Bearer ${this.accessToken}` },
    });
    if (response.ok) {
      const appList = (await response.json()) as Array<App>;
      return appList.find((app) => app.name === name);
    } else {
      throw new Error(`Failed reach app listing in group '${groupId}'`);
    }
  }

  private async createApp(groupId: string, name: string) {
    if (!this.accessToken) {
      throw new Error("Login before calling this method");
    }
    const url = `${this.baseUrl}/api/admin/v3.0/groups/${groupId}/apps`;
    const body = JSON.stringify({
      name,
      sync: {
        development_mode_enabled: true,
      },
    });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body,
    });
    if (response.ok) {
      const json = await response.json();
      if (!isAppResponse(json)) {
        throw new Error("Expected an app response");
      }
      return json;
    } else {
      throw new Error(`Failed to create app named '${name}' in group '${groupId}'`);
    }
  }

  private async createSecret(groupId: string, internalAppId: string, name: string, value: string) {
    console.log(`Creating "${name}" secret`);
    if (!this.accessToken) {
      throw new Error("Login before calling this method");
    }
    const url = `${this.apiUrl}/groups/${groupId}/apps/${internalAppId}/secrets`;
    const body = JSON.stringify({ name, value });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Failed to create secret '${name}'`);
    }
  }
}
