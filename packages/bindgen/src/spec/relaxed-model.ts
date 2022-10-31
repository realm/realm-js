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

// IMPORTANT: This file must not have any imports!
// If you really need to import something, you will need to update the cmake dependencies.
// But try not to add any imports. Since this file is used to generate the json-schema,
// it really should be self-contained.

export type RelaxedSpec = {
  mixedInfo: MixedInfo; // Not optional
  headers?: string[];
  primitives?: string[];
  opaqueTypes?: string[];
  templates?: { [name: string]: number | "*" };
  enums?: { [name: string]: RelaxedEnumSpec };
  records?: { [name: string]: RelaxedRecordSpec };
  classes?: { [name: string]: RelaxedClassSpec };
  constants?: { [name: string]: RelaxedConstantSpec };
  typeAliases?: { [name: string]: string };
  keyTypes?: { [name: string]: string };
  interfaces?: { [name: string]: RelaxedInterfaceSpec };
};

export type MixedInfo = {
  dataTypes: { [dataType: string]: { getter: string; type: string } };
  unusedDataTypes: string[];
  extraCtors: string[];
};

export type RelaxedEnumSpec = {
  cppName?: string;
  values: string[] | { [key: string]: number };
} & (
  | { isFlag?: false }
  | {
      isFlag: true;
      flagMask: number;
    }
);

export type RelaxedRecordSpec = {
  cppName?: string;
  fields: { [name: string]: RelaxedFieldSpec };
};

export type RelaxedFieldSpec =
  | string
  | {
      type: string;
      default?: unknown;
      cppName?: string;
    };

export type RelaxedClassSpec = {
  cppName?: string;
  iterable?: string;
  needsDeref?: boolean;
  sharedPtrWrapped?: string;
  abstract?: boolean;
  base?: string;
  constructors?: { [name: string]: string };
  staticMethods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
  properties?: { [name: string]: string };
  methods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
};

export type RelaxedInterfaceSpec = {
  cppName?: string;
  base?: string;
  sharedPtrWrapped?: string;
  staticMethods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
  methods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
};

export type RelaxedMethodSpec =
  | string
  | {
      sig: string;
      suffix?: string;
      cppName?: string;
    };

export type RelaxedConstantSpec = {
  type: string;
  value: string;
};
