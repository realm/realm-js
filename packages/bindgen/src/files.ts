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

import chalk from "chalk";
import fs from "fs";
import path from "path";

import { debug } from "./debug";
import { createOutputter, Outputter } from "./outputter";

export type Directory = {
  file(filePath: string): Outputter;
  close(): void;
};

export function createOutputDirectory(outputPath: string): Directory {
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const openFiles: number[] = [];
  return {
    file(filePath: string) {
      const resolvedPath = path.resolve(outputPath, filePath);
      const fileDebug = debug.extend(filePath);

      fileDebug(chalk.dim("Opening", resolvedPath));
      const fd = fs.openSync(resolvedPath, "w");
      openFiles.push(fd);

      return createOutputter(fd, fileDebug);
    },
    close() {
      openFiles.forEach(fs.closeSync);
    },
  };
}
