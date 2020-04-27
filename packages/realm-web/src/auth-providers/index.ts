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

import { Transport } from "../transports";

import { EmailPasswordAuthProvider } from "./EmailPasswordAuthProvider";
import { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";

// TODO: Consider if we should query the service for enabled authentication providers before creating clients.

/**
 * Create an apps authentication providers.
 *
 * @param transport The transport used when sending requests to the service.
 * @returns An object with interfaces to all possible authentication provider the app might have.
 */
export function create(transport: Transport): Realm.AuthProviders {
    return {
        emailPassword: new EmailPasswordAuthProvider(transport),
        apiKey: new ApiKeyAuthProvider(transport),
    };
}
