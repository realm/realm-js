////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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
import { InspectOptions, inspect } from "node:util";

import { Collection, RealmObject } from "../../internal";

type CustomInspectFunction<T> = (this: T, depth: number, inspectOptions: InspectOptions) => void;

function injectInspect<T extends object>(constructor: { prototype: T }, customInspect: CustomInspectFunction<T>) {
  Object.assign(constructor.prototype, { [inspect.custom]: customInspect });
}

injectInspect(RealmObject, function (this, depth: number, inspectOptions: InspectOptions) {
  const { name } = this.objectSchema();
  return `${name} ${inspect({ ...this }, inspectOptions.showHidden, depth, inspectOptions.colors)}`;
});

injectInspect(Collection, function (this, depth: number, inspectOptions: InspectOptions) {
  const name = this.constructor.name;
  return `${name} ${inspect({ ...this }, inspectOptions.showHidden, depth, inspectOptions.colors)}`;
});
