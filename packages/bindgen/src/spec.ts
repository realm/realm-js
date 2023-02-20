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
import { strict as assert } from "assert";
import chalk from "chalk";
import fs from "fs";
import yaml from "yaml";

import {
  ClassSpec,
  EnumSpec,
  FieldSpec,
  FunctionTypeSpec,
  InterfaceSpec,
  MethodSpec,
  RecordSpec,
  AnySpec,
  ValueType,
  Spec,
} from "./spec/model";
import {
  RelaxedClassSpec,
  RelaxedEnumSpec,
  RelaxedFieldSpec,
  RelaxedInterfaceSpec,
  RelaxedMethodSpec,
  RelaxedRecordSpec,
  RelaxedSpec,
} from "./spec/relaxed-model";
import { parseTypeSpec, parseMethodSpec } from "./spec/type-parser";

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
const schemaJson = JSON.parse(fs.readFileSync(schemaFile, { encoding: "utf8" }));
export const validate = ajv.compile<RelaxedSpec>(schemaJson);

export function parseSpecs(specs: ReadonlyArray<string>): Spec {
  const [base, ...extras] = specs;
  const spec = parseSpec(base);
  assert(spec.mixedInfo, "The base spec must have a 'mixedInfo' field");

  for (const extraPath of extras) {
    const extra = parseSpec(extraPath);
    // TODO unusedDataTypes and extraCtors may need to be allowed here.
    assert(extra.mixedInfo == undefined, "Extra specs must not have a 'mixedInfo' field");
    assert.equal(Object.keys(extra.keyTypes).length, 0, "Extra specs must not have a 'keyTypes' field");

    // TODO Right now we assume that extra specs are purely additive, but we don't check that they aren't
    // using any type names from the base spec. It will "work" via replacement if the extra spec declares
    // a type of the same "kind" as it was in the base spec, but will fail with a duplicate type otherwise.
    // We should probably support replacing a class or record with a primitive and vice-versa.

    spec.headers.push(...extra.headers);
    spec.primitives.push(...extra.primitives);

    for (const field of ["enums", "records", "classes", "typeAliases", "interfaces"] as const) {
      Object.assign(spec[field], extra[field]);
    }
  }

  return spec;
}

export function parseSpec(filePath: string): AnySpec {
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

export function normalizeSpec(spec: RelaxedSpec): AnySpec {
  return {
    headers: spec.headers || [],
    primitives: spec.primitives || [],
    typeAliases: mapObjectValues(spec.typeAliases || {}, normalizeTypeSpec),
    templates: spec.templates || {},
    mixedInfo: spec.mixedInfo,
    enums: mapObjectValues(spec.enums || {}, normalizeEnumSpec),
    opaqueTypes: spec.opaqueTypes || [],
    records: mapObjectValues(spec.records || {}, normalizeRecordSpec),
    classes: mapObjectValues(spec.classes || {}, normalizeClassSpec),
    interfaces: mapObjectValues(spec.interfaces || {}, normalizeInterfaceSpec),
    keyTypes: mapObjectValues(spec.keyTypes || {}, normalizeTypeSpec),
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

function normalizeRecordSpec(spec: RelaxedRecordSpec): RecordSpec {
  return {
    cppName: spec.cppName,
    fields: mapObjectValues(spec.fields || {}, normalizeFieldSpec),
  };
}

function normalizeClassSpec(spec: RelaxedClassSpec): ClassSpec {
  return {
    cppName: spec.cppName,
    abstract: !!spec.abstract,
    base: spec.base,
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
    cppName: spec.cppName,
    sharedPtrWrapped: spec.sharedPtrWrapped,
    staticMethods: mapObjectValues(spec.staticMethods || {}, normalizeMethodSpec),
    methods: mapObjectValues(spec.methods || {}, normalizeMethodSpec),
  };
}

function normalizeFieldSpec(spec: RelaxedFieldSpec): FieldSpec {
  if (typeof spec === "string") {
    return { type: normalizeTypeSpec(spec) };
  } else {
    return { type: normalizeTypeSpec(spec.type), default: normalizeValueType(spec.default), cppName: spec.cppName };
  }
}

function normalizeValueType(value: unknown): ValueType | undefined {
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
    .map(({ cppName, suffix, sig: sigText }) => {
      const sig = parseMethodSpec(sigText);
      return { cppName, suffix, sig };
    });
}

function normalizeConstructor(sig: string): FunctionTypeSpec {
  const type = parseMethodSpec(sig);
  if (type.ret.kind != "type-name" || type.ret.name != "void")
    throw new Error(`Constructors not allowed to specify return type, got "${type.kind}"`);
  return type;
}
