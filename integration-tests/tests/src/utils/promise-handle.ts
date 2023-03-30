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

type ResolveType<T> = (value: T | PromiseLike<T>) => void;
type RejectType = (reason?: any) => void;
export type PromiseHandle<T> = {
  resolve: ResolveType<T>;
  reject: RejectType;
} & Promise<T>;

export function createPromiseHandle<T = void>(): PromiseHandle<T> {
  let resolve: ResolveType<T> | null = null;
  let reject: RejectType | null = null;
  const promise = new Promise<T>((arg0, arg1) => {
    resolve = arg0;
    reject = arg1;
  });
  if (!resolve || !reject) {
    throw new Error("Expected promise executor to be called synchronously");
  }
  return {
    [Symbol.toStringTag]: "PromiseHandle",
    resolve,
    reject,
    then(onResolve, onReject) {
      return promise.then(onResolve, onReject);
    },
    catch(onReject) {
      return promise.catch(onReject);
    },
    finally(onFinally) {
      return promise.finally(onFinally);
    },
  };
}
