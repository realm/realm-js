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

import { AbortSignal, fetch } from "@realm/fetch";

/** @internal */
import type * as binding from "../../binding/generated/native";

type Binding = typeof binding;

/** @internal */
declare module "../../binding/generated/native" {
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
  export interface SyncSession {
    /** Returns a WeakSyncSession and releases the strong reference held by this SyncSession */
    weaken(): WeakSyncSession;
  }

  export interface WeakSyncSession {
    /**
     * Similar to WeakRef.deref(), but takes a callback so that the strong reference can be
     * automatically released when the callback exists (either by returning or throwing).
     * It is not legal to hold on to the SyncSession after this returns because its
     * strong reference will have been deleted.
     */
    withDeref<Ret = void>(callback: (shared: SyncSession | null) => Ret): Ret;
  }

  export class InvalidObjKey extends TypeError {
    constructor(input: string);
  }
  export function stringToObjKey(input: string): binding.ObjKey;
  export function isEmptyObjKey(objKey: binding.ObjKey): boolean;
  export function toFetchArgs(request: binding.Request): Parameters<typeof fetch>;
}

/**
 * Applies SDK level patches to the binding.
 * NOTE: This should only be called after the binding has been injected.
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

  binding.SyncSession.prototype.weaken = function () {
    try {
      return binding.WeakSyncSession.weakCopyOf(this);
    } finally {
      this.$resetSharedPtr();
    }
  };

  binding.WeakSyncSession.prototype.withDeref = function <Ret = void>(
    callback: (shared: binding.SyncSession | null) => Ret,
  ) {
    const shared = this.rawDereference();
    try {
      return callback(shared);
    } finally {
      shared?.$resetSharedPtr();
    }
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

  function fromBindingFetchBody(body: string) {
    if (body.length === 0) {
      return undefined;
    } else {
      return body;
    }
  }

  const HTTP_METHOD: Record<binding.HttpMethod, string> = {
    [binding.HttpMethod.Get]: "GET",
    [binding.HttpMethod.Post]: "POST",
    [binding.HttpMethod.Put]: "PUT",
    [binding.HttpMethod.Patch]: "PATCH",
    [binding.HttpMethod.Del]: "DELETE",
  };

  function fromBindingFetchMethod(method: binding.HttpMethod) {
    if (method in HTTP_METHOD) {
      return HTTP_METHOD[method];
    } else {
      throw new Error(`Unexpected method ${method}`);
    }
  }

  function fromBindingTimeoutSignal(timeoutMs: binding.Int64Type): AbortSignal | undefined {
    const timeout = Number(timeoutMs);
    return timeout > 0 ? AbortSignal.timeout(timeout) : undefined;
  }

  binding.toFetchArgs = ({ url, method, timeoutMs, body, headers }) => {
    return [
      url,
      {
        body: fromBindingFetchBody(body),
        method: fromBindingFetchMethod(method),
        signal: fromBindingTimeoutSignal(timeoutMs),
        headers,
      },
    ];
  };
}
