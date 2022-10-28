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

export type TimeoutPromiseOptions = {
  ms: number;
  message?: string;
};

export class TimeoutPromise<T> extends Promise<T> {
  private timer: Timer | undefined;

  constructor(inner: Promise<T>, ms?: number, message = `Waited ${ms}ms`) {
    super((resolve, reject) => {
      if (typeof ms === "number") {
        this.timer = setTimeout(() => {
          const err = new TimeoutError(message);
          reject(err);
        }, ms);
      }
      inner.then(resolve, reject).finally(() => {
        this.cancel();
      });
    });
  }

  cancel() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      delete this.timer;
    }
  }
}
