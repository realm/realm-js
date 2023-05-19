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
import { isAbsolute, join } from "path-browserify";

import { inject } from "../file-system";

inject({
  isAbsolutePath(path) {
    return isAbsolute(path);
  },
  joinPaths(...segments) {
    return join(...segments);
  },
  removeFile(path) {
    // throw new Error("Not supported on this platform");
  },
  removeDirectory(path) {
    // throw new Error("Not supported on this platform");
  },
  ensureDirectoryForFile(path) {
    // throw new Error("Not supported on this platform");
  },
  getDefaultDirectoryPath() {
    return "/";
  },
  exists(path) {
    return false;
    // throw new Error("Not supported on this platform");
  },
  copyBundledRealmFiles() {
    // throw new Error("Not supported on this platform");
  },
  /*
  readDirectory(path) {
    JsPlatformHelpers.
  },
  */
  removeRealmFilesFromDirectory(path) {
    // throw new Error("Not supported on this platform");
  },
});
