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

type PlatformValues<T> = Partial<Record<keyof KnownEnvironment, T>> & {
  default?: T;
};

/**
 * @param platformValues containing value for each targeted platform.
 * @returns the value for the platform the test is running on.
 */
export function select<T>(platformValues: PlatformValues<T>): any {
  for (const [key, value] of Object.entries(platformValues)) {
    if (environment[key]) {
      return value;
    }
  }
  if ("default" in platformValues) {
    return platformValues.default;
  }
  throw new Error("Given platform did not cover current environment and no default was set.");
}
