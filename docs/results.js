/* Copyright 2016 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */


/**
 * Instances of this class (herein referred to as “results”) are typically **live** collections
 * returned by {@link Realm#objects objects()} that will update as new objects are either
 * added to or deleted from the Realm that match the underlying query. Results returned by
 * {@link Realm.Results#snapshot snapshot()}, however, are will **not** live update.
 * @memberof Realm
 */
class Results {
   /**
    * The number of objects in the results.
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
     * Modifies this collection to be sorted by the provided property of each object.
     * @param {string} name - The property name to sort results by.
     * @param {boolean} [ascending=true]
     * @throws {Error} If the specified property does not exist.
     */
    sortByProperty(name, ascending) {}
}
