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
export var RealmEvent;
(function (RealmEvent) {
    RealmEvent["Change"] = "change";
    RealmEvent["Schema"] = "schema";
    RealmEvent["BeforeNotify"] = "beforenotify";
})(RealmEvent || (RealmEvent = {}));
// Temporary functions to work between event names and corresponding enums
// TODO: We should update the external API to take a `RealmEvent` instead of a string.
export ////////////////////////////////////////////////////////////////////////////
 class RealmListeners {
    realm;
    eventType;
    /**
     * Keeps tracked of registered listener callbacks for Realm class notifications.
     */
    constructor(realm, eventType) {
        this.realm = realm;
        this.eventType = eventType;
        this.eventType = eventType;
    }
    listeners = new Set();
    // Combined callback which runs all listener callbacks in one call.
    callback() {
        let schema;
        if (this.eventType === RealmEvent.Schema) {
            schema = this.realm.schema;
        }
        for (const callback of this.listeners) {
            callback(this.realm, this.eventType, schema);
        }
    }
    add(callback) {
        if (this.listeners.has(callback)) {
            // No need to add a listener twice
            return;
        }
        // Store the listener.
        this.listeners.add(callback);
    }
    remove(callback) {
        this.listeners.delete(callback);
    }
    removeAll() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=RealmListeners.js.map