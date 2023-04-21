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

import createDebug from "debug";

import { AdminApiClient, Credentials } from "./AdminApiClient";
import { AppConfig } from "./AppConfigBuilder";
import { Deployment } from "./types";

const debug = createDebug("realm:app-importer");

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
export interface AppImporterOptions {
  /**
   * The server's URL.
   */
  baseUrl: string;
  /**
   * Administrative credentials to use when authenticating against the server.
   */
  credentials: Credentials;
  /**
   * Re-use a single app instead of importing individual apps.
   * This will redeploy a previously known "clean" version of the app (to revert any configurations) and delete secrets off the app,
   * before re-configuring it. This is a useful strategy to lower stress on the server.
   */
  reuseApp?: boolean;
  /**
   * Poll the deployment endpoint after the last configuration is requested towards the server.
   * @default false Since this turns out not to be needed when configuration happens over the API without drafts.
   */
  awaitDeployments?: boolean;
}

export class AppImporter {
  private readonly baseUrl: string;
  private readonly credentials: Credentials;
  private readonly reuseApp: boolean;
  private readonly awaitDeployments: boolean;
  private readonly client: AdminApiClient;
  private initialDeployment: Deployment | null = null;
  private reusedApp: App | null = null;

  constructor({ baseUrl, credentials, reuseApp = false, awaitDeployments = false }: AppImporterOptions) {
    this.baseUrl = baseUrl;
    this.credentials = credentials;
    this.reuseApp = reuseApp;
    this.awaitDeployments = awaitDeployments;
    this.client = new AdminApiClient({ baseUrl });
  }

