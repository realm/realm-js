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

import { existsSync, mkdirSync, readdirSync, rmSync, unlinkSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

import { inject } from "../file-system";
import { extendDebug } from "../../debug";
import { JsPlatformHelpers } from "../../binding";

const debug = extendDebug("fs");

inject({
  isAbsolutePath(path) {
    return isAbsolute(path);
  },
  joinPaths(...segments) {
    return join(...segments);
  },
  removeFile(path) {
    debug("removeFile", path);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
  removeDirectory(path) {
    debug("removeDirectory", path);
    rmSync(path, { recursive: true, force: true });
  },
  ensureDirectoryForFile(path) {
    const parentPath = dirname(path);
    mkdirSync(parentPath, { recursive: true });
  },
  setDefaultDirectoryPath(path) {
    debug("setDefaultDirectoryPath", path);
    return JsPlatformHelpers.setDefaultRealmFileDirectory(path);
  },
  getDefaultDirectoryPath() {
    return JsPlatformHelpers.defaultRealmFileDirectory();
  },
  exists(path) {
    debug("exists", path);
    return existsSync(path);
  },
  copyBundledRealmFiles() {
    throw new Error("Realm for Node does not support this method.");
  },
  /*
  readDirectory(path) {
    return readdirSync(path, { encoding: "utf8", withFileTypes: true });
  },
  */
  removeRealmFilesFromDirectory(path: string) {
    debug("removeRealmFilesFromDirectory", path);
    for (const dirent of readdirSync(path, { encoding: "utf8", withFileTypes: true })) {
      const direntPath = join(path, dirent.name);
      if (dirent.isDirectory() && dirent.name.endsWith(".realm.management")) {
        rmSync(direntPath, { recursive: true, force: true });
      } else if (
        dirent.name.endsWith(".realm") ||
        dirent.name.endsWith(".realm.note") ||
        dirent.name.endsWith(".realm.lock") ||
        dirent.name.endsWith(".realm.fresh.lock") ||
        dirent.name.endsWith(".realm.log")
      ) {
        unlinkSync(direntPath);
      }
    }
  },
});
