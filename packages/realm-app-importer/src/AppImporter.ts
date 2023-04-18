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

import path from "path";
import fs from "fs-extra";
import glob from "glob";
import deepmerge from "deepmerge";
import { AdminApiClient, Credentials, SyncConfig } from "./AdminApiClient";
import { Deployment, DeploymentDraft } from "./types";

/**
 * First level keys are file globs and the values are objects that are spread over the content of the files matching the glob.
 * @example { "config.json": { name: "overridden-name" }, "services/local-mongodb/rules/*.json": { database: "another-database" } }
 */
export type TemplateReplacements = Record<string, Record<string, unknown>>;

export type ImportedApp = { appName: string; appId: string };

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

type AppConfig = {
  name: string;
  sync?: SyncConfig;
  security?: {
    allowed_request_origins?: string[];
  };
};

export interface AppImporterOptions {
  baseUrl: string;
  credentials: Credentials;
  realmConfigPath: string;
  appsDirectoryPath: string;
  cleanUp?: boolean;
  reuseApp?: boolean;
}

export class AppImporter {
  private readonly baseUrl: string;
  private readonly credentials: Credentials;
  private readonly realmConfigPath: string;
  private readonly appsDirectoryPath: string;
  private readonly reuseApp: boolean;
  private readonly client: AdminApiClient;
  private initialDeployment: Deployment | null = null;
  private currentDeploymentDraft: DeploymentDraft | null = null;
  private reusedApp: App | null = null;

  constructor({
    baseUrl,
    credentials,
    realmConfigPath,
    appsDirectoryPath,
    cleanUp = true,
    reuseApp = false,
  }: AppImporterOptions) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.realmConfigPath = realmConfigPath;
    this.appsDirectoryPath = appsDirectoryPath;
    this.reuseApp = reuseApp;
    this.client = new AdminApiClient({ baseUrl });

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

  public async createOrReuseApp(name: string) {
    if (this.reuseApp) {
      if (this.reusedApp) {
        // Reset it
        if (!this.initialDeployment) {
          throw new Error("Missing an initial deployment");
        }
        console.log(`Reusing ${this.reusedApp.client_app_id}`);
        await this.client.redeployDeployment(this.reusedApp._id, this.initialDeployment._id);
        const [deployment] = await this.client.listDeployments(this.reusedApp._id);
        console.log(`Redeployed ${this.initialDeployment._id} as ${deployment._id}`);
        this.initialDeployment = deployment;
        // Delete any existing secrets
        const secrets = await this.client.listSecrets(this.reusedApp._id);
        for (const secret of secrets) {
          console.log(`Deleting old secret named '${secret.name}'`);
          await this.client.deleteSecret(this.reusedApp._id, secret._id);
        }
        return this.reusedApp;
      } else {
        // Ensure we have the reusable app imported already
        const app = await this.client.createApp("reused");
        console.log(`Created ${app.client_app_id}`);
        // Store this for next import
        this.reusedApp = app;
        // Do a simple change to get an initial deployment
        await this.client.createValue(app._id, { name: "initial-deployment-value", value: "whatever" });
        // Create and deploy a deployment draft we can redeploy later
        const deployments = await this.client.listDeployments(app._id);
        if (deployments.length === 1) {
          this.initialDeployment = deployments[0];
        } else {
          throw new Error("Expected a single initial deployment");
        }
        return app;
      }
    } else {
      return await this.client.createApp(name);
    }
  }

  /**
   * @param appTemplatePath The path to a template directory containing the configuration files needed to import the app.
   * @param replacements An object with file globs as keys and a replacement object as values. Allows for just-in-time replacements of configuration parameters.
   * @returns A promise of an object containing the app id.
   */
  public async importApp(appTemplatePath: string, replacements: TemplateReplacements = {}): Promise<ImportedApp> {
    const { name: appName, sync, security } = this.loadAppConfigJson(appTemplatePath);

    await this.client.ensureLogIn(this.credentials);

    const app = await this.createOrReuseApp(appName);
    const appId = app.client_app_id;
    try {
      // Determine the path of the new app
      const appPath = path.resolve(this.appsDirectoryPath, appId);

      if (fs.existsSync(appPath)) {
        console.log(`Deleting old app directory (${appPath})`);
        fs.rmSync(appPath, { recursive: true });
      }
      // Copy over the app template
      this.copyAppTemplate(appPath, appTemplatePath);

      // Apply any replacements to the files before importing from them
      this.applyReplacements(appPath, replacements);

      // Apply allowed request origins if they exist
      if (security?.allowed_request_origins) {
        this.client.applyAllowedRequestOrigins(security.allowed_request_origins, app._id);
      }

      // Create the app service
      await this.applyAppConfiguration(appPath, app._id, sync);

      if (appId) {
        console.log(`The application ${appId} was successfully deployed...`);
        console.log(`${this.baseUrl}/groups/${await this.client.groupId}/apps/${app._id}/dashboard`);
      }

      return { appName, appId };
    } catch (err) {
      try {
        // Using a try-catch here, because the failure to delete the app should not shadow the actual error
        await this.client.deleteApp(appId);
      } catch (err) {
        console.warn(`Failed to delete the app: ${err}`);
      }
      throw err;
    }
  }

