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

export { LocalStorage } from "./LocalStorage";
export { MemoryStorage } from "./MemoryStorage";
export { PrefixedStorage } from "./PrefixedStorage";
export { Storage } from "./Storage";

import { LocalStorage } from "./LocalStorage";
import { MemoryStorage } from "./MemoryStorage";

/**
 * Create a `Storage` instance, default to the current environment
 *
 * @returns A LocalStorage instance if the window global is an object, MemoryStorage otherwise.
 *          Both will prefix keys with "realm-web".
 */
export function createDefaultStorage() {
    const storage =
        typeof window === "object" ? new LocalStorage() : new MemoryStorage();
    return storage.prefix("realm-web");
}
