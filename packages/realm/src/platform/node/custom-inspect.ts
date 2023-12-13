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
import { InspectOptionsStylized, inspect } from "node:util";

import { Collection, Dictionary, List, RealmObject, RealmSet, Results } from "../../internal";

type CustomInspectFunction<T> = (this: T, depth: number, options: InspectOptionsStylized) => void;

function injectInspect<T extends object>(constructor: { prototype: T }, customInspect: CustomInspectFunction<T>) {
  Object.assign(constructor.prototype, { [inspect.custom]: customInspect });
}

function constructorName(value: object) {
  if (value instanceof RealmObject) {
    return value.objectSchema().name;
  } else if (value instanceof RealmSet) {
    return "Realm.Set";
  } else if (value instanceof List) {
    return "Realm.List";
  } else if (value instanceof Dictionary) {
    return "Realm.Dictionary";
  } else if (value instanceof Results) {
    return "Realm.Results";
  } else {
    return value.constructor.name;
  }
}

function isIterable<T>(value: object): value is Iterable<T> {
  if (value instanceof Dictionary) {
    return false;
  } else if (Symbol.iterator in value) {
    return true;
  } else {
    return false;
  }
}

function defaultInspector<T extends object>(this: T, depth: number, options: InspectOptionsStylized) {
  const name = constructorName(this);
  if (depth === -1) {
    if (options.colors) {
      return options.stylize(`[${name}]`, "special");
    } else {
      return `[${name}]`;
    }
  } else {
    return `${name} ${inspect(isIterable(this) ? [...this] : { ...this }, options.showHidden, depth, options.colors)}`;
  }
}

injectInspect(RealmObject, defaultInspector);
injectInspect(Collection, defaultInspector);
