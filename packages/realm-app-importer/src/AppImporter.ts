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
import { Credentials } from "./sharedTypes";

/**
 * First level keys are file globs and the values are objects that are spread over the content of the files matching the glob.
 * @example { "config.json": { name: "overridden-name" }, "services/local-mongodb/rules/*.json": { database: "another-database" } }
 */
export type TemplateReplacements = Record<string, Record<string, unknown>>;

/* eslint-disable no-console */

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

type LoginResponse = {
  access_token: string;
  refresh_token: string;
};

type AppConfig = {
  name: string;
  sync?: SyncConfig;
  security?: {
    allowed_request_origins?: string[];
  };
};

type SyncConfig = {
  development_mode_enabled?: boolean;
};

type ErrorResponse = {
  error: string;
};

type ProfileResponse = {
  roles: Role[];
};

type Role = { role_name: string; group_id: string };

type AuthProvider = {
  _id: string;
  name: string;
  type: string;
  disabled: boolean;
};

type RemoteFunction = {
  _id: string;
  name: string;
  last_modified: number;
};

type Service = {
  _id: string;
};

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

function isServiceResponse(json: unknown): json is Service {
  if (isObject(json)) {
    return typeof json._id === "string";
  } else {
    return false;
  }
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

function isRemoteFunctionsResponse(json: unknown): json is RemoteFunction[] {
  if (Array.isArray(json)) {
    return json.every((item) => typeof item._id === "string" && typeof item.name === "string");
  } else {
    return false;
  }
}

function isAuthProvidersResponse(json: unknown): json is AuthProvider[] {
  if (Array.isArray(json)) {
    return json.every(
      (item) => typeof item._id === "string" && typeof item.name === "string" && typeof item.type === "string",
    );
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
}

export class AppImporter {
  private readonly baseUrl: string;
  private readonly credentials: Credentials;
  private readonly realmConfigPath: string;
  private readonly appsDirectoryPath: string;

  private accessToken: string | undefined;

  constructor({ baseUrl, credentials, realmConfigPath, appsDirectoryPath, cleanUp = true }: AppImporterOptions) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
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
    const { name: appName, sync, security } = this.loadAppConfigJson(appTemplatePath);

    await this.logIn();

    const groupId = await this.getGroupId();
    const app = await this.createApp(groupId, appName);
    const appId = app.client_app_id;
    try {
      // Determine the path of the new app
      const appPath = path.resolve(this.appsDirectoryPath, appId);

      // Copy over the app template
      this.copyAppTemplate(appPath, appTemplatePath);

      // Apply any replacements to the files before importing from them
      this.applyReplacements(appPath, replacements);

      // Apply allowed request origins if they exist
      if (security?.allowed_request_origins) {
        this.applyAllowedRequestOrigins(security.allowed_request_origins, app._id, groupId);
      }

      // Create the app service
      await this.applyAppConfiguration(appPath, app._id, groupId, sync);

      if (appId) {
        console.log(`The application ${appId} was successfully deployed...`);
        console.log(`${this.baseUrl}/groups/${groupId}/apps/${app._id}/dashboard`);
      }

      return { appId };
    } catch (err) {
      console.log(`Something went wrong on import, cleaning up the app ${appId}`);
      await this.deleteApp(appId);
      throw err;
    }
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

  private loadAppConfigJson(appTemplatePath: string): AppConfig {
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

  private async applyAllowedRequestOrigins(origins: string[], appId: string, groupId: string) {
    console.log("Applying allowed request origins: ", origins);
    const originsUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/security/allowed_request_origins`;
    const response = await fetch(originsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(origins),
    });
    if (!response.ok) {
      console.error("Could not apply request origins: ", origins, originsUrl, response.status, response.statusText);
    }
  }

  private async applySyncConfig(groupId: string, appId: string, config: SyncConfig) {
    const configUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/sync/config`;
    const response = await fetch(configUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      console.error("Could not apply sync configuration: ", config, configUrl, response.status, response.statusText);
    }
  }

  private async configureValuesFromAppPath(appPath: string, appId: string, groupId: string) {
    const valuesDir = path.join(appPath, "values");

    if (fs.existsSync(valuesDir)) {
      console.log("Applying values...");
      const valuesDirs = fs.readdirSync(valuesDir);
      for (const valueFile of valuesDirs) {
        const configPath = path.join(valuesDir, valueFile);
        const config = this.loadJson(configPath);

        console.log("creating new value: ", config);
        const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/values`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(config),
        });
        if (!response.ok) {
          const json = await response.json();
          const error = isErrorResponse(json) ? json.error : "No error message";
          console.error("Failed to apply function: ", { config, url, error });
        }
      }
    }
  }

  private async configureServiceFromAppPath(appPath: string, appId: string, groupId: string, syncConfig?: SyncConfig) {
    const servicesDir = path.join(appPath, "services");
    if (fs.existsSync(servicesDir)) {
      console.log("Applying services... ");
      const serviceDirectories = fs.readdirSync(servicesDir);

      // It is possible for there to be multiple service directories
      for (const serviceDir of serviceDirectories) {
        const configFilePath = path.join(servicesDir, serviceDir, "config.json");
        if (fs.existsSync(configFilePath)) {
          const config = this.loadJson(configFilePath);

          const serviceUrl = `${this.apiUrl}/groups/${groupId}/apps/${appId}/services`;
          const response = await fetch(serviceUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) {
            throw new Error(
              `Could not create service: ${JSON.stringify(config)}, ${serviceUrl}, ${response.statusText}`,
            );
          } else {
            if (syncConfig) {
              await this.applySyncConfig(groupId, appId, syncConfig);
            }
            const rulesDir = path.join(servicesDir, serviceDir, "rules");
            const responseJson = await response.json();
            if (!isServiceResponse(responseJson)) {
              throw new Error("Expected a service response");
            }
            const serviceId = responseJson._id;
            // rules must be applied after the service is created
            if (fs.existsSync(rulesDir)) {
              console.log("Applying rules...");
              const ruleFiles = fs.readdirSync(rulesDir);
              for (const ruleFile of ruleFiles) {
                const ruleFilePath = path.join(rulesDir, ruleFile);
                const config = this.loadJson(ruleFilePath);
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
                const url =
                  config.type === "mongodb" || config.type === "mongodb-atlas"
                    ? `${this.apiUrl}/groups/${groupId}/apps/${appId}/services/${serviceId}/default_rule`
                    : `${this.apiUrl}/groups/${groupId}/apps/${appId}/services/${serviceId}/rules`;

                const response = await fetch(url, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "content-type": "application/json",
                  },
                  body: JSON.stringify(config),
                });
                if (!response.ok) {
                  const json = await response.json();
                  const error = isErrorResponse(json) ? json.error : "No error message";
                  const configStr = JSON.stringify(config);
                  throw new Error(`Could not create rule: ${error} - ${configStr}`);
                }
              }
            }
          }
        }
      }
    }
  }

  private async configureAuthProvidersFromAppPath(appPath: string, appId: string, groupId: string) {
    const authProviderDir = path.join(appPath, "auth_providers");

    // Some auth providers use a remote function.  This makes sure the ids are available to add to the configuration
    const remoteFunctions = await this.getFunctions(appId, groupId);

    if (fs.existsSync(authProviderDir)) {
      console.log("Applying auth providers...");
      const authFileNames = fs.readdirSync(authProviderDir);
      const providers = await this.getAuthProviders(appId, groupId);
      for (const authFileName of authFileNames) {
        const authFilePath = path.join(authProviderDir, authFileName);
        const config = this.loadJson(authFilePath);

        console.log("Applying ", config.name);

        // Add the ID of the resetFunction to the configuration
        if (config?.config?.resetFunctionName) {
          const resetFunctionId = remoteFunctions.find((func) => func.name === config.config.resetFunctionName)?._id;
          config.config.resetFunctionId = resetFunctionId;
        }

        // Add the ID of the authFunction to the configuration
        if (config?.config?.authFunctionName) {
          const authFunctionId = remoteFunctions.find((func) => func.name === config.config.authFunctionName)?._id;
          config.config.authFunctionId = authFunctionId;
        }

        // Add the ID of the authFunction to the configuration
        if (config?.config?.confirmationFunctionName) {
          const confirmationFunctionId = remoteFunctions.find(
            (func) => func.name === config.config.confirmationFunctionName,
          )?._id;
          config.config.confirmationFunctionId = confirmationFunctionId;
        }

        const currentProvider = providers.find((provider) => provider.type === config.type);
        if (currentProvider) {
          const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/auth_providers/${currentProvider._id}`;
          const response = await fetch(url, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ ...config, _id: currentProvider._id }),
          });
          if (!response.ok) {
            const json = await response.json();
            const error = isErrorResponse(json) ? json.error : "No error message";
            console.error("Failed to apply auth_provider: ", { config, url, error });
          }
        } else {
          const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/auth_providers`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) {
            const json = await response.json();
            const error = isErrorResponse(json) ? json.error : "No error message";
            console.error("Failed to apply auth_provider: ", { config, url, error });
          }
        }
      }
    }
  }

  private async getFunctions(appId: string, groupId: string): Promise<RemoteFunction[]> {
    const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/functions`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok) {
      const json = await response.json();
      const error = isErrorResponse(json) ? json.error : "No error message";
      console.error("Failed to retrieve functions: ", { url, error });
    }
    if (isRemoteFunctionsResponse(result)) {
      return result;
    } else {
      throw new Error(`Unexpected response body: ${JSON.stringify(result)}`);
    }
  }

  private async configureFunctionsFromAppPath(appPath: string, appId: string, groupId: string) {
    const functionsDir = path.join(appPath, "functions");

    if (fs.existsSync(functionsDir)) {
      console.log("Applying functions...");
      const functionDirs = fs.readdirSync(functionsDir);
      for (const functionDir of functionDirs) {
        const configPath = path.join(functionsDir, functionDir, "config.json");
        const config = this.loadJson(configPath);
        const sourcePath = path.join(functionsDir, functionDir, "source.js");
        const source = fs.readFileSync(sourcePath, "utf8");

        delete config.id;

        console.log("creating new function provider: ", config);
        const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/functions`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ ...config, source: source }),
        });
        if (!response.ok) {
          const json = await response.json();
          const error = isErrorResponse(json) ? json.error : "No error message";
          console.error("Failed to apply function: ", { config, url, error });
        }
      }
    }
  }

  private async getAuthProviders(appId: string, groupId: string): Promise<AuthProvider[]> {
    const url = `${this.apiUrl}/groups/${groupId}/apps/${appId}/auth_providers`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json",
      },
    });
    const result = await response.json();
    if (!response.ok) {
      const json = await response.json();
      const error = isErrorResponse(json) ? json.error : "No error message";
      console.error("Failed to retrieve auth_providers: ", { url, error });
    }
    if (isAuthProvidersResponse(result)) {
      return result;
    } else {
      throw new Error(`Unexpected response body: ${JSON.stringify(result)}`);
    }
  }

  private async applyAppConfiguration(appPath: string, appId: string, groupId: string, syncConfig?: SyncConfig) {
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

    await this.configureValuesFromAppPath(appPath, appId, groupId);

    await this.configureServiceFromAppPath(appPath, appId, groupId, syncConfig);

    await this.configureFunctionsFromAppPath(appPath, appId, groupId);

    await this.configureAuthProvidersFromAppPath(appPath, appId, groupId);
  }

  private performLogIn() {
    const { credentials } = this;
    if (credentials.kind === "api-key") {
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
