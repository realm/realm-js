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
import { App, BSON } from "realm";

import { AppImporter, Credentials } from "@realm/app-importer";
import { fetch } from "./fetch";

export type TemplateReplacements = Record<string, Record<string, unknown>>;
export type ErrorResponse = { message: string; appId: never };
export type ImportResponse = { appId: string; message: never };
export type Response = ImportResponse | ErrorResponse;

//TODO should be moved to a separate file as it doesn't directly have anything to do with importing an app.
export function getUrls() {
  // Try reading the app importer URL out of the environment, it might not be accessiable via localhost
  const { appImporterUrl, realmBaseUrl } = environment;
  return {
    appImporterUrl: typeof appImporterUrl === "string" ? appImporterUrl : "http://localhost:8091",
    baseUrl: typeof realmBaseUrl === "string" ? realmBaseUrl : "http://localhost:9090",
  };
}

const { appImporterIsRemote, appTemplatesPath = "../../realm-apps" } = environment;

function getCredentials(): Credentials {
  const { publicKey, privateKey, username, password } = environment;
  if (typeof publicKey === "string" && typeof privateKey === "string") {
    return {
      kind: "api-key",
      publicKey,
      privateKey,
    };
  }
  return {
    kind: "username-password",
    username: typeof username === "string" ? username : "unique_user@domain.com",
    password: typeof password === "string" ? password : "password",
  };
}

function isErrorResponse(arg: unknown): arg is ErrorResponse {
  return typeof arg === "object" && arg !== null && "message" in arg;
}

function generateDatabaseName(): string {
  const { mongodbClusterName } = environment;
  if (typeof mongodbClusterName === "string") {
    return `test-database-${new BSON.ObjectId().toHexString()}`;
  }
  return "test-database";
}

type SyncConfigOptions = {
  name: string;
  databaseName: string;
};

function generateSyncConfig({ name, databaseName }: SyncConfigOptions) {
  if (name === "with-db") {
    return {
      sync: {
        database_name: databaseName,
      },
    };
  } else if (name === "with-db-flx") {
    return {
      flexible_sync: {
        database_name: databaseName,
      },
    };
  } else {
    return {};
  }
}

type MongodbServiceOptions = { name: string; databaseName: string; clusterName: string | undefined };

function generateMongoDBServiceConfig({ name, databaseName, clusterName }: MongodbServiceOptions) {
  if (clusterName) {
    return {
      type: "mongodb-atlas",
      config: {
        clusterName,
        readPreference: "primary",
        wireProtocolEnabled: false,
        ...generateSyncConfig({ name, databaseName }),
      },
    };
  } else {
    return {
      config: generateSyncConfig({ name, databaseName }),
    };
  }
}

export function getDefaultReplacements(name: string, databaseName: string): TemplateReplacements {
  // When running on CI we connect through mongodb-atlas instead of local-mongodb
  const { mongodbClusterName: clusterName } = environment;

  return {
    "services/mongodb/config.json": generateMongoDBServiceConfig({ name, databaseName, clusterName }),
  };
}

const appsDirectoryPath = "./realm-apps";
const realmConfigPath = "./realm-config";
const { baseUrl } = getUrls();
const credentials = getCredentials();

const importer = new AppImporter({
  baseUrl,
  credentials,
  realmConfigPath,
  appsDirectoryPath,
  cleanUp: true,
  reuseApp: true,
});

export async function importApp(
  name: string,
  replacements?: TemplateReplacements,
): Promise<{ appId: string; baseUrl: string; databaseName: string }> {
  const databaseName = generateDatabaseName();

  if (!replacements) {
    replacements = getDefaultReplacements(name, databaseName);
  }

  if (appImporterIsRemote) {
    throw new Error("Calling the app importer remotely, is not longer supported");
  } else {
    const appTemplatePath = `${appTemplatesPath}/${name}`;

    const { appId } = await importer.importApp(appTemplatePath, replacements);

    return { appId, baseUrl, databaseName };
  }
}

export async function deleteApp(clientAppId: string): Promise<void> {
  const { baseUrl, appImporterUrl } = getUrls();

  if (appImporterIsRemote) {
    // This might take some time, so we just send it and forget it
    const response = await fetch(`${appImporterUrl}/app/${clientAppId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const json = await response.json();
      const message = isErrorResponse(json) ? json.message : "No error message";
      throw new Error(`Failed to delete app with client ID '${clientAppId}': ${message}`);
    }
  } else {
    const appsDirectoryPath = "./realm-apps";
    const realmConfigPath = "./realm-config";

    const credentials = getCredentials();

    const importer = new AppImporter({
      baseUrl,
      credentials,
      realmConfigPath,
      appsDirectoryPath,
      cleanUp: true,
    });

    importer.deleteApp(clientAppId);
  }
}
