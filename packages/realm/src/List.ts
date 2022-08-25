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

import { Collection } from "./Collection";

type PartiallyWriteableArray<T> = Pick<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;

export class List<T = unknown> extends Collection<T> implements PartiallyWriteableArray<T> {
  pop(): T | undefined {
    throw new Error("Not yet implemented");
  }

  /**
   * @param  {T} object
   * @returns number
   */
  push(...items: T[]): number {
    throw new Error("Not yet implemented");
  }

  /**
   * @returns T
   */
  shift(): T | undefined {
    throw new Error("Not yet implemented");
  }

  unshift(...items: T[]): number {
    throw new Error("Not yet implemented");
  }

  splice(start: number, deleteCount?: number): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    throw new Error("Not yet implemented");
  }
}
