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

/**
 * @param obj The object to remove keys (and undefined values from)
 * @returns A new object without the keys where the value is undefined.
 */
export function removeKeysWithUndefinedValues<T extends object>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(entry => typeof entry[1] !== "undefined"),
    ) as T;
}
