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

/**
 * Remove entries for undefined property values.
 * @internal
 */
export function cleanArguments(args: unknown[] | unknown): unknown[] | unknown {
  if (Array.isArray(args)) {
    // Note: `undefined` elements in the array is not removed.
    return args.map(cleanArguments);
  }
  if (args === null || typeof args !== "object") {
    return args;
  }
  const result: { [key: string]: unknown } = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      result[key] = cleanArguments(value);
    }
  }
  return result;
}
