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

export const baseUrl = realmBaseUrl;

function getCredentials(): Credentials {
  const { publicKey, privateKey, username = "unique_user@domain.com", password = "password" } = environment;
  if (typeof publicKey === "string" && typeof privateKey === "string") {
    return {
      kind: "api-key",
      publicKey,
      privateKey,
    };
  } else {
    return {
      kind: "username-password",
      username,
      password,
    };
  }
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
