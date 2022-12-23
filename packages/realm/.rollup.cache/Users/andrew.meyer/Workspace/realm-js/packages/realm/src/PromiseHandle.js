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
import { assert } from "./internal";
export class PromiseHandle {
    resolve;
    reject;
    promise;
    constructor() {
        this.promise = new Promise((arg0, arg1) => {
            this.resolve = (arg) => {
                arg0(arg);
            };
            this.reject = arg1;
        });
        assert(this.resolve, "Expected promise executor to be called synchroniously");
        assert(this.reject, "Expected promise executor to be called synchroniously");
    }
}
//# sourceMappingURL=PromiseHandle.js.map