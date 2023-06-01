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

import { TimeoutError } from "./errors";
import { PromiseHandle } from "./PromiseHandle";

export type TimeoutPromiseOptions = {
  ms?: number;
  message?: string;
  rejectOnTimeout?: boolean;
};

export class TimeoutPromise<T = unknown> implements Promise<T | void> {
  private timer: Timer | undefined;
  private handle = new PromiseHandle<T | void>();

  constructor(
    inner: Promise<T>,
    { ms, message = `Waited ${ms}ms`, rejectOnTimeout = true }: TimeoutPromiseOptions = {},
  ) {
    if (typeof ms === "number") {
      this.timer = setTimeout(() => {
        if (rejectOnTimeout) {
          this.handle.reject(new TimeoutError(message));
        } else {
          this.handle.resolve();
        }
      }, ms);
    }
    inner.then(this.handle.resolve, this.handle.reject).finally(() => {
      this.cancel();
    });
  }

  cancel() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      delete this.timer;
    }
  }

  then = this.handle.promise.then.bind(this.handle.promise);
  catch = this.handle.promise.catch.bind(this.handle.promise);
  finally = this.handle.promise.finally.bind(this.handle.promise);

  get [Symbol.toStringTag]() {
    return TimeoutPromise.name;
  }
}
