////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

import { AsyncFunc, Func, Test } from "mocha";

interface IFiltering {
  [k: string]: string | boolean;
}

// Implements a way to skip tests on specific platforms

function shouldSkipProperty(
  filterValue: boolean | string,
  environmentValue: string
) {
  if (filterValue === true) {
    // If filter value is strictly true, the environment must not be loosely true
    return !!environmentValue;
  } else if (filterValue) {
    // If filter value is some other non-falsy value, the environment must match exactly
    return filterValue === environmentValue;
  } else {
    // A falsy filter expects a falsy environment
    return !environmentValue;
  }
}

function shouldSkip(filter: IFiltering) {
  for (const k in filter) {
    if (shouldSkipProperty(filter[k], environment[k])) {
      return true;
    }
  }
  return false;
}

/**
 * Skips the test if the values provided in `filter` matches that of the environment.
 * Use this to skip particular tests based on the environment, if we for example have a failing test which is not
 * applicable for the environment or if we want to eventually fix it, but doesn't want the tests to fail right now.
 *
 * @argument filter can be an object, an array or a string. If an object is provided every key with value `true` will
 * skip the test if the same key has a "truly" value (a true boolean, a string, etc). If an array is provided it will
 * be turned into an object with the array elements as keys and `true` values and `skipIf` will be called recursively.
 * If a string is provided skipIf will simply be called with an object with the provided string as key and `true` as the
 * value for that single property.
 */
export function skipIf(
  filter: string | string[] | IFiltering,
  title: string,
  callback: Func | AsyncFunc
): Test {
  if (typeof filter === "string") {
    return skipIf({ [filter]: true }, title, callback);
  } else if (Array.isArray(filter)) {
    const filterObject: IFiltering = {};
    for (const environment of filter) {
      filterObject[environment] = true;
    }
    return skipIf(filterObject, title, callback);
  } else {
    if (shouldSkip(filter)) {
      it.skip(title, callback);
    } else {
      it(title, callback);
    }
  }
}
