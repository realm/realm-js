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

/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

const DIST_PATH = path.resolve(...process.argv.slice(-1));

console.log(`Running post build script to work around https://github.com/microsoft/TypeScript/issues/54573`);

function fixFilesInDirectory(...segments: string[]) {
  for (const dirent of fs.readdirSync(path.join(...segments), { withFileTypes: true })) {
    if (dirent.isFile()) {
      const updatedName = dirent.name.replaceAll(".mjs", ".cjs").replaceAll(".mts", ".cts");
      if (updatedName !== dirent.name) {
        // Move the file
        console.log(`Renaming ${dirent.name} → ${updatedName}`);
        fs.renameSync(path.resolve(...segments, dirent.name), path.resolve(...segments, updatedName));
      }
    } else if (dirent.isDirectory()) {
      fixFilesInDirectory(...segments, dirent.name);
    }
  }
}

fixFilesInDirectory(DIST_PATH);
