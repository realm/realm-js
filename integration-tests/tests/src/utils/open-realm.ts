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

// Either the sync property is left out (local Realm)
import Realm, { Configuration, BSON } from "realm";

/**
 * Open a Realm for test usage with the specified config. By default this will use
 * a unique path for each Realm to avoid conflicts.
 *
 * @param partialConfig Realm config
 * @param user Realm user
 * @returns
 */
export async function openRealm(partialConfig: Configuration = {}): Promise<{ config: Configuration; realm: Realm }> {
  const config = createLocalConfig(partialConfig);
  const realm = await Realm.open(config);
  return { config, realm };
}

//TODO When bindgen is rebased on master, it could be worth moving this method to /src/utils/generators.ts that deals with generating random values
function getRandomPathAndNonce(): { path: string; nonce: string } {
  const nonce = new BSON.ObjectId().toHexString();
  return {
    path: `temp-${nonce}.realm`,
    nonce,
  };
}

export function createLocalConfig(partialConfig: Configuration = {}): Configuration {
  const path = getRandomPathAndNonce().path;
  return { path, ...partialConfig };
}
