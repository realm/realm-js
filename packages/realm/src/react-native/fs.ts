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
import { isAbsolute, join } from "path-browserify";

import { inject } from "../platform/file-system";
import { extendDebug } from "../debug";
import { Helpers, JsPlatformHelpers } from "../binding";

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
    JsPlatformHelpers.removeFile(path);
  },
  removeDirectory(path) {
    debug("removeDirectory", path);
    JsPlatformHelpers.removeDirectory(path);
  },
  ensureDirectoryForFile(path) {
    debug("ensureDirectoryForFile", path);
    JsPlatformHelpers.ensureDirectoryExistsForFile(path);
  },
  getDefaultDirectoryPath() {
    return JsPlatformHelpers.defaultRealmFileDirectory();
  },
  exists(path) {
    return Helpers.fileExists(path);
  },
  copyBundledRealmFiles() {
    JsPlatformHelpers.copyBundledRealmFiles();
  },
  /*
  readDirectory(path) {
    JsPlatformHelpers.
  },
  */
  removeRealmFilesFromDirectory(path) {
    debug("removeRealmFilesFromDirectory", path);
    JsPlatformHelpers.removeRealmFilesFromDirectory(path);
  },
});
