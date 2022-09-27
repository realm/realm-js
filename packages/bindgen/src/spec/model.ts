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

export type ValueType = string;

export type Spec = {
  headers: string[];
  primitives: string[];
  typeAliases: { [name: string]: TypeSpec };
  templates: { [name: string]: number | "*" };
  mixedInfo: MixedInfo;
  enums: { [name: string]: EnumSpec };
  constants: { [name: string]: ConstantSpec };
  records: { [name: string]: RecordSpec };
  opaqueTypes: string[];
  classes: { [name: string]: ClassSpec };
  interfaces: { [name: string]: InterfaceSpec };
  keyTypes: { [name: string]: TypeSpec };
};

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

export type TypeModifiersSpec = {
  isConst: boolean;
  isReference: boolean;
  isRvalueReference: boolean;
  isPointer: boolean;
};

export type TypeSpec = QualifiedNameSpec | TemplateInstanceSpec | FunctionTypeSpec;

export type QualifiedNameSpec = {
  kind: "qualified-name";
  names: string[];
} & TypeModifiersSpec;

export type TemplateInstanceSpec = {
  kind: "template-instance";
  names: string[];
  templateArguments: TypeSpec[];
} & TypeModifiersSpec;

export type FunctionTypeSpec = {
  kind: "function";
  arguments: ArgumentSpec[];
  return: TypeSpec;
  isConst: boolean;
  isNoExcept: boolean;
  isOffThread: boolean;
};

export type ArgumentSpec = {
  name: string;
  type: TypeSpec;
};

export type MixedInfo = {
  dataTypes: { [dataType: string]: { getter: string; type: string } };
  unusedDataTypes: string[];
  extraCtors: string[];
};
