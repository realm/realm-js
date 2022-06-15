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

export type Writer = (data: string) => void;

export type Outputter = {
  /** Outputs all parts, seperated by spaces (and a trailing newline) */
  (...parts: string[]): void;
  /** Outputs all parts, seperated by newlines */
  lines(...parts: string[]): void;
  /** Outputs all parts, seperated by nothing */
  raw(...parts: string[]): void;
};

/**
 * @param write called when actually writing to the file
 * @param debug called to emit debugging messages when the outputter is used
 * @returns An outputter, able to write concatinated strings, seperated by spaces or newlines.
 */
export function createOutputter(write: Writer, debug: Debugger): Outputter {
  function out(...parts: string[]): void {
    const data = parts.join(" ");
    debug("%s %s", chalk.dim("←"), data);
    write(data + "\n");
  }
  out.lines = function (...parts: string[]) {
    parts.forEach((part) => debug("%s %s", chalk.dim("←"), part));
    write(parts.join("\n") + "\n");
  };
  out.raw = function (...parts: string[]) {
    const data = parts.join("");
    debug("%s %s", chalk.dim("←"), data);
    write(data);
  };
  return out;
}
