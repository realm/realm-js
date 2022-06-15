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
import { ArgumentSpec, Spec, TypeSpec } from "../spec";

const DIRECT_TYPE_MAPPING: Record<string, string> = {
  void: "void",
  bool: "boolean",
  int: "number",
  int64_t: "number",
  int32_t: "number",
  uint64_t: "number",
  "std::string": "string",
  StringData: "string",
};

function isDeclaredBySpec(spec: Spec, name: string) {
  return (
    Object.keys(spec.records).includes(name) ||
    Object.keys(spec.classes).includes(name) ||
    Object.keys(spec.interfaces).includes(name) ||
    Object.keys(spec.typeAliases).includes(name) ||
    spec.opaqueTypes.includes(name)
  );
}

function generateType(spec: Spec, type: TypeSpec): string {
  if (type.kind === "qualifying-name") {
    const fullName = type.names.join("::");
    if (isDeclaredBySpec(spec, fullName)) {
      return fullName;
    } else if (fullName in DIRECT_TYPE_MAPPING) {
      return DIRECT_TYPE_MAPPING[fullName];
    } else {
      return `unknown /* ${fullName} */`;
    }
  } else if (type.kind === "template-instance") {
    const fullName = type.names.join("::");
    if (fullName === "std::vector" && type.templateArguments.length === 1) {
      return `(${generateType(spec, type.templateArguments[0])})[]`;
    } else if (fullName === "util::Optional" && type.templateArguments.length === 1) {
      return `(${generateType(spec, type.templateArguments[0])}) | undefined`;
    } else if (fullName === "std::shared_ptr") {
      // TODO: Evaluate if this is the right type
      return generateType(spec, type.templateArguments[0]);
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
  const out = file("index.d.ts", "eslint");
  out("// This file is generated: Update the spec instead of editing this file directly", "!");

  // Opaque types
  for (const name of spec.opaqueTypes) {
    out(`type ${name} = unknown;`);
  }

  // Type aliases
  for (const [name, type] of Object.entries(spec.typeAliases)) {
    out(`type ${name} = ${generateType(spec, type)};`);
  }

  // Records
  for (const [name, { fields }] of Object.entries(spec.records)) {
    out(`type ${name} = {`);
    for (const [name, fieldSpecs] of Object.entries(fields)) {
      out(camelCase(name), ":", generateType(spec, fieldSpecs.type), ";");
    }
    out(`}`);
  }

  // Classes
  for (const [name, { methods, properties, staticMethods }] of Object.entries(spec.classes)) {
    out(`declare class ${name} {`);
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
  }

  // Interfaces
  for (const [name, { methods }] of Object.entries(spec.interfaces)) {
    out(`declare interface ${name} {`);
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
