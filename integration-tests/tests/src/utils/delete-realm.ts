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

import { sleep } from "./sleep";
import Realm, { Configuration } from "realm";

/**
 * Try to delete a Realm.
 *
 * @param config The Realm configuration.
 * @param attempts The number of attempts to try to delete the file.
 * @param delay The time (in milliseconds) between attempts
 * @throws If the Realm could not be deleted.
 */
export async function deleteRealm(config: Configuration, attempts = 10, delay = 100): Promise<void> {
  let n = 0;
  while (Realm.exists(config)) {
    n++;
    Realm.deleteFile(config);
    if (n >= attempts && Realm.exists(config)) {
      throw new Error(`Could not delete Realm in ${attempts} attempts`);
    }
    await sleep(delay);
  }
}
