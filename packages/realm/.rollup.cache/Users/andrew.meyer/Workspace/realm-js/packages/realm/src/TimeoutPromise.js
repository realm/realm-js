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
export class TimeoutPromise {
    timer;
    handle = new PromiseHandle();
    constructor(inner, ms, message = `Waited ${ms}ms`) {
        if (typeof ms === "number") {
            this.timer = setTimeout(() => {
                const err = new TimeoutError(message);
                this.handle.reject(err);
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
//# sourceMappingURL=TimeoutPromise.js.map