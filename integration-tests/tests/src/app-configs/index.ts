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

import { PartitionConfig, PartitionSyncConfig, buildConfig } from "@realm/app-importer";

import { buildDatabaseConfig } from "./database";

export function simpleConfig() {
  return buildConfig("simple").authProvider({
    name: "anon-user",
    type: "anon-user",
    disabled: false,
  });
}

export function buildPartitionBasedConfig(appName = "with-pbs", config: Partial<PartitionConfig> = {}) {
  return buildDatabaseConfig(appName, {
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
  });
}

export function buildFlexibleConfig(appName = "with-flx") {
  return buildDatabaseConfig(appName, {
    kind: "flexible",
  });
}

export const appConfigs = {
  simple: simpleConfig,
  database: buildDatabaseConfig,
  partitionBased: buildPartitionBasedConfig,
  flexible: buildFlexibleConfig,
};