  public async importApps(templatePaths: string[]): Promise<ImportedApp[]> {
    const apps: ImportedApp[] = [];
    for (const templatePath of templatePaths) {
      const app = await this.importApp(templatePath);
      apps.push(app);
    }
    return apps;
  }

  public async deleteApp(clientAppId: string) {
    const app = await this.client.getAppByClientAppId(clientAppId);
    console.log("Deleting", this.reusedApp ? this.reusedApp._id : null, app._id);
    // Forget the reused app if this was the one getting deleted
    if (this.reusedApp && this.reusedApp._id === app._id) {
      this.reusedApp = null;
    }
    await this.client.deleteApp(app._id);
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
    fs.mkdirpSync(appPath);
    fs.copySync(appTemplatePath, appPath, {
      recursive: true,
    });
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

  private async configureValuesFromAppPath(appPath: string, appId: string) {
    const valuesDir = path.join(appPath, "values");

    if (fs.existsSync(valuesDir)) {
      console.log("Applying values...");
      const valuesDirs = fs.readdirSync(valuesDir);
      for (const valueFile of valuesDirs) {
        const configPath = path.join(valuesDir, valueFile);
        const config = this.loadJson(configPath);
        console.log("creating new value: ", config);
        this.client.createValue(appId, config);
      }
    }
  }

  private async configureServiceFromAppPath(appPath: string, appId: string, syncConfig?: SyncConfig) {
    const servicesDir = path.join(appPath, "services");
    if (fs.existsSync(servicesDir)) {
      console.log("Applying services... ");
      const serviceDirectories = fs.readdirSync(servicesDir);

      // It is possible for there to be multiple service directories
      for (const serviceDir of serviceDirectories) {
        const configFilePath = path.join(servicesDir, serviceDir, "config.json");
        if (fs.existsSync(configFilePath)) {
          const config = this.loadJson(configFilePath);

          const service = await this.client.createService(appId, config);
          if (syncConfig) {
            await this.client.applySyncConfig(appId, syncConfig);
          }
          const rulesDir = path.join(servicesDir, serviceDir, "rules");
          const serviceId = service._id;
          // rules must be applied after the service is created
          if (fs.existsSync(rulesDir)) {
            console.log("Applying rules...");
            const ruleFiles = fs.readdirSync(rulesDir);
            for (const ruleFile of ruleFiles) {
              const ruleFilePath = path.join(rulesDir, ruleFile);
              const ruleConfig = this.loadJson(ruleFilePath);
              this.client.createRule(appId, serviceId, config.type, ruleConfig);
            }
          }
        }
      }
    }
  }

  private async configureAuthProvidersFromAppPath(appPath: string, appId: string) {
    const authProviderDir = path.join(appPath, "auth_providers");
    // Some auth providers use a remote function.  This makes sure the ids are available to add to the configuration
    const remoteFunctions = await this.client.listFunctions(appId);

    if (fs.existsSync(authProviderDir)) {
      console.log("Applying auth providers...");
      const authFileNames = fs.readdirSync(authProviderDir);
      const providers = await this.client.listAuthProviders(appId);
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
          await this.client.patchAuthProvider(appId, currentProvider._id, config);
        } else {
          await this.client.createAuthProvider(appId, config);
        }
      }
      // Wait a bit for BaaS to enable the auth provider
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async configureFunctionsFromAppPath(appPath: string, appId: string) {
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
        await this.client.createFunction(appId, { ...config, source: source });
      }
    }
  }

  private async applyAppConfiguration(appPath: string, appId: string, syncConfig?: SyncConfig) {
    // Create all secrets in parallel
    const secrets = this.loadSecretsJson(appPath);
    await Promise.all(
      Object.entries<string>(secrets).map(async ([name, value]) => {
        if (typeof value !== "string") {
          throw new Error(`Expected a secret string value for '${name}'`);
        }
        return this.client.createSecret(appId, name, value);
      }),
    );

    await this.configureValuesFromAppPath(appPath, appId);

    await this.configureServiceFromAppPath(appPath, appId, syncConfig);

    await this.configureFunctionsFromAppPath(appPath, appId);

    await this.configureAuthProvidersFromAppPath(appPath, appId);
  }

  private async pollDeploymentUntilSuccessful(appId: string, deploymentId: string) {
    for (let retry = 0; retry < 1000; retry++) {
      const response = await this.client.getDeployment(appId, deploymentId);
      if (response.status === "successful") {
        return response;
      }
      // Wait a bit
      console.log("Waiting for deployment to complete");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Failed to deploy ${deploymentId}`);
  }
}
