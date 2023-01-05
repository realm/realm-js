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

import rnfs from "react-native-fs";
import { isAbsolute, join } from "path-browserify";

import { inject } from "../platform/file-system";
import { extendDebug } from "../debug";

const debug = extendDebug("fs");

inject({
  async removeFile(path) {
    if (await rnfs.exists(path)) {
      const { isFile } = await rnfs.stat(path);
      if (!isFile()) {
        throw new Error("Expected a file");
      }
      await rnfs.unlink(path);
    }
  },
  async removeDirectory(path) {
    if (await rnfs.exists(path)) {
      const { isDirectory } = await rnfs.stat(path);
      if (!isDirectory()) {
        throw new Error("Expected a directory");
      }
      await rnfs.unlink(path);
    }
  },
  getDefaultDirectoryPath() {
    return rnfs.DocumentDirectoryPath;
  },
  isAbsolutePath(path) {
    return isAbsolute(path);
  },
  joinPaths(...segments) {
    return join(...segments);
  },
  async readDirectory(path) {
    return rnfs.readDir(path);
  },
  async exists(path) {
    return rnfs.exists(path);
  },
  copyBundledRealmFiles() {
    throw new Error("Not yet implemented");
  },
});
