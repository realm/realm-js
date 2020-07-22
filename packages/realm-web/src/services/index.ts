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

import { Fetcher } from "../Fetcher";

import { createService as createMongoDBRemoteService } from "./MongoDBService";
import { createService as createHttpService } from "./HTTPService";

/**
 * Create all services for a particular app.
 *
 * @param fetcher The fetcher to use when senting requests to the services.
 * @returns An object containing functions that create the individual services.
 */
export function create(fetcher: Fetcher): Realm.Services {
    return {
        mongodb: createMongoDBRemoteService.bind(null, fetcher),
        http: createHttpService.bind(null, fetcher),
    };
}
