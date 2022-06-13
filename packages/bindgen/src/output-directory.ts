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
import { Debugger } from "debug";
import fs from "fs";
import path from "path";
import cp from "child_process";

import { debug } from "./debug";
import { createOutputter, Outputter } from "./outputter";

type OutputFile = {
  fd: number;
  filePath: string;
  debug: Debugger;
  formatter?: string | string[];
};

export type Directory = {
  file(filePath: string, formatter?: string): Outputter;
  close(): void;
};

type Failure = {
  filePath: string;
  status: number;
  output: string[];
};

export function createOutputDirectory(outputPath: string): Directory {
  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const openFiles: OutputFile[] = [];
  return {
    file(filePath: string, formatter?: string) {
      const resolvedPath = path.resolve(outputPath, filePath);
      const parentDirectoryPath = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDirectoryPath)) {
        debug("Creating parent directory", parentDirectoryPath);
        fs.mkdirSync(parentDirectoryPath, { recursive: true });
      }
      const fileDebug = debug.extend(filePath);

      fileDebug(chalk.dim("Opening", resolvedPath));
      const fd = fs.openSync(resolvedPath, "w");
      openFiles.push({ fd, formatter, filePath, debug: fileDebug });

      return createOutputter((data) => {
        fs.writeFileSync(fd, data, { encoding: "utf8" });
      }, fileDebug);
    },
    close() {
      const failures: Failure[] = [];
      for (const { fd, formatter, debug, filePath } of openFiles) {
        debug(chalk.dim("Closing file"));
        fs.closeSync(fd);
        if (formatter) {
          debug(chalk.dim("Running formatter '%s'"), formatter);
          const [command, ...args] = typeof formatter === "string" ? formatter.split(" ") : formatter;
          const { status, output } = cp.spawnSync(command, [...args, filePath], { cwd: outputPath, encoding: "utf8" });
          if (status > 0) {
            failures.push({ status, output, filePath });
          }
        }
      }
      for (const { output, filePath } of failures) {
        console.error(`Failed write file (${filePath}): ${output.join("\n")}`);
      }
    },
  };
}
