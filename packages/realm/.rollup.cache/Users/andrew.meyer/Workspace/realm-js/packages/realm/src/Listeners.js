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
/** @internal */
export class Listeners {
    options;
    constructor(options) {
        this.options = options;
    }
    /**
     * Mapping of registered listener callbacks onto the their token in the bindings ObjectNotifier.
     */
    listeners = new Map();
    add(callback, ...args) {
        if (this.listeners.has(callback)) {
            // No need to add a listener twice
            if (this.options.throwOnReAdd) {
                throw new Error("Remove callback before adding it again");
            }
            return;
        }
        const token = this.options.register(callback, ...args);
        // Store the notification token by the callback to enable later removal.
        this.listeners.set(callback, token);
    }
    remove(callback) {
        const token = this.listeners.get(callback);
        if (typeof token !== "undefined") {
            this.options.unregister(token);
            this.listeners.delete(callback);
        }
    }
    removeAll() {
        for (const [, token] of this.listeners) {
            this.options.unregister(token);
        }
        this.listeners.clear();
    }
}
//# sourceMappingURL=Listeners.js.map