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
import { Command, InvalidArgumentError } from "@commander-js/extra-typings";
import fs from "fs";
import path from "path";

import { debug, enableDebugging } from "./debug";
import { generate } from "./generator";
import { InvalidSpecError, parseSpecs } from "./spec";
import { importTemplate, Template, TEMPLATES_NAMES } from "./templates";

type GenerateOptions = {
  spec: ReadonlyArray<string>;
  template: Promise<Template>;
  output: string;
  debug: boolean;
};

type ValidateOptions = {
  spec: ReadonlyArray<string>;
  debug: boolean;
};

function parsePath(input: string) {
  return path.resolve(input);
}

function parseExistingFilePath(input: string) {
  const parsed = parsePath(input);
  if (!fs.existsSync(parsed) || !fs.statSync(parsed).isFile()) {
    throw new InvalidArgumentError(`Expected '${parsed}' file to exist.`);
  }
  return parsed;
}

function printError(err: unknown) {
  if (err instanceof InvalidSpecError) {
    err.print();
  } else {
    console.error(chalk.red("ERROR"), err instanceof Error ? err.stack : err);
  }
}

export const program = new Command();

program.name("realm-bindgen");

const specOption = program
  .createOption("-s, --spec <spec...>", "Path of the API specification")
  .argParser((arg, previous: ReadonlyArray<string> = []) => [...previous, parseExistingFilePath(arg)])
  .makeOptionMandatory();

const templateOption = program
  .createOption("-t, --template <template>", "Template to apply when generating")
  .choices(TEMPLATES_NAMES)
  .argParser((name) => {
    return importTemplate(name);
  })
  .makeOptionMandatory();

const outputOption = program
  .createOption("-o, --output <output>", "Path of a directory to write the binding")
  .argParser(parsePath)
  .makeOptionMandatory();

const debugOption = program.createOption("-d, --debug", "Turn on debug printing").default(false);

program
  .command("generate", { isDefault: true })
  .addOption(specOption)
  .addOption(templateOption)
  .addOption(outputOption)
  .addOption(debugOption)
  .action(async (args: GenerateOptions) => {
    const { spec: specPaths, template, output: outputPath, debug: isDebugging } = args;
    if (isDebugging) {
      enableDebugging();
      debug("Debugging enabled");
    }
    try {
      const spec = parseSpecs(specPaths);
      generate({ spec, template: await template, outputPath });
      process.exit(0);
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });

program
  .command("validate")
  .addOption(specOption)
  .addOption(debugOption)
  .action((args: ValidateOptions) => {
    const { spec: specPaths, debug: isDebugging } = args;
    if (isDebugging) {
      enableDebugging();
      debug("Debugging enabled");
    }
    try {
      parseSpecs(specPaths);
      console.log(chalk.green("Validation passed!"));
      process.exit(0);
    } catch (err) {
      printError(err);
      process.exit(1);
    }
  });
