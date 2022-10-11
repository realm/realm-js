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

import { RelaxedSpec } from "./relaxed-model";
export type { MixedInfo } from "./relaxed-model";

export type ValueType = string;

type ReplaceFields<Base, Replacements> = Omit<Base, keyof Replacements> & Replacements;

export type Spec = ReplaceFields<
  Required<RelaxedSpec>,
  {
    typeAliases: { [name: string]: TypeSpec };
    enums: { [name: string]: EnumSpec };
    constants: { [name: string]: ConstantSpec };
    records: { [name: string]: RecordSpec };
    classes: { [name: string]: ClassSpec };
    interfaces: { [name: string]: InterfaceSpec };
    keyTypes: { [name: string]: TypeSpec };
  }
>;

export type EnumSpec = {
  cppName?: string;
  values: { [key: string]: number };
} & (
  | { isFlag?: false }
  | {
      isFlag: true;
      flagMask: number;
    }
);

export type ConstantSpec = {
  type: TypeSpec;
  value: string;
};

export type RecordSpec = {
  cppName?: string;
  fields: { [name: string]: FieldSpec };
};

export type FieldSpec = {
  type: TypeSpec;
  default?: ValueType;
};

export type MethodSpec = {
  sig: FunctionTypeSpec;
  suffix?: string;
  cppName?: string;
};

export type ClassSpec = {
  cppName?: string;
  iterable?: TypeSpec;
  abstract: boolean;
  base?: string;
  needsDeref: boolean;
  sharedPtrWrapped?: string;
  constructors: { [name: string]: FunctionTypeSpec };
  staticMethods: { [name: string]: MethodSpec[] };
  properties: { [name: string]: TypeSpec };
  methods: { [name: string]: MethodSpec[] };
};

export type InterfaceSpec = {
  cppName?: string;
  base?: string;
  sharedPtrWrapped?: string;
  staticMethods: { [name: string]: MethodSpec[] };
  methods: { [name: string]: MethodSpec[] };
};

export type TypeSpec = TypeNameSpec | TemplateInstanceSpec | FunctionTypeSpec | TypeModifierSpec;

export type TypeModifierSpec = {
  kind: "const" | "ref" | "rref" | "pointer";
  type: TypeSpec;
};

export type TypeNameSpec = {
  kind: "type-name";
  name: string;
};

export type TemplateInstanceSpec = {
  kind: "template-instance";
  name: string;
  templateArguments: TypeSpec[];
};

export type FunctionTypeSpec = {
  kind: "function";
  args: ArgumentSpec[];
  ret: TypeSpec;
  isConst: boolean;
  isNoExcept: boolean;
  isOffThread: boolean;
};

export type ArgumentSpec = {
  name: string;
  type: TypeSpec;
};
