/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */


/**
 * Instances of this class (herein referred to as “lists”) will be returned when accessing
 * object properties whose type is `"list"`
 * (see {@linkplain Realm~ObjectSchemaProperty ObjectSchemaProperty}).
 * The objects contained in a list are accessible through its index properties and may only be
 * modified inside a {@linkplain Realm#write write} transaction.
 * @memberof Realm
 */
class List {
    /**
     * The number of objects in the list.
     * @type {number}
     * @readonly
     */
    get length() {}

    /**
     * Create a frozen snapshot of the list. This means changes to the list will not be
     * reflected in the results returned by this method. However, deleted objects will become
     * `null` at their respective indices.
     * @returns {Realm.Results} which will **not** live update.
     */
    snapshot() {}

    /**
     * Remove the **first** object from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Object|undefined} if the list is empty.
     */
    shift() {}

    /**
     * Remove the **last** object from the list and return it.
     * @throws {Error} If not inside a write transaction.
     * @returns {Realm.Object|undefined} if the list is empty.
     */
    pop() {}

    /**
     * Add one or more objects to the _end_ of the list.
     * @param {...Realm.Object} object - Each object’s type must match
     *   {@linkcode Realm~ObjectSchemaProperty objectType} specified in the schema.
     * @throws {TypeError} If an `object` is of the wrong type.
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of the list
     *   after adding objects.
     */
    push(...object) {}

    /**
     * Add one or more objects to the _beginning_ of the list.
     * @param {...Realm.Object} object - Each object’s type must match
     *   {@linkcode Realm~ObjectSchemaProperty objectType} specified in the schema.
     * @throws {TypeError} If an `object` is of the wrong type.
     * @throws {Error} If not inside a write transaction.
     * @returns {number} equal to the new {@link Realm.List#length length} of the list
     *   after adding objects.
     */
    unshift(...object) {}
}