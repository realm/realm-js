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

/** @internal */
import type { binding } from "./wrapper.generated";
type Binding = typeof binding;

/** @internal */
declare module "./wrapper.generated" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace binding {
    /** @internal */
    export interface IndexSet {
      asIndexes(): Iterator<number>;
    }
    export interface Timestamp {
      toDate(): Date;
    }
    // eslint-disable-next-line @typescript-eslint/no-namespace
    export namespace Timestamp {
      function fromDate(d: Date): binding.Timestamp;
    }

    export class InvalidObjKey extends TypeError {
      constructor(input: string);
    }
    export function stringToObjKey(input: string): binding.ObjKey;
    export function isEmptyObjKey(objKey: binding.ObjKey): boolean;
  }
}

/**
 * Applies SDK level patches to the binding.
 * This should only be called after the binding has been injected.
 * @internal
 */
export function applyPatch(binding: Binding) {
  binding.IndexSet.prototype.asIndexes = function* (this: binding.IndexSet) {
    for (const [from, to] of this) {
      let i = from;
      while (i < to) {
        yield i;
        i++;
      }
    }
  };

  binding.Timestamp.fromDate = (d: Date) =>
    binding.Timestamp.make(binding.Int64.numToInt(Math.floor(d.valueOf() / 1000)), (d.valueOf() % 1000) * 1000_000);

  binding.Timestamp.prototype.toDate = function () {
    return new Date(Number(this.seconds) * 1000 + this.nanoseconds / 1000_000);
  };

  binding.InvalidObjKey = class InvalidObjKey extends TypeError {
    constructor(input: string) {
      super(`Cannot convert '${input}' to an ObjKey`);
    }
  };

  binding.stringToObjKey = (input: string) => {
    try {
      return binding.Int64.strToInt(input) as unknown as binding.ObjKey;
    } catch {
      throw new binding.InvalidObjKey(input);
    }
  };

  binding.isEmptyObjKey = (objKey: binding.ObjKey) => {
    // This relies on the JS representation of an ObjKey being a bigint
    return binding.Int64.equals(objKey as unknown as binding.Int64, -1);
  };
}
