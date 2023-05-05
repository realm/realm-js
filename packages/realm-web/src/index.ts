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

export * as BSON from "bson";

import { App } from "./App";

/**
 * Get or create a singleton Realm App from an id.
 * Calling this function multiple times with the same id will return the same instance.
 *
 * @param id The Realm App id visible from the Atlas App Services UI or a configuration.
 * @returns The Realm App instance.
 */
export function getApp(id: string): App {
  return App.getApp(id);
}

export * from "./App";
export * from "./Credentials";
export * from "./User";
export * from "./Storage";
export { MongoDBRealmError } from "./MongoDBRealmError";
export { getEnvironment, setEnvironment } from "./environment";
