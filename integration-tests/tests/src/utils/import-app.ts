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

import { AppConfig, AppImporter, Credentials } from "@realm/app-importer";

export type TemplateReplacements = Record<string, Record<string, unknown>>;
export type ErrorResponse = { message: string; appId: never };
export type ImportResponse = { appId: string; message: never };
export type Response = ImportResponse | ErrorResponse;

const { realmBaseUrl = "http://localhost:9090" } = environment;

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

const credentials = getCredentials();

const importer = new AppImporter({
  baseUrl: realmBaseUrl,
  credentials,
  reuseApp: true,
});

export async function importApp(config: AppConfig): Promise<{ appId: string; baseUrl: string }> {
  const { appId } = await importer.importApp(config);
  return { appId, baseUrl: realmBaseUrl };
}

export async function deleteApp(clientAppId: string): Promise<void> {
  await importer.deleteApp(clientAppId);
}
