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

import { unlinkSync, rmSync, readdirSync, existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fetch } from "undici";

import * as fs from "../platform/file-system";
import * as network from "../platform/network";

fs.inject({
  removeFile(path) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
  removeDirectory(path) {
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
  readDirectory(path) {
    return readdirSync(path, { encoding: "utf8", withFileTypes: true });
  },
});

network.inject({
  async fetch(request): Promise<network.Response> {
    const response = await fetch(request.url, { body: request.body });
    return {
      body: await response.text(),
      httpStatusCode: response.status,
      // TODO: Consider updating the binding API
      headers: Object.fromEntries(response.headers.entries()),
      // TODO: Determine if we want to set this differently
      customStatusCode: 0,
    };
  },
});

export * from "../index";
import { Realm } from "../index";
export default Realm;
