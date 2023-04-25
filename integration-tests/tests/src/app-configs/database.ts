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

import { AppConfigBuilder, buildConfig, PartitionConfig } from "@realm/app-importer";

import { randomDatabaseName } from "../utils/generators";

const { mongodbClusterName, mongodbServiceType = mongodbClusterName ? "mongodb-atlas" : "mongodb" } = environment;

export { mongodbClusterName, mongodbServiceType };

type SyncConfig =
  | { kind: "disabled" }
  | {
      kind: "flexible";
    }
  | {
      kind: "partition-based";
      partition: PartitionConfig;
    };

function buildMongoDBSyncConfig(config: SyncConfig) {
  if (config.kind === "disabled") {
    return {};
  } else if (config.kind === "flexible") {
    return {
      flexible_sync: {
        state: "enabled",
        database_name: randomDatabaseName(),
      },
    };
  } else if (config.kind === "partition-based") {
    return {
      sync: {
        state: "enabled",
        database_name: randomDatabaseName(),
        partition: config.partition,
      },
    };
  } else {
    throw new Error(`Unexpected sync config: ${config}`);
  }
}

export function buildMongoDBConfig(config: SyncConfig) {
  const syncConfig = buildMongoDBSyncConfig(config);
  if (mongodbServiceType === "mongodb-atlas") {
    if (!mongodbClusterName) {
      throw new Error("Expected 'mongodbClusterName' when mongodbServiceType is 'mongodb-atlas'");
    }
    return {
      clusterName: mongodbClusterName,
      readPreference: "primary",
      wireProtocolEnabled: false,
      ...syncConfig,
    };
  } else {
    return syncConfig;
  }
}

export function appendDatabaseConfig(builder: AppConfigBuilder, syncConfig: SyncConfig = { kind: "disabled" }) {
  return builder
    .service(
      {
        name: "mongodb",
        type: mongodbServiceType,
        config: buildMongoDBConfig(syncConfig),
        secret_config: {
          uri: "mongodb_uri",
        },
      },
      [
        {
          roles: [
            {
              name: "defaultRole",
              apply_when: {},
              document_filters: {
                read: true,
                write: true,
              },
              write: true,
              read: true,
              insert: true,
              delete: true,
            },
          ],
        },
      ],
    )
    .secret("mongodb_uri", "mongodb://localhost:26000");
}

export function buildDatabaseConfig(appName = "with-db", syncConfig: SyncConfig = { kind: "disabled" }) {
  const builder = buildConfig(appName)
    .sync({
      development_mode_enabled: true,
    })
    .authProvider({ name: "anon-user", type: "anon-user", disabled: false })
    .authProvider({
      name: "local-userpass",
      type: "local-userpass",
      config: {
        autoConfirm: true,
        resetPasswordUrl: "http://localhost/resetPassword",
      },
      disabled: false,
    })
    .function({
      name: "triggerClientReset",
      private: false,
      run_as_system: true,
      source: `
        exports = async function (appId, userId) {
          return (await deleteClientFile("__realm_sync_" + appId, userId)) || (await deleteClientFile("__realm_sync", userId));
        };
        
        async function deleteClientFile(db, userId) {
          const mongodb = context.services.get("mongodb");
          return (await mongodb.db(db).collection("clientfiles").deleteMany({ ownerId: userId })).deletedCount > 0;
        }
      `,
    });

  appendDatabaseConfig(builder);

  return builder.config;
}
