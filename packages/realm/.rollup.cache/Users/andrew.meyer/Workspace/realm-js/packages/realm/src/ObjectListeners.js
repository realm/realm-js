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
import { INTERNAL, Listeners, binding, getClassHelpers } from "./internal";
/** @internal */
export class ObjectListeners {
    realm;
    object;
    /**
     * Storage for the momoized, lacyly created object notifier.
     */
    internal;
    constructor(realm, object) {
        this.realm = realm;
        this.object = object;
        this.properties = getClassHelpers(this.object.constructor).properties;
    }
    properties;
    listeners = new Listeners({
        register: (callback) => {
            const token = this.notifier.addCallback((changes) => {
                try {
                    callback(this.object, {
                        deleted: changes.isDeleted,
                        changedProperties: changes.changedColumns.map(this.properties.getName),
                    });
                }
                catch (err) {
                    // Scheduling a throw on the event loop,
                    // since throwing synchroniously here would result in an abort in the calling C++
                    setImmediate(() => {
                        throw err;
                    });
                }
            }, []);
            // Get an actual NotificationToken for the bigint value
            return binding.NotificationToken.forObject(this.notifier, token);
        },
        unregister(token) {
            token.unregister();
        },
    });
    /**
     * A momoized, lacyly created object notifier.
     */
    get notifier() {
        let notifier = this.internal;
        if (notifier) {
            return notifier;
        }
        else {
            notifier = binding.Helpers.makeObjectNotifier(this.realm, this.object[INTERNAL]);
            this.internal = notifier;
            return notifier;
        }
    }
    addListener(callback) {
        this.listeners.add(callback);
    }
    removeListener(callback) {
        this.listeners.remove(callback);
    }
    removeAllListeners() {
        this.listeners.removeAll();
    }
}
//# sourceMappingURL=ObjectListeners.js.map