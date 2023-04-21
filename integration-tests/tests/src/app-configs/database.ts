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

import { buildConfig, PartitionConfig } from "@realm/app-importer";

import { randomDatabaseName } from "../utils/generators";

type SyncConfig =
  | { kind: "disabled" }
  | {
      kind: "flexible";
    }
  | {
      kind: "partition-based";
      partition: PartitionConfig;
    };

export function buildMongoDBConfig(config: SyncConfig) {
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

export function buildDatabaseConfig(appName = "with-db", syncConfig: SyncConfig = { kind: "disabled" }) {
  return buildConfig(appName)
    .sync({
      development_mode_enabled: true,
    })
    .secret("mongodb_uri", "mongodb://localhost:26000")
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
    .service(
      {
        name: "mongodb",
        // TODO: Adjust this based on baseUrl
        type: "mongodb",
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
    }).config;
}
