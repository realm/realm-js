////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { binding, fs } from "./internal";

export type AppConfiguration = {
  id: string;
  baseUrl?: string;
};

export class App {
  private static PLATFORM = "Unknown";
  private static PLATFORM_VERSION = "0.0.0";
  private static SDK_VERSION = "0.0.0";

  private internal: binding.App;

  constructor(id: string);
  constructor(config: AppConfiguration);
  constructor(configOrId: AppConfiguration | string) {
    const { id, baseUrl }: AppConfiguration = typeof configOrId === "string" ? { id: configOrId } : configOrId;
    this.internal = binding.App.getUncachedApp(
      {
        appId: id,
        platform: App.PLATFORM,
        platformVersion: App.PLATFORM_VERSION,
        sdkVersion: App.SDK_VERSION,
        transport: this.createNetworkTransport(),
        baseUrl,
      },
      {
        baseFilePath: fs.getDefaultDirectoryPath(),
      },
    );
  }

  public get id(): string {
    return this.internal.config.appId;
  }

  private createNetworkTransport(): binding.GenericNetworkTransport {
    throw new Error("Not yet implemented");
  }
}
