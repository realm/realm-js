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

import * as binding from "./binding";
import { OrderedCollection, OrderedCollectionHelpers } from "./OrderedCollection";
import { IllegalConstructorError } from "./errors";

type PartiallyWriteableArray<T> = Pick<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;

export class List<T = unknown> extends OrderedCollection<T> implements PartiallyWriteableArray<T> {
  /**
   * The representation in the binding.
   * @internal
   */
  public internal!: binding.List;

  /** @internal */
  constructor(internal: binding.List, helpers: OrderedCollectionHelpers) {
    if (arguments.length === 0 || !(internal instanceof binding.List)) {
      throw new IllegalConstructorError("List");
    }
    super(internal.asResults(), helpers);
    // TODO: Consider if this could be a simple assignment
    Object.defineProperties(this, {
      internal: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
    });
  }

  /**
   * Set an element of the ordered collection by index
   * @param index The index
   * @param value The value
   * @internal
   */
  public set(index: number, value: unknown) {
    this.internal.setAny(index, this.helpers.toBinding(value));
  }

  get length(): number {
    return this.internal.size;
  }

  pop(): T | undefined {
    throw new Error("Not yet implemented");
  }

  /**
   * @param  {T} object
   * @returns number
   */
  push(...items: T[]): number {
    const { toBinding } = this.helpers;
    let i = this.internal.size;
    for (const item of items) {
      // Convert item to a mixedArg
      this.internal.insertAny(i++, toBinding(item));
    }
    return this.internal.size;
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
