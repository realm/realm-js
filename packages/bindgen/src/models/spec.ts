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

type ValueType =
  | string
  | boolean
  | number
  | [] // TODO: Determine if we should require this being wrapped in quotes instead
  | {
      // TODO: Determine if we should require this being wrapped in quotes instead
      /* empty object */
    };

export type Spec = {
  headers?: string[];
  primitives?: string[];
  typeAliases?: { [name: string]: string };
  templates?: string[];
  enums?: { [name: string]: EnumSpec };
  constants?: { [name: string]: ConstantSpec };
  records?: { [name: string]: RecordSpec };
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

export type FieldSpec = {
  type: string;
  default: ValueType;
};

export type RecordSpec = {
  fields: { [name: string]: string | FieldSpec };
};

export type MethodSpec =
  | string
  | {
      suffix: string;
      sig: string;
    };

export type ClassSpec = {
  sharedPtrWrapped?: string;
  staticMethods: { [name: string]: string | string[] };
  properties: { [name: string]: string };
  methods: { [name: string]: MethodSpec | MethodSpec[] };
};
