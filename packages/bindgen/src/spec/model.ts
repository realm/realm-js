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
  templates: string[];
  enums: { [name: string]: EnumSpec };
  constants: { [name: string]: ConstantSpec };
  records: { [name: string]: RecordSpec };
  opaqueTypes: string[];
  classes: { [name: string]: ClassSpec };
  interfaces: { [name: string]: InterfaceSpec };
};

export type EnumSpec =
  | {
      isFlag: true;
      flagMask: number;
      values: { [key: string]: number };
    }
  | {
      isFlag?: false;
      values: string[];
    };

export type ConstantSpec = {
  type: TypeSpec;
  value: string;
};

export type RecordSpec = {
  fields: { [name: string]: FieldSpec };
};

export type FieldSpec = {
  type: TypeSpec;
  default?: ValueType;
};

export type MethodSpec = {
  sig: FunctionTypeSpec;
  suffix?: string;
};

export type ClassSpec = {
  sharedPtrWrapped?: string;
  constructors: { [name: string]: MethodSpec[] };
  staticMethods: { [name: string]: MethodSpec[] };
  properties: { [name: string]: TypeSpec };
  methods: { [name: string]: MethodSpec[] };
};

export type InterfaceSpec = {
  // TODO: Consider removing the staticMethods
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
};

export type ArgumentSpec = {
  name: string;
  type: TypeSpec;
};
