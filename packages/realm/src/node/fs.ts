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

import { existsSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { inject } from "../platform/file-system";
import { extendDebug } from "../debug";

const debug = extendDebug("fs");

inject({
  async removeFile(path) {
    debug("removeFile", path);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
  async removeDirectory(path) {
    debug("removeDirectory", path);
    rmSync(path, { recursive: true, force: true });
  },
  getDefaultDirectoryPath() {
    return process.cwd();
  },
  isAbsolutePath(path) {
    return isAbsolute(path);
  },
  joinPaths(...segments) {
    return join(...segments);
  },
  async readDirectory(path) {
    return readdirSync(path, { encoding: "utf8", withFileTypes: true });
  },
  async exists(path) {
    return existsSync(path);
  },
  copyBundledRealmFiles() {
    throw new Error("Realm for Node does not support this method.");
  },
});
