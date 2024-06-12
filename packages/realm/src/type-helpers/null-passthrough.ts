////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

/**
 * Adds a branch to a function, which checks for the argument to be null, in which case it returns early.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Using `unknown` here breaks type inference in `binding.PropertyType.Object` `toBinding` from for some reason */
export function nullPassthrough<T, R extends any[], F extends (value: unknown, ...rest: R) => unknown>(
  this: T,
  fn: F,
  enabled: boolean,
): F {
  if (enabled) {
    return ((value, ...rest) =>
      typeof value === "undefined" || value === null ? null : fn.call(this, value, ...rest)) as F;
  } else {
    return fn;
  }
}
