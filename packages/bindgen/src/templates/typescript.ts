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

import { camelCase } from "change-case";

import { TemplateContext } from "../context";
import { ArgumentSpec, Spec, TemplateInstanceSpec, TypeSpec } from "../spec";

const PRIMITIVES_MAPPING: Record<string, string> = {
  void: "void",
  bool: "boolean",
  int: "number",
  int64_t: "number",
  int32_t: "number",
  uint64_t: "number",
  "std::string": "string",
  StringData: "string",
  BinaryData: "ArrayBuffer",
  OwnedBinaryData: "ArrayBuffer",
};

type TemplateInstanceMapper = (spec: Spec, type: TemplateInstanceSpec) => string;

const TEMPLATE_INSTANCE_MAPPING: Record<string, TemplateInstanceMapper> = {
  "std::vector": (spec, type) => `(${generateType(spec, type.templateArguments[0])})[]`,
  "util::Optional": (spec, type) => `(${generateType(spec, type.templateArguments[0])}) | undefined`,
  // TODO: Evaluate if this is the right type
  "std::shared_ptr": (spec, type) => generateType(spec, type.templateArguments[0]),
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function getDeclaredIdentifiers(spec: Spec): string[] {
  return [
    ...Object.keys(spec.records),
    ...Object.keys(spec.classes),
    ...Object.entries(spec.classes)
      .map(([, classSpec]) => classSpec.sharedPtrWrapped)
      .filter(isString),
    ...Object.keys(spec.interfaces),
    ...Object.keys(spec.typeAliases),
    ...Object.keys(spec.enums),
    ...spec.opaqueTypes,
  ];
}

function generateType(spec: Spec, type: TypeSpec): string {
  if (type.kind === "qualifying-name") {
    const fullName = type.names.join("::");
    if (getDeclaredIdentifiers(spec).includes(fullName)) {
      return fullName;
    } else if (fullName in PRIMITIVES_MAPPING) {
      return PRIMITIVES_MAPPING[fullName];
    } else {
      return `unknown /* ${fullName} */`;
    }
  } else if (type.kind === "template-instance") {
    const fullName = type.names.join("::");
    if (fullName in TEMPLATE_INSTANCE_MAPPING) {
      return TEMPLATE_INSTANCE_MAPPING[fullName](spec, type);
    } else {
      return `unknown /* ${fullName}<${JSON.stringify(type.templateArguments)}> */`;
    }
  } else if (type.kind === "function") {
    // TODO: Print a comment if "const" or "noexcept"
    return (
      "(" +
      type.arguments.map((arg) => arg.name + ": " + generateType(spec, arg.type)) +
      ") => " +
      generateType(spec, type.return) +
      generateTypeModifierComment(type)
    );
  } else {
    return `unknown /* ${JSON.stringify(type)} */`;
  }
}

function generateArguments(spec: Spec, args: ArgumentSpec[]) {
  return args.map((arg) => `${arg.name}: ${generateType(spec, arg.type)}`).join(", ");
}

function generateTypeModifierComment(spec: TypeSpec) {
  const modifiers: string[] = [];
  if (spec.isConst) {
    modifiers.push("const");
  }
  if (spec.kind === "qualifying-name") {
    if (spec.isPointer) {
      modifiers.push("pointer");
    }
    if (spec.isReference) {
      modifiers.push("reference");
    }
    if (spec.isRvalueReference) {
      modifiers.push("rvalue-reference");
    }
  } else if (spec.kind === "function") {
    if (spec.isNoExcept) {
      modifiers.push("noexcept");
    }
  }
  return modifiers.length > 0 ? `/* ${modifiers.join(" ")} */` : "";
}

export function generateTypeScript({ spec, file }: TemplateContext): void {
  // Check the support for primitives used
  for (const primitive of spec.primitives) {
    if (!Object.keys(PRIMITIVES_MAPPING).includes(primitive)) {
      console.warn(`Spec declares an unsupported primitive: "${primitive}"`);
    }
  }

  // Check the support for template instances used
  for (const template of spec.templates) {
    if (!Object.keys(TEMPLATE_INSTANCE_MAPPING).includes(template)) {
      console.warn(`Spec declares an unsupported template instance: "${template}"`);
    }
  }

  const out = file("index.d.ts", "eslint");
  out("// This file is generated: Update the spec instead of editing this file directly");

  out("// Opaque types");
  for (const name of spec.opaqueTypes) {
    out.lines("/** Using an empty enum to express a nominal type */", `export enum ${name} {};`);
  }

  out("// Type aliases");
  for (const [name, type] of Object.entries(spec.typeAliases)) {
    out(`export type ${name} = ${generateType(spec, type)};`);
  }

  out("// Enums");
  for (const [name, e] of Object.entries(spec.enums)) {
    out(`export enum ${name} {`);
    if (e.isFlag) {
      out(...Object.entries(e.values).map(([k, v]) => `${k} = ${v},`));
    } else {
      out(...e.values.map((k) => `${k} = "${k}",`));
    }
    out("};");
  }

  out("// Records");
  for (const [name, { fields }] of Object.entries(spec.records)) {
    out(`export type ${name} = {`);
    for (const [name, field] of Object.entries(fields)) {
      out(camelCase(name), ":", generateType(spec, field.type), field.default ? `/* = ${field.default} */` : "", ";");
    }
    out(`}`);
  }

  out("// Classes");
  for (const [name, { methods, properties, staticMethods, sharedPtrWrapped }] of Object.entries(spec.classes)) {
    out(`export declare class ${name} {`);
    for (const [name, methodSpecs] of Object.entries(staticMethods)) {
      for (const methodSpec of methodSpecs) {
        out(
          "static",
          camelCase(name),
          "(",
          generateArguments(spec, methodSpec.sig.arguments),
          "):",
          generateType(spec, methodSpec.sig.return),
          ";",
        );
      }
    }
    for (const [name, type] of Object.entries(properties)) {
      out(camelCase(name), `: ${generateType(spec, type)}`);
    }
    for (const [name, methodSpecs] of Object.entries(methods)) {
      for (const methodSpec of methodSpecs) {
        out(
          camelCase(name),
          "(",
          generateArguments(spec, methodSpec.sig.arguments),
          "):",
          generateType(spec, methodSpec.sig.return),
          ";",
        );
      }
    }
    out(`}`);
    if (sharedPtrWrapped) {
      out("export type", sharedPtrWrapped, " = ", name);
    }
  }

  out("// Interfaces");
  for (const [name, { methods }] of Object.entries(spec.interfaces)) {
    out(`export declare interface ${name} {`);
    // TODO: Evaluate if the static methods are even needed here / in the spec format
    for (const [name, methodSpecs] of Object.entries(methods)) {
      for (const methodSpec of methodSpecs) {
        out(
          camelCase(name),
          "(",
          generateArguments(spec, methodSpec.sig.arguments),
          "):",
          generateType(spec, methodSpec.sig.return),
          ";",
        );
      }
    }
    out(`}`);
  }
}
