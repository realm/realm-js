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

import { AtlasAppServicesClient, AtlasAppServicesOptions } from "./api";

export type AppConfiguratorConfig = {
  groupId?: string;
} & AtlasAppServicesOptions;

export class AppConfigurator {
  private client: AtlasAppServicesClient;
  private groupId: string | undefined;
  private static DEFAULT_APP_NAME = "app";

  constructor(private config: AppConfiguratorConfig) {
    this.client = new AtlasAppServicesClient(config);
    if (config.groupId) {
      this.groupId = config.groupId;
    }
  }

  async test() {
    const providers = await this.client.getAdminAuthProviders();
    console.log({ providers });
  }

  async importApp(name = AppConfigurator.DEFAULT_APP_NAME) {
    const groupId = await this.ensureGroupId();
    const app = await this.client.adminCreateApplication(groupId, {
      name,
    });
    console.log({ app });
  }

  private async ensureGroupId(): Promise<string> {
    if (this.groupId) {
      return this.groupId;
    }
    const { roles = [] } = await this.client.getAdminProfile();
    const [groupId] = [...new Set(roles.map((role) => role.groupId).filter((groupId) => typeof groupId === "string"))];
    if (typeof groupId !== "string") {
      throw new Error("Expected the user to be associated with exactly one group");
    }
    this.groupId = groupId;
    return groupId;
  }
}
