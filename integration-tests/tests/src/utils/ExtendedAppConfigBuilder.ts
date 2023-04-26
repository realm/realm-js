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
import {
  AppConfigBuilder,
  PartitionConfig,
  CustomTokenAuthMetadataField,
  EmailPasswordAuthConfig,
  SyncConfig,
} from "@realm/app-importer";

import { randomDatabaseName } from "./generators";

const { mongodbClusterName, mongodbServiceType = mongodbClusterName ? "mongodb-atlas" : "mongodb" } = environment;

type MongoServiceSyncConfig =
  | { kind: "disabled" }
  | {
      kind: "flexible";
    }
  | {
      kind: "partition-based";
      partition: PartitionConfig;
    };

export class ExtendedAppConfigBuilder extends AppConfigBuilder {
  anonAuth() {
    return this.authProvider({
      name: "anon-user",
      type: "anon-user",
      disabled: false,
    });
  }

  apiKeyAuth() {
    return this.authProvider({
      name: "api-key",
      type: "api-key",
      disabled: false,
    });
  }

  emailPasswordAuth(
    config: EmailPasswordAuthConfig = {
      autoConfirm: true,
      resetPasswordUrl: "http://localhost/resetPassword",
    },
  ) {
    return this.authProvider({
      name: "local-userpass",
      type: "local-userpass",
      config,
      disabled: false,
    });
  }

  customFunctionAuth(source: string) {
    return this.authProvider({
      name: "custom-function",
      type: "custom-function",
      config: {
        authFunctionName: "customAuthentication",
      },
      disabled: false,
    }).function({
      name: "customAuthentication",
      private: true,
      run_as_system: true,
      source,
    });
  }

  customTokenAuth({
    privateKey,
    metadataFields = [],
  }: {
    privateKey: string;
    metadataFields: Array<CustomTokenAuthMetadataField>;
  }) {
    return this.secret("jwt-secret", privateKey).authProvider({
      name: "custom-token",
      type: "custom-token",
      config: {
        audience: "",
        signingAlgorithm: "HS256",
        useJWKURI: false,
      },
      secret_config: {
        signingKeys: ["jwt-secret"],
      },
      disabled: false,
      metadata_fields: metadataFields,
    });
  }

  mongodbService(syncConfig: MongoServiceSyncConfig = { kind: "disabled" }, developmentMode = true) {
    this.developmentMode(developmentMode);
    return this.service(
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
    ).secret("mongodb_uri", "mongodb://localhost:26000");
  }

  partitionBasedSync(config: Partial<PartitionConfig> = {}, developmentMode = true) {
    return this.mongodbService(
      {
        kind: "partition-based",
        partition: {
          key: "partition",
          type: "string",
          required: false,
          permissions: {
            read: true,
            write: true,
          },
          ...config,
        },
      },
      developmentMode,
    );
  }

  flexibleSync(developmentMode = true) {
    return this.mongodbService(
      {
        kind: "flexible",
      },
      developmentMode,
    );
  }

  developmentMode(enabled = true) {
    return super.sync({ development_mode_enabled: enabled });
  }

  triggerClientResetFunction() {
    this.function({
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
  }
}

export function buildMongoDBConfig(config: MongoServiceSyncConfig) {
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

function buildMongoDBSyncConfig(config: MongoServiceSyncConfig) {
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
