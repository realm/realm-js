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

const FORMATTERS = {
  eslint: ["eslint", "--fix"],
  "clang-format": ["clang-format"],
};

export type FormatterName = keyof typeof FORMATTERS;
export const formatterNames = Object.keys(FORMATTERS) as FormatterName[];

export class FormatError extends Error {
  status: number;
  output: string[];

  constructor({ status, output }: { status: number; output: string[] }) {
    super("Failure to format");
    this.status = status;
    this.output = output;
  }
}

export function format(formatterName: FormatterName, cwd: string, filePaths: string[]): void {
  if (filePaths.length === 0) {
    debug(chalk.dim("Skipped running formatter '%s' (no files need it)"), formatterName);
  } else {
    debug(chalk.dim("Running formatter '%s' on %d files"), formatterName, filePaths.length);
  }
  if (formatterName in FORMATTERS) {
    const [command, ...args] = FORMATTERS[formatterName];
    const { status, output } = cp.spawnSync(command, [...args, ...filePaths], { cwd, encoding: "utf8" });
    if (status > 0) {
      throw new FormatError({ status, output });
    }
  }
}