  public async createOrReuseApp(name: string) {
    if (this.reuseApp) {
      if (this.reusedApp) {
        // Reset it
        if (!this.initialDeployment) {
          throw new Error("Missing an initial deployment");
        }
        debug(`Reusing ${this.reusedApp.client_app_id}`);
        await this.client.redeployDeployment(this.reusedApp._id, this.initialDeployment._id);
        const [deployment] = await this.client.listDeployments(this.reusedApp._id);
        debug(`Redeployed ${this.initialDeployment._id} as ${deployment._id}`);
        this.initialDeployment = deployment;
        // Delete any existing secrets
        const secrets = await this.client.listSecrets(this.reusedApp._id);
        debug(`Deleting old secrets (${secrets.map((s) => s.name).join(", ")})`);
        for (const secret of secrets) {
          await this.client.deleteSecret(this.reusedApp._id, secret._id);
        }
        return this.reusedApp;
      } else {
        // Ensure we have the reusable app imported already
        const app = await this.client.createApp("reused");
        debug(`Created ${app.client_app_id}`);
        // Store this for next import
        this.reusedApp = app;
        // Do a simple change to get an initial deployment
        await this.client.createValue(app._id, "dummyValue", "whatever");
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
  public async importApp(config: AppConfig): Promise<ImportedApp> {
    await this.client.ensureLogIn(this.credentials);

    const app = await this.createOrReuseApp(config.name);
    try {
      // Create the app service
      debug("Configuring %s %j", app.client_app_id, config);
      await this.configureApp(app._id, config);

      if (this.awaitDeployments) {
        // Await any deployment which is not yet successful
        const [latestDeployment] = await this.client.listDeployments(app._id);
        await this.pollDeploymentUntilSuccessful(app._id, latestDeployment._id);
      }

      debug(`The application ${app.client_app_id} was successfully deployed:`);
      debug(`${this.baseUrl}/groups/${await this.client.groupId}/apps/${app._id}/dashboard`);

      return { appName: config.name, appId: app.client_app_id };
    } catch (err) {
      try {
        // Using a try-catch here, because the failure to delete the app should not shadow the actual error
        await this.client.deleteApp(app._id);
        // Clear any reused app
        this.reusedApp = null;
      } catch (err) {
        console.warn(`Failed to delete the app: ${err}`);
      }
      throw err;
    }
  }

  public async importApps(appConfigs: AppConfig[]): Promise<ImportedApp[]> {
    return Promise.all(appConfigs.map((appConfig) => this.importApp(appConfig)));
  }

  public async deleteApp(clientAppId: string) {
    const app = await this.client.getAppByClientAppId(clientAppId);
    // Forget the reused app if this was the one getting deleted
    if (this.reusedApp && this.reusedApp._id === app._id) {
      this.reusedApp = null;
    }
    await this.client.deleteApp(app._id);
  }

  private async configureSecurity(appId: string, security: AppConfig["security"]) {
    if (security?.allowed_request_origins) {
      this.client.applyAllowedRequestOrigins(appId, security.allowed_request_origins);
    }
  }

  private async configureSecrets(appId: string, secrets: Record<string, string>) {
    // Create all secrets in parallel
    await Promise.all(
      Object.entries<string>(secrets).map(async ([name, value]) => {
        if (typeof value !== "string") {
          throw new Error(`Expected a secret string value for '${name}'`);
        }
        await this.client.createSecret(appId, name, value);
      }),
    );
  }

  private async configureValues(appId: string, values: Record<string, string>) {
    await Promise.all(Object.entries(values).map(([name, value]) => this.client.createValue(appId, name, value)));
  }

  private async configureSync(appId: string, config: AppConfig["sync"]) {
    if (config) {
      await this.client.applySyncConfig(appId, config);
    }
  }

  private async configureServices(appId: string, services: AppConfig["services"]) {
    for (const [serviceConfig, ruleConfigs] of services) {
      const service = await this.client.createService(appId, serviceConfig);
      const serviceId = service._id;
      for (const ruleConfig of ruleConfigs) {
        this.client.createRule(
          appId,
          serviceId,
          ruleConfig,
          serviceConfig.type === "mongodb" || serviceConfig.type === "mongodb-atlas",
        );
      }
    }
  }

  private async configureFunctions(appId: string, functions: AppConfig["functions"]) {
    for (const functionConfig of functions) {
      await this.client.createFunction(appId, functionConfig);
    }
  }

  private async configureAuthProviders(appId: string, providers: AppConfig["authProviders"]) {
    // Some auth providers use a remote function.  This makes sure the ids are available to add to the configuration
    const functions = await this.client.listFunctions(appId);
    const existingProviders = await this.client.listAuthProviders(appId);

    for (const provider of providers) {
      // Set function ids from function names
      if (provider.type === "local-userpass") {
        const { confirmationFunctionName, resetFunctionName } = provider.config;
        if (confirmationFunctionName) {
          provider.config.confirmationFunctionId = functions.find(
            (func) => func.name === confirmationFunctionName,
          )?._id;
        }
        if (resetFunctionName) {
          provider.config.resetFunctionId = functions.find((func) => func.name === resetFunctionName)?._id;
        }
      }

      if (provider.type === "custom-function") {
        const { authFunctionName } = provider.config;
        provider.config.authFunctionId = functions.find((func) => func.name === authFunctionName)?._id;
      }

      const existingProvider = existingProviders.find((otherProvider) => otherProvider.type === provider.type);
      if (existingProvider) {
        await this.client.patchAuthProvider(appId, existingProvider._id, provider);
      } else {
        await this.client.createAuthProvider(appId, provider);
      }
    }
  }

  private async configureApp(appId: string, config: AppConfig) {
    await this.configureSecurity(appId, config.security);
    await this.configureSecrets(appId, config.secrets);
    await this.configureValues(appId, config.values);
    await this.configureSync(appId, config.sync);
    await this.configureServices(appId, config.services);
    await this.configureFunctions(appId, config.functions);
    await this.configureAuthProviders(appId, config.authProviders);
    // Wait a bit for BaaS to settle - it would be great to get rid of this ...
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async pollDeploymentUntilSuccessful(appId: string, deploymentId: string) {
    for (let retry = 0; retry < 1000; retry++) {
      const response = await this.client.getDeployment(appId, deploymentId);
      if (response.status === "successful") {
        return response;
      }
      // Wait a bit
      debug("Waiting for deployment to complete");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Failed to deploy ${deploymentId}`);
  }
}
