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

import type { fetch } from "@realm/fetch";

declare module "../generated/native" {
  /** @internal */
  export interface IndexSet {
    asIndexes(): Iterator<number>;
  }
  export interface Timestamp {
    toDate(): Date;
  }
  export namespace Timestamp {
    function fromDate(d: Date): native.Timestamp;
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
  export function stringToObjKey(input: string): ObjKey;
  export function isEmptyObjKey(objKey: binding.ObjKey): boolean;
  export function toFetchArgs(request: binding.Request): Parameters<typeof fetch>;
}

export * as binding from "../generated/native";

export declare function inject(value: typeof native);
