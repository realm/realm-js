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

import { OrderedCollection } from "./OrderedCollection";

type DictionaryMethods = "set" | "remove" | "addListener" | "removeListener" | "removeAllListeners";

/**
 * TODO: Make this extends Collection<T> (once that doesn't have a nummeric index accessor)
 */
export class Dictionary<T = unknown>
  implements Pick<OrderedCollection<T>, "addListener" | "removeListener" | "removeAllListeners">
{
  [key: string]: T;
  /**
   * Adds given element to the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the users value namespace
  set(element: { [key: string]: T }): this {
    throw new Error("Not yet implemented");
  }

  /**
   * Removes given element from the dictionary
   * @returns The dictionary
   */
  // @ts-expect-error We're exposing methods in the users value namespace
  remove(key: string | string[]): this {
    throw new Error("Not yet implemented");
  }

  // @ts-expect-error We're exposing methods in the users value namespace
  addListener(callback: unknown): void {
    throw new Error("Not yet implemented");
  }

  // @ts-expect-error We're exposing methods in the users value namespace
  removeListener(callback: unknown): void {
    throw new Error("Not yet implemented");
  }

  // @ts-expect-error We're exposing methods in the users value namespace
  removeAllListeners(): void {
    throw new Error("Not yet implemented");
  }
}

declare const d: Dictionary<{ foo: string }>;
