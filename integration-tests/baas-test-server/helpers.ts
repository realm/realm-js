////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

export class UsageError extends Error {}

export type ExecError = {
  stdout: string;
  stderr: string;
} & Error;

export function wrapCommand<Argv>(command: (argv: Argv) => Promise<void>): (argv: Argv) => void {
  return function (argv: Argv) {
    command(argv).catch((err) => {
      console.error();
      if (err instanceof UsageError) {
        console.error(chalk.red(err.message));
      } else if (err instanceof Error) {
        console.error(chalk.red(err.stack));
      } else {
        throw err;
      }
    });
  };
}
