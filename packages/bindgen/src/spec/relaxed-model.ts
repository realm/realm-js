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

import { InterfaceSpec, ClassSpec, Spec } from "./model";

/**
 * Needed we want to avoid quoting all the values that are primitive non-strings
 *
 * TODO: Determine if we should require this being wrapped in quotes instead
 */
export type RelaxedValueType = string | boolean | number | [] | Record<string, never>;

export type RelaxedSpec = Omit<Partial<Spec>, "records" | "classes" | "constants" | "typeAliases" | "interfaces"> & {
  records?: { [name: string]: RelaxedRecordSpec };
  classes?: { [name: string]: RelaxedClassSpec };
  constants?: { [name: string]: RelaxedConstantSpec };
  typeAliases?: { [name: string]: string };
  interfaces?: { [name: string]: RelaxedInterfaceSpec };
};

export type RelaxedRecordSpec = {
  fields: { [name: string]: RelaxedFieldSpec };
};

export type RelaxedFieldSpec =
  | string
  | {
      type: string;
      default: RelaxedValueType;
    };

export type RelaxedClassSpec = Pick<Partial<ClassSpec>, "sharedPtrWrapped"> & {
  staticMethods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
  properties?: { [name: string]: string };
  methods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
};

export type RelaxedInterfaceSpec = Pick<Partial<InterfaceSpec>, "sharedPtrWrapped"> & {
  staticMethods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
  methods?: { [name: string]: RelaxedMethodSpec | RelaxedMethodSpec[] };
};

export type RelaxedMethodSpec =
  | string
  | {
      sig: string;
      suffix?: string;
    };

export type RelaxedConstantSpec = {
  type: string;
  value: string;
};
