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
  typeAliases: { [name: string]: string };
  templates: string[];
  enums: { [name: string]: EnumSpec };
  constants: { [name: string]: ConstantSpec };
  records: { [name: string]: RecordSpec };
  opaqueTypes: string[];
  classes: { [name: string]: ClassSpec };
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
  type: string;
  value: string;
};

export type RecordSpec = {
  fields: { [name: string]: FieldSpec };
};

export type FieldSpec = {
  type: string;
  default?: ValueType;
};

export type MethodSpec = {
  sig: string;
  suffix?: string;
};

export type ClassSpec = {
  sharedPtrWrapped?: string;
  staticMethods: { [name: string]: MethodSpec[] };
  properties: { [name: string]: string };
  methods: { [name: string]: MethodSpec[] };
};
