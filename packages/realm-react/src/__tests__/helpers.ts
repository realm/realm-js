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

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function randomRealmPath() {
  const tempDirPath = fs.mkdtempSync(path.join(os.tmpdir(), "realm-react-tests-"));
  return path.join(tempDirPath, "test.realm");
}

/**
 * Adapted from integration-tests
 * @param ms For how long should the promise be pending?
 * @returns A promise that returns after `ms` milliseconds.
 */
export function sleep(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
