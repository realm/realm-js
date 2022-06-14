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

import { ClassSpec, FieldSpec, MethodSpec, RecordSpec, Spec, ValueType } from "./spec/model";
import {
  RelaxedClassSpec,
  RelaxedFieldSpec,
  RelaxedMethodSpec,
  RelaxedRecordSpec,
  RelaxedSpec,
  RelaxedValueType,
} from "./spec/relaxed-model";

export * from "./spec/model";

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

const ajv = new Ajv({ allowUnionTypes: true });
const schemaFile = new URL("../generated/spec.schema.json", import.meta.url);
const schmeaJson = JSON.parse(fs.readFileSync(schemaFile, { encoding: "utf8" }));
export const validate = ajv.compile<RelaxedSpec>(schmeaJson);

export function parseSpec(filePath: string): Spec {
  const text = fs.readFileSync(filePath, { encoding: "utf8" });
  const parsed = yaml.parse(text);
  const isValid = validate(parsed);
  if (isValid) {
    return normalizeSpec(parsed);
  } else {
    throw new InvalidSpecError(filePath, validate.errors || []);
  }
}

/**
 * @param obj Object to iterate
 * @param fn Callback to apply to values
 * @returns A new object with the function applied to all values of the object
 */
function mapObjectValues<T, U>(obj: Record<string, T>, fn: (value: T) => U) {
  return Object.fromEntries(Object.entries<T>(obj).map(([key, value]) => [key, fn(value)]));
}

export function normalizeSpec(spec: RelaxedSpec): Spec {
  return {
    headers: spec.headers || [],
    primitives: spec.primitives || [],
    typeAliases: spec.typeAliases || {},
    templates: spec.templates || [],
    enums: spec.enums || {},
    constants: spec.constants || {},
    opaqueTypes: spec.opaqueTypes || [],
    records: mapObjectValues(spec.records || {}, normalizeRecordSpec),
    classes: mapObjectValues(spec.classes || {}, normalizeClassSpec),
  };
}

function normalizeRecordSpec(spec: RelaxedRecordSpec): RecordSpec {
  return {
    fields: mapObjectValues(spec.fields || {}, normalizeFieldSpec),
  };
}

function normalizeClassSpec(spec: RelaxedClassSpec): ClassSpec {
  return {
    sharedPtrWrapped: spec.sharedPtrWrapped,
    staticMethods: mapObjectValues(spec.staticMethods || {}, normalizeMethodSpec),
    properties: spec.properties || {},
    methods: mapObjectValues(spec.methods || {}, normalizeMethodSpec),
  };
}

function normalizeFieldSpec(spec: RelaxedFieldSpec): FieldSpec {
  if (typeof spec === "string") {
    return { type: spec };
  } else {
    return { type: spec.type, default: normalizeValueType(spec.default) };
  }
}

function normalizeValueType(value: RelaxedValueType): ValueType | undefined {
  if (typeof value === "string" || typeof value === "undefined") {
    return value;
  } else {
    return JSON.stringify(value);
  }
}

function normalizeMethodSpec(spec: RelaxedMethodSpec | RelaxedMethodSpec[]): MethodSpec[] {
  const methods = Array.isArray(spec) ? spec : [spec];
  return methods.map((method) => (typeof method === "string" ? { sig: method } : method));
}

function normalizeObjectOfArray<T>(obj: Record<string, T | T[]>): Record<string, T[]> {
  return mapObjectValues(obj, (v) => (Array.isArray(v) ? v : [v]));
}
