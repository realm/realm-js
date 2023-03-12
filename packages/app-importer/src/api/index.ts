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

export * from "./generated/src/models";
export * from "./generated/src/models/parameters";

import * as generated from "./generated/src/atlasAppServicesAPI";
import { AtlasAppServicesAPIOptionalParams } from "./generated/src/models";

export type AtlasAppServicesCredentials = {
  publicKey: string;
  privateKey: string;
};

export type AtlasAppServicesOptions = {
  baseUrl?: string;
  credentials: AtlasAppServicesCredentials;
} & Omit<AtlasAppServicesAPIOptionalParams, "credential" | "baseUri" | "endpoint">;

export class AtlasAppServicesClient extends generated.AtlasAppServicesAPI {
  private static DEFAULT_BASE_URL = "http://localhost:9090";
  constructor({ credentials, baseUrl = AtlasAppServicesClient.DEFAULT_BASE_URL, ...options }: AtlasAppServicesOptions) {
    super(
      {
        getToken: async () => {
          console.log("Use", credentials, "to authenticate");
          // const providers = await this.getAdminAuthProviders();
          return null;
        },
      },
      {
        allowInsecureConnection: baseUrl.startsWith("http://"),
        ...options,
        endpoint: baseUrl + "/api/admin/v3.0",
      },
    );
  }
}
