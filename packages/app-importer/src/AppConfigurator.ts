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

import { AdminService } from "./api";

type Credentials = { publicKey: string; privateKey: string };

type AppConfiguratorOptions = {
  credentials: Credentials;
};

export class AppConfigurator {
  constructor(private config: AppConfiguratorOptions) {}

  private authenticated = false;
  private async ensureAuthentication() {
    if (!this.authenticated) {
      const { publicKey, privateKey } = this.config.credentials;
      AdminService.adminLogin("mongodb-cloud", { username: publicKey, apiKey: privateKey });
      this.authenticated = true;
    }
  }

  public async test() {
    const providers = await AdminService.getAdminAuthProviders();
    console.log(providers);
  }
}
