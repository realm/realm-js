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
import { IllegalConstructorError, Listeners, assert } from "./internal";
/**
 * Abstract base class containing methods shared by Realm **List**, **Dictionary**, and **Results**.
 *
 * A Realm Collection is a homogenous sequence of values of any of the types
 * that can be stored as properties of Realm objects. A collection can be
 * accessed in any of the ways that a normal Javascript Array can, including
 * subscripting, enumerating with `for-of` and so on.
 *
 * A Collection always reflect the current state of the Realm. The one exception to this is
 * when using `for...in` or `for...of` enumeration, which will always enumerate over the
 * objects which matched the query when the enumeration is begun, even if some of them are
 * deleted or modified to be excluded by the filter during the enumeration.
 *
 * @memberof Realm
 * @since 0.11.0
 */
export class Collection {
    /** @internal */
    listeners;
    /** @internal */
    constructor(registerListener) {
        if (arguments.length === 0) {
            throw new IllegalConstructorError("Collection");
        }
        this.listeners = new Listeners({
            register: registerListener,
            unregister(token) {
                token.unregister();
            },
        });
        // Make the internal properties non-enumerable
        Object.defineProperties(this, {
            listeners: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
        });
    }
    /**
     * Add a listener `callback` which will be called when a **live** collection instance changes.
     * @param callback A function to be called when changes occur.
     *   The callback function is called with two arguments:
     *   - `collection`: the collection instance that changed,
     *   - `changes`: a dictionary with keys `insertions`, `newModifications`, `oldModifications`
     *      and `deletions`, each containing a list of indices in the collection that were
     *      inserted, updated or deleted respectively. `deletions` and `oldModifications` are
     *      indices into the collection before the change happened, while `insertions` and
     *      `newModifications` are indices into the new version of the collection.
     * @throws {@link TypeAssertionError} If `callback` is not a function.
     * @example
     * wines.addListener((collection, changes) => {
     *  // collection === wines
     *  console.log(`${changes.insertions.length} insertions`);
     *  console.log(`${changes.oldModifications.length} oldModifications`);
     *  console.log(`${changes.newModifications.length} newModifications`);
     *  console.log(`${changes.deletions.length} deletions`);
     *  console.log(`new size of collection: ${collection.length}`);
     * });
     */
    addListener(callback) {
        assert.function(callback, "callback");
        this.listeners.add(callback);
    }
    /**
     * Remove the listener `callback` from the collection instance.
     * @param callback Callback function that was previously
     *   added as a listener through the **addListener** method.
     * @throws {@link TypeAssertionError} If `callback` is not a function.
     */
    removeListener(callback) {
        assert.function(callback, "callback");
        this.listeners.remove(callback);
    }
    /**
     * Remove all `callback` listeners from the collection instance.
     */
    removeAllListeners() {
        this.listeners.removeAll();
    }
}
//# sourceMappingURL=Collection.js.map