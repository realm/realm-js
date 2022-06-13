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

export type Outputter = {
  /** Outputs all parts, seperated by nothing */
  (...parts: string[]): void;
  /** Outputs all parts, seperated by spaces */
  spaced(...parts: string[]): void;
  /** Outputs all parts, seperated by newlines */
  lines(...parts: string[]): void;
};

/** Creates a new outputter, able to write to a specific file */
export function createOutputter(fd: number, debug: Debugger): Outputter {
  function write(data: string) {
    fs.writeFileSync(fd, data, { encoding: "utf8" });
  }
  function out(...parts: string[]): void {
    const data = parts.join("");
    debug("%s %s", chalk.dim("←"), data);
    write(data);
  }
  out.spaced = function (...parts: string[]) {
    const data = parts.join(" ");
    debug("%s %s", chalk.dim("←"), data);
    write(data);
  };
  out.lines = function (...parts: string[]) {
    parts.forEach((part) => debug("%s %s", chalk.dim("←"), part));
    write(parts.join("\n"));
  };
  return out;
}
