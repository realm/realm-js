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

import { User } from "../internal";

/**
 * A function which executes on the Atlas App Services server.
 */
export type AppServicesFunction<R, A extends unknown[]> = (...args: A) => Promise<R>;

/**
 * The default functions factory, providing types for easily calling functions.
 */
export type DefaultFunctionsFactory = {
  /**
   * All the functions are accessible as members on this instance.
   */
  [name: string]: AppServicesFunction<unknown, unknown[]>;
};

export function createFactory<T>(user: User, serviceName: string | undefined): T {
  return new Proxy(
    {},
    {
      get(target, name, receiver) {
        if (typeof name === "string" && name != "inspect") {
          return user.callFunctionOnService.bind(user, name, serviceName);
        } else {
          return Reflect.get(target, name, receiver);
        }
      },
    },
  ) as T;
}
