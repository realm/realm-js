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
import { Collection, INTERNAL, IllegalConstructorError, JSONCacheMap, RealmObject, Results, TypeAssertionError, assert, binding, getTypeName, mixedToBinding, unwind, } from "./internal";
const DEFAULT_COLUMN_KEY = 0n;
const DEFAULT_PROPERTY_DESCRIPTOR = { configurable: true, enumerable: true, writable: true };
const PROXY_HANDLER = {
    // TODO: Consider executing the `parseInt` first to optimize for index access over accessing a member on the list
    get(target, prop) {
        if (Reflect.has(target, prop)) {
            return Reflect.get(target, prop);
        }
        else if (typeof prop === "string") {
            const index = Number.parseInt(prop, 10);
            // TODO: Consider catching an error from access out of bounds, instead of checking the length, to optimize for the hot path
            if (!Number.isNaN(index) && index >= 0 && index < target.length) {
                return target.get(index);
            }
        }
    },
    set(target, prop, value, receiver) {
        if (typeof prop === "string") {
            const index = Number.parseInt(prop, 10);
            // TODO: Consider catching an error from access out of bounds, instead of checking the length, to optimize for the hot path
            // TODO: Do we expect an upper bound check on the index when setting?
            if (!Number.isNaN(index) && index >= 0) {
                target.set(index, value);
                return true;
            }
            else if (index < 0) {
                throw new Error(`Index ${index} cannot be less than zero.`);
            }
        }
        return Reflect.set(target, prop, value, receiver);
    },
    ownKeys(target) {
        return Reflect.ownKeys(target).concat([...target.keys()].map(String));
    },
    getOwnPropertyDescriptor(target, prop) {
        if (Reflect.has(target, prop)) {
            return Reflect.getOwnPropertyDescriptor(target, prop);
        }
        else if (typeof prop === "string") {
            const index = Number.parseInt(prop, 10);
            if (index < target.length) {
                return DEFAULT_PROPERTY_DESCRIPTOR;
            }
        }
    },
};
export class OrderedCollection extends Collection {
    realm;
    results;
    helpers;
    /** @internal */
    constructor(
    /** @internal */ realm, 
    /** @internal */ results, 
    /** @internal */ helpers) {
        if (arguments.length === 0) {
            throw new IllegalConstructorError("OrderedCollection");
        }
        super((callback) => {
            return this.results.addNotificationCallback((changes) => {
                try {
                    callback(proxied, {
                        deletions: unwind(changes.deletions),
                        insertions: unwind(changes.insertions),
                        oldModifications: unwind(changes.modifications),
                        newModifications: unwind(changes.modificationsNew),
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
        });
        this.realm = realm;
        this.results = results;
        this.helpers = helpers;
        // Wrap in a proxy to trap ownKeys and get, enabling the spread operator
        const proxied = new Proxy(this, PROXY_HANDLER);
        // Get the class helpers for later use, if available
        const { objectType } = results;
        if (typeof objectType === "string" && objectType !== "") {
            this.classHelpers = this.realm.getClassHelpers(objectType);
        }
        else {
            this.classHelpers = null;
        }
        this.mixedToBinding = mixedToBinding.bind(undefined, realm.internal);
        // Make the internal properties non-enumerable
        Object.defineProperties(this, {
            realm: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
            results: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
            helpers: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
            classHelpers: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
            mixedToBinding: {
                enumerable: false,
                configurable: false,
                writable: false,
            },
        });
        return proxied;
    }
    /** @internal */
    classHelpers;
    mixedToBinding;
    /**
     * Get an element of the ordered collection by index
     * @param index The index
     * @returns The element
     * @internal
     */
    get(index) {
        return this.helpers.fromBinding(this.helpers.get(this.results, index));
    }
    /**
     * Set an element of the ordered collection by index
     * @param index The index
     * @param value The value
     * @internal
     */
    set(index, value) {
        throw new Error(`Assigning into a ${this.constructor.name} is not support`);
    }
    /**
     * @internal
     */
    toJSON(_, cache = new JSONCacheMap()) {
        return this.map((item, index) => {
            if (item instanceof RealmObject) {
                return item.toJSON(index.toString(), cache);
            }
            else {
                return item;
            }
        });
    }
    *keys() {
        const size = this.results.size();
        for (let i = 0; i < size; i++) {
            yield i;
        }
    }
    *values() {
        const snapshot = this.results.snapshot();
        const { get, fromBinding } = this.helpers;
        for (const i of this.keys()) {
            yield fromBinding(get(snapshot, i));
        }
    }
    *entries() {
        const { get, fromBinding } = this.helpers;
        const snapshot = this.results.snapshot();
        const size = snapshot.size();
        for (let i = 0; i < size; i++) {
            yield [i, fromBinding(get(snapshot, i))];
        }
    }
    get length() {
        return this.results.size();
    }
    get type() {
        return getTypeName(this.results.type & ~960 /* binding.PropertyType.Flags */, undefined);
    }
    /**
     * Whether `null` is a valid value for the collection.
     * @readonly
     * @since 2.0.0
     */
    get optional() {
        return !!(this.results.type & 64 /* binding.PropertyType.Nullable */);
    }
    toString() {
        return [...this].toString();
    }
    toLocaleString() {
        return [...this].toLocaleString();
    }
    concat(...items) {
        return [...this].concat(...items);
    }
    join(separator) {
        return [...this].join(separator);
    }
    slice(start, end) {
        return [...this].slice(start, end);
    }
    indexOf(searchElement, fromIndex) {
        assert(typeof fromIndex === "undefined", "The second fromIndex argument is not yet supported");
        if (this.type === "object") {
            assert.instanceOf(searchElement, RealmObject);
            return this.results.indexOfObj(searchElement[INTERNAL]);
        }
        else {
            return this.results.indexOf(this.helpers.toBinding(searchElement, undefined));
        }
    }
    lastIndexOf(searchElement, fromIndex) {
        return [...this].lastIndexOf(searchElement, fromIndex);
    }
    every(predicate, thisArg) {
        return [...this].every(predicate, thisArg);
    }
    some(predicate, thisArg) {
        return [...this].some(predicate, thisArg);
    }
    forEach(callbackfn, thisArg) {
        return [...this].forEach(callbackfn, thisArg);
    }
    map(callbackfn, thisArg) {
        return [...this].map(callbackfn, thisArg);
    }
    filter(predicate, thisArg) {
        return [...this].filter(predicate, thisArg);
    }
    reduce(callbackfn, initialValue) {
        return [...this].reduce(callbackfn, initialValue);
    }
    reduceRight(callbackfn, initialValue) {
        return [...this].reduceRight(callbackfn, initialValue);
    }
    find(predicate, thisArg) {
        return [...this].find(predicate, thisArg);
    }
    findIndex(predicate, thisArg) {
        return [...this].findIndex(predicate, thisArg);
    }
    // TODO: Implement support for RealmObjects, by comparing their #objectKey values
    includes(searchElement, fromIndex) {
        return this.indexOf(searchElement, fromIndex) !== -1;
    }
    flatMap(callback, thisArg) {
        return [...this].flatMap(callback, thisArg);
    }
    flat(depth) {
        throw new Error("Method not implemented.");
    }
    at(index) {
        return [...this].at(index);
    }
    [Symbol.iterator]() {
        return this.values();
    }
    // Other methods
    description() {
        throw new Error("Method not implemented.");
    }
    /**
     * Checks if this collection has not been deleted and is part of a valid Realm.
     * @returns `true` if the collection can be safely accessed, `false` if not.
     * @since 0.14.0
     */
    isValid() {
        throw new Error(`Calling isValid on a ${this.constructor.name} is not support`);
    }
    /**
     * Checks if this collection is empty.
     * @returns `true` if the collection is empty, `false` if not.
     * @since 2.7.0
     */
    isEmpty() {
        return this.results.size() === 0;
    }
    /**
     * Returns the minimum value of the values in the collection or of the
     * given property among all the objects in the collection, or `undefined`
     * if the collection is empty.
     *
     * Only supported for int, float, double and date properties. `null` values
     * are ignored entirely by this method and will not be returned.
     *
     * @param property For a collection of objects, the property to take the minimum of.
     * @throws {@link TypeAssertionError} If no property with the name exists or if property is not numeric/date.
     * @returns The minimum value.
     * @since 1.12.1
     */
    min(property) {
        const columnKey = this.getPropertyColumnKey(property);
        const result = this.results.min(columnKey);
        if (result instanceof Date || typeof result === "number" || typeof result === "undefined") {
            return result;
        }
        else if (typeof result === "bigint") {
            return Number(result);
        }
        else if (result instanceof binding.Float) {
            return result.value;
        }
        else if (result instanceof binding.Timestamp) {
            return result.toDate();
        }
        else {
            throw new TypeAssertionError("Timestamp, number, bigint, Float or null", result, "result");
        }
    }
    /**
     * Returns the maximum value of the values in the collection or of the
     * given property among all the objects in the collection, or `undefined`
     * if the collection is empty.
     *
     * Only supported for int, float, double and date properties. `null` values
     * are ignored entirely by this method and will not be returned.
     *
     * @param property For a collection of objects, the property to take the maximum of.
     * @throws {@link Error} If no property with the name exists or if property is not numeric/date.
     * @returns The maximum value.
     * @since 1.12.1
     */
    max(property) {
        const columnKey = this.getPropertyColumnKey(property);
        const result = this.results.max(columnKey);
        if (result instanceof Date || typeof result === "number" || typeof result === "undefined") {
            return result;
        }
        else if (typeof result === "bigint") {
            return Number(result);
        }
        else if (result instanceof binding.Float) {
            return result.value;
        }
        else if (result instanceof binding.Timestamp) {
            return result.toDate();
        }
        else {
            throw new TypeAssertionError("Timestamp, number, bigint, Float or undefined", result, "result");
        }
    }
    /**
     * Computes the sum of the values in the collection or of the given
     * property among all the objects in the collection, or 0 if the collection
     * is empty.
     *
     * Only supported for int, float and double properties. `null` values are
     * ignored entirely by this method.
     * @param property For a collection of objects, the property to take the sum of.
     * @throws {@link Error} If no property with the name exists or if property is not numeric.
     * @returns The sum.
     * @since 1.12.1
     */
    sum(property) {
        const columnKey = this.getPropertyColumnKey(property);
        const result = this.results.sum(columnKey);
        if (typeof result === "number") {
            return result;
        }
        else if (typeof result === "bigint") {
            return Number(result);
        }
        else if (result instanceof binding.Float) {
            return result.value;
        }
        else {
            throw new TypeAssertionError("number, bigint or Float", result, "result");
        }
    }
    /**
     * Computes the average of the values in the collection or of the given
     * property among all the objects in the collection, or `undefined` if the collection
     * is empty.
     *
     * Only supported for int, float and double properties. `null` values are
     * ignored entirely by this method and will not be factored into the average.
     * @param property For a collection of objects, the property to take the average of.
     * @throws {@link Error} If no property with the name exists or if property is not numeric.
     * @returns The sum.
     * @since 1.12.1
     */
    avg(property) {
        const columnKey = this.getPropertyColumnKey(property);
        const result = this.results.average(columnKey);
        if (typeof result === "number" || typeof result === "undefined") {
            return result;
        }
        else if (typeof result === "bigint") {
            return Number(result);
        }
        else if (result instanceof binding.Float) {
            return result.value;
        }
        else {
            throw new TypeAssertionError("number, Float, bigint or undefined", result, "result");
        }
    }
    /**
     * Returns new _Results_ that represent this collection being filtered by the provided query.
     *
     * @param query Query used to filter objects from the collection.
     * @param arg Each subsequent argument is used by the placeholders
     *   (e.g. `$0`, `$1`, `$2`, …) in the query.
     * @throws {@link Error} If the query or any other argument passed into this method is invalid.
     * @returns Results filtered according to the provided query.
     *
     * This is currently only supported for collections of Realm Objects.
     *
     * @example
     * let merlots = wines.filtered('variety == "Merlot" && vintage <= $0', maxYear);
     */
    filtered(queryString, ...args) {
        const { results: parent, realm, helpers } = this;
        const kpMapping = binding.Helpers.getKeypathMapping(realm.internal);
        const bindingArgs = args.map((arg) => Array.isArray(arg) ? arg.map((sub) => this.mixedToBinding(sub)) : this.mixedToBinding(arg));
        const newQuery = parent.query.table.query(queryString, bindingArgs, kpMapping);
        const results = binding.Helpers.resultsAppendQuery(parent, newQuery);
        return new Results(realm, results, helpers);
    }
    sorted(arg0 = "self", arg1) {
        if (Array.isArray(arg0)) {
            assert(typeof arg1 === "undefined", "Second argument is not allowed if passed an array of sort descriptors");
            const { results: parent, realm, helpers } = this;
            // Map optional "reversed" to "accending" (expected by the binding)
            const descriptors = arg0.map((arg) => typeof arg === "string" ? [arg, true] : [arg[0], !arg[1]]);
            // TODO: Call `parent.sort`, avoiding property name to colkey conversion to speed up performance here.
            const results = parent.sortByNames(descriptors);
            return new Results(realm, results, helpers);
        }
        else if (typeof arg0 === "string") {
            return this.sorted([[arg0, arg1 === true]]);
        }
        else if (typeof arg0 === "boolean") {
            return this.sorted([["self", arg0]]);
        }
        else {
            throw new Error("Expected either a property name and optional bool or an array of descriptors");
        }
    }
    /**
     * Create a frozen snapshot of the collection.
     *
     * Values added to and removed from the original collection will not be
     * reflected in the _Results_ returned by this method, including if the
     * values of properties are changed to make them match or not match any
     * filters applied.
     *
     * This is **not** a _deep_ snapshot. Realm objects contained in this
     * snapshot will continue to update as changes are made to them, and if
     * they are deleted from the Realm they will be replaced by `null` at the
     * respective indices.
     *
     * @returns Results which will **not** live update.
     */
    snapshot() {
        return new Results(this.realm, this.results.snapshot(), this.helpers);
    }
    getPropertyColumnKey(name) {
        if (this.classHelpers) {
            assert.string(name, "name");
            return this.classHelpers.properties.get(name).columnKey;
        }
        else if (name) {
            throw new Error(`Cannot get property named '${name}' on a list of primitives`);
        }
        else {
            return DEFAULT_COLUMN_KEY;
        }
    }
}
//# sourceMappingURL=OrderedCollection.js.map