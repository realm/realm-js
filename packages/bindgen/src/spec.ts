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

import Ajv, { ErrorObject } from "ajv";
import chalk from "chalk";
import fs from "fs";
import yaml from "yaml";

import { extend } from "./debug";
import { Spec } from "./models/spec";

export * from "./models/spec";

export class InvalidSpecError extends Error {
  filePath: string;
  errors: ErrorObject[];

  constructor(filePath: string, errors: ErrorObject[]) {
    super("Failed to validate specification");
    this.filePath = filePath;
    this.errors = errors;
  }

  print(): void {
    console.error(chalk.red("ERROR"), this.message, chalk.dim(this.filePath));
    for (const { instancePath, message } of this.errors) {
      console.error(chalk.dim(instancePath), message);
    }
  }
}

const debug = extend("spec-parser");
const ajv = new Ajv({ allowUnionTypes: true });
const schemaFile = new URL("../generated/spec.schema.json", import.meta.url);
const schmeaJson = JSON.parse(fs.readFileSync(schemaFile, { encoding: "utf8" }));
export const validate = ajv.compile<Spec>(schmeaJson);

export function parseSpec(filePath: string): Spec {
  const text = fs.readFileSync(filePath, { encoding: "utf8" });
  const parsed = yaml.parse(text);
  debug("Read spec: %O", parsed);
  const isValid = validate(parsed);
  if (isValid) {
    return parsed;
  } else {
    throw new InvalidSpecError(filePath, validate.errors || []);
  }
}
