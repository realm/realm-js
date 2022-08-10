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

import {
  ClassSpec,
  ConstantSpec,
  EnumSpec,
  FieldSpec,
  FunctionTypeSpec,
  InterfaceSpec,
  MethodSpec,
  RecordSpec,
  Spec,
  ValueType,
} from "./spec/model";
import {
  RelaxedClassSpec,
  RelaxedConstantSpec,
  RelaxedEnumSpec,
  RelaxedFieldSpec,
  RelaxedInterfaceSpec,
  RelaxedMethodSpec,
  RelaxedRecordSpec,
  RelaxedSpec,
  RelaxedValueType,
} from "./spec/relaxed-model";
import { parseTypeSpec } from "./spec/type-transformer";

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
    typeAliases: mapObjectValues(spec.typeAliases || {}, normalizeTypeSpec),
    templates: spec.templates || {},
    enums: mapObjectValues(spec.enums || {}, normalizeEnumSpec),
    constants: mapObjectValues(spec.constants || {}, normalizeConstantSpec),
    opaqueTypes: spec.opaqueTypes || [],
    records: mapObjectValues(spec.records || {}, normalizeRecordSpec),
    classes: mapObjectValues(spec.classes || {}, normalizeClassSpec),
    interfaces: mapObjectValues(spec.interfaces || {}, normalizeInterfaceSpec),
  };
}

function normalizeTypeSpec(text: string) {
  const parsed = parseTypeSpec(text);
  if (parsed) {
    return parsed;
  } else {
    throw new Error(`Failed to parse "${text}" into a type`);
  }
}

function normalizeEnumSpec(spec: RelaxedEnumSpec): EnumSpec {
  if (!Array.isArray(spec.values)) return spec as EnumSpec;
  return { ...spec, values: Object.fromEntries(spec.values.map((n, i) => [n, i])) };
}

function normalizeConstantSpec(spec: RelaxedConstantSpec): ConstantSpec {
  return {
    type: normalizeTypeSpec(spec.type),
    value: spec.value,
  };
}

function normalizeRecordSpec(spec: RelaxedRecordSpec): RecordSpec {
  return {
    fields: mapObjectValues(spec.fields || {}, normalizeFieldSpec),
  };
}

function normalizeClassSpec(spec: RelaxedClassSpec): ClassSpec {
  return {
    iterable: spec.iterable ? parseTypeSpec(spec.iterable) : undefined,
    needsDeref: !!spec.needsDeref || !!spec.sharedPtrWrapped,
    sharedPtrWrapped: spec.sharedPtrWrapped,
    staticMethods: mapObjectValues(spec.staticMethods || {}, normalizeMethodSpec),
    properties: mapObjectValues(spec.properties || {}, normalizeTypeSpec),
    methods: mapObjectValues(spec.methods || {}, normalizeMethodSpec),
    constructors: mapObjectValues(spec.constructors || {}, normalizeConstructor),
  };
}

function normalizeInterfaceSpec(spec: RelaxedInterfaceSpec): InterfaceSpec {
  return {
    sharedPtrWrapped: spec.sharedPtrWrapped,
    staticMethods: mapObjectValues(spec.staticMethods || {}, normalizeMethodSpec),
    methods: mapObjectValues(spec.methods || {}, normalizeMethodSpec),
  };
}

function normalizeFieldSpec(spec: RelaxedFieldSpec): FieldSpec {
  if (typeof spec === "string") {
    return { type: normalizeTypeSpec(spec) };
  } else {
    return { type: normalizeTypeSpec(spec.type), default: normalizeValueType(spec.default) };
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
  return methods
    .map((method) => (typeof method === "string" ? { sig: method } : method))
    .map(({ suffix, sig }) => {
      const type = parseTypeSpec(sig);
      if (typeof type === "undefined") {
        throw new Error(`Expected a function type, but failed to parse: ${sig}`);
      } else if (type.kind === "function") {
        return { suffix, sig: type };
      } else {
        throw new Error(`Expected a function type, got "${type.kind}"`);
      }
    });
}

function normalizeConstructor(sig: string): FunctionTypeSpec {
  const type = parseTypeSpec(sig);
  if (typeof type === "undefined") {
    throw new Error(`Expected a function type, but failed to parse: ${sig}`);
  }
  if (type.kind !== "function") {
    throw new Error(`Expected a function type, got "${type.kind}"`);
  }
  if (type.return.kind != "qualified-name" || type.return.names.length != 1 || type.return.names[0] != "void")
    throw new Error(`Constructors not allowed to specify return type, got "${type.kind}"`);
  return type;
}
