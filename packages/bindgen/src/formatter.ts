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
import cp from "child_process";

import { extend } from "./debug";
const debug = extend("format");

const FORMATTERS: Record<string, string[]> = {
  eslint: ["npx", "eslint", "--fix", "--format=stylish"],
  "clang-format": ["npx", "clang-format", "-i"],
  // "typescript-checker": ["npx", "tsc", "--noEmit"],
};

export function addFormatter(name: string, commandAndArgs: string[]) {
  if (name in FORMATTERS) {
    throw new Error(`Cannot add ${name} as it's already there`);
  } else {
    FORMATTERS[name] = commandAndArgs;
  }
}

export function getFormatterNames() {
  return Object.keys(FORMATTERS);
}

export type FormatterName = string;

export class FormatError extends Error {
  constructor(formatterName: string, filePaths: string[]) {
    super(`Failure when running the '${formatterName}' formatter on ${JSON.stringify(filePaths)}`);
  }
}

export function format(formatterName: FormatterName, cwd: string, filePaths: string[]): void {
  if (filePaths.length === 0) {
    debug(chalk.dim("Skipped running formatter '%s' (no files need it)"), formatterName);
    return;
  } else {
    debug(chalk.dim("Running formatter '%s' on %d files"), formatterName, filePaths.length);
    if (formatterName in FORMATTERS) {
      const [command, ...args] = FORMATTERS[formatterName].concat(filePaths);
      console.log(`Running '${formatterName}' formatter`, chalk.dim(command, ...args));
      const result = cp.spawnSync(command, args, {
        cwd,
        encoding: "utf8",
        stdio: "inherit",
        shell: true,
      });
      if (result.error) throw result.error;
      if (result.status) {
        throw new FormatError(formatterName, filePaths);
      }
    }
  }
}
