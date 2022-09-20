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

import { unlinkSync, rmSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { inject } from "../platform/file-system";

inject({
  removeFile(path: string) {
    unlinkSync(path);
  },
  removeDirectory(path: string) {
    rmSync(path, { recursive: true, force: true });
  },
  getDefaultDirectoryPath() {
    return process.cwd();
  },
  isAbsolutePath(path: string) {
    return isAbsolute(path);
  },
  joinPaths(...segments: string[]) {
    return join(...segments);
  },
});

export * from "../index";
import { Realm } from "../index";
export default Realm;
