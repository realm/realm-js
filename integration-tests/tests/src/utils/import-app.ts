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
import { App } from "realm";

export type TemplateReplacements = Record<string, Record<string, unknown>>;
export type ErrorResponse = { message: string; appId: never };
export type ImportResponse = { appId: string; message: never };
export type Response = ImportResponse | ErrorResponse;

export async function importApp(name: string, replacements: TemplateReplacements = {}): Promise<App> {
  // Try reading the app importer URL out of the environment, it might not be accessiable via localhost
  const { appImporterUrl, mongodbRealmBaseUrl } = environment;
  const url = typeof appImporterUrl === "string" ? appImporterUrl : "http://localhost:8091";
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ name, replacements }),
  });
  const json: Response = await response.json();
  if (response.ok && typeof json.appId === "string") {
    const baseUrl = typeof mongodbRealmBaseUrl === "string" ? mongodbRealmBaseUrl : "http://localhost:9090";
    return new App({ baseUrl, id: json.appId });
  } else if (typeof json.message === "string") {
    throw new Error(`Failed to import: ${json.message}`);
  } else {
    throw new Error("Failed to import app");
  }
}
