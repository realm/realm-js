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
import { Collection } from "./Collection";
import { INTERNAL } from "./internal";

const DEFAULT_PROPERTY_DESCRIPTOR: PropertyDescriptor = { configurable: true, enumerable: true, writable: true };
const PROXY_HANDLER: ProxyHandler<List> = {
  get(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.get(target, prop);
    } else if (typeof prop === "string") {
      const index = Number.parseInt(prop, 10);
      if (!Number.isNaN(index)) {
        // FIXME: Do not get a new Results for every index access!!!
        return target[GETTER](target[INTERNAL].asResults(), index);
      }
    }
  },
  ownKeys(target) {
    return Reflect.ownKeys(target).concat([...target.keys()].map(String));
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Reflect.has(target, prop)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    } else if (typeof prop === "string") {
      const index = Number.parseInt(prop, 10);
      if (index < target.length) {
        return DEFAULT_PROPERTY_DESCRIPTOR;
      }
    }
  },
};

const GETTER = Symbol("Realm.List#getter");
type Getter<T = unknown> = (list: binding.Results, index: number) => T;

type PartiallyWriteableArray<T> = Pick<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;

export class List<T = unknown> extends Collection<T> implements PartiallyWriteableArray<T> {
  /**
   * Create a list
   * @param internal
   * @internal
   */
  constructor(internal: binding.List, getter: Getter) {
    super();
    Object.defineProperties(this, {
      [INTERNAL]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: internal,
      },
      [GETTER]: {
        enumerable: false,
        configurable: false,
        writable: false,
        value: getter,
      },
    });
    // Wrap in a proxy to trap ownKeys and get, enabling the spread operator
    return new Proxy<List<T>>(this, PROXY_HANDLER as ProxyHandler<this>);
  }

  /**
   * The representation in the binding.
   * @internal
   */
  public [INTERNAL]!: binding.List;

  /**
   * Getter used for random access read of elements from the underlying result.
   */
  private [GETTER]!: Getter<T>;

  get length(): number {
    return this[INTERNAL].size;
  }

  keys(): IterableIterator<number> {
    const size = this[INTERNAL].size;
    let index = 0;
    return {
      next(): IteratorResult<number, void> {
        if (index < size) {
          return { value: index++, done: false };
        } else {
          return { value: undefined, done: true };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  values(): IterableIterator<T> {
    const getter = this[GETTER];
    const snapshot = this[INTERNAL].snapshot();
    const keys = this.keys();
    return {
      next(): IteratorResult<T, void> {
        const { done, value: index } = keys.next();
        if (done) {
          return { value: undefined, done };
        } else {
          return { value: getter(snapshot, index), done };
        }
      },
      [Symbol.iterator]() {
        return this;
      },
    };
  }

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
