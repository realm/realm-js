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

import { PromiseHandle, createPromiseHandle } from "./promise-handle";

export type PromiseChain<Args extends unknown[]> = PromiseLike<Args> & ((...args: Args) => void);

export function createPromiseChain<Args extends unknown[]>(expectedCalls?: number): PromiseChain<Args> {
  const handles: PromiseHandle<Args>[] = [];
  function getHandle(i: number): PromiseHandle<Args> {
    // Create handles until i is included in the list of handles
    for (let h = handles.length; h <= i; h++) {
      const handle = createPromiseHandle<Args>();
      handles.push(handle);
    }
    return handles[i];
  }

  let calls = 0;
  function fn(...args: Args) {
    const handle = getHandle(calls++);
    if (typeof expectedCalls === "number" && calls > expectedCalls) {
      throw new Error(`Unexpected call to promise chain (expected ${expectedCalls} got ${calls})`);
    }
    return handle.resolve(args);
  }

  let thens = 0;
  fn.then = function then<TResult1 = Args, TResult2 = never>(
    onFulfilled?: ((value: Args) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): Promise<TResult1 | TResult2> {
    const handle = getHandle(thens++);
    return handle.then(onFulfilled, onRejected);
  };

  return fn;
}
