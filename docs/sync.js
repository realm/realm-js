////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/**
 * When opening a Realm created with Realm Mobile Platform v1.x, it is automatically
 * migrated to the v2.x format. In case this migration
 * is not possible, an exception is thrown. The exception´s `message` property will be equal
 * to `IncompatibleSyncedRealmException`. The Realm is backed up, and the property `configuration`
 * is a {Realm~Configuration} which refers to it. You can open it as a local, read-only Realm, and 
 * copy objects to a new synced Realm.
 * 
 * @memberof Realm
 */
class Sync {
    /**
     * Add a sync listener to listen to changes across multiple Realms
     * @param {string} server_url - the sync server to listen to
     * @param {SyncUser} admin_user - an admin user obtained by calling `new Realm.Sync.User.adminUser`
     * @param {string} regex - a regular expression used to determine which changed Realms should trigger events -
     *  Use `.*` to match all all Realms
     * @param {string} name - The name of the event that should trigger the callback to be called
     *   _Currently only the 'change' event is supported_
     * @param {function(change_event)} change_callback - called when changes are made to any Realm which
     *  match the given regular expression
     */
    static addListener(server_url, admin_user, regex, name, change_callback) {}

    /**
     * Remove a previously registered sync listener
     * @param {string} regex - the regular expression previously used to register the listener
     * @param {string} name - The event name
     *   _Currently only the 'change' event is supported_
     * @param {function(change_event)} change_callback - the previously registered callback to be removed
     */
    static removeListener(regex, name, change_callback) {}

    /**
     * Remove all previously regiestered listeners
     * @param {string} [name] - The name of the event whose listeners should be removed.
     *   _Currently only the 'change' event is supported_
     */
    static removeAllListeners(name) {}

    /**
     * Set the sync log level.
     * @param {string} log_level
     */
    static setLogLevel(log_level) {}

    /**
     * Initiate a client reset. The Realm must be closed prior to the reset.
     * @param {string} [path] - The path to the Realm to reset.
     * Throws error if reset is not possible.
     * @example
     * {
     *   const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' } };
     *   config.sync.error = (sender, error) => {
     *     if (error.code === 7) { // 7 -> client reset
     *       Realm.Sync.initiateClientReset(original_path);
     *       // copy required objects from Realm at error.config.path
     *     }
     *   }
     * }
     */
    static initiateClientReset(path) {}
}

/**
 * Change information passed when receiving sync 'change' events
 * @memberof Realm.Sync
 */
class ChangeEvent {
    /**
     * The path of the changed Realm
     * @type {string}
     */
    get path() {}

    /**
     * The changed realm
     * @type {Realm}
     */
    get realm() {}

    /**
     * The changed Realm at the old state before the changes were applied
     * @type {Realm}
     */
    get oldRealm() {}

    /**
     * The change indexes for all added, removed, and modified objects in the changed Realm.
     * This object is a hashmap of object types to arrays of indexes for all changed objects:
     * @example
     * {
     *   object_type_1: {
     *     insertions:    [indexes...],
     *     deletions:     [indexes...],
     *     modifications: [indexes...]
     *   },
     *   object_type_2:
     *     ...
     * }
     * @type {object}
     */
    get changes() {}
}

/**
 * @typedef Realm.Sync~LogLevel
 * @type {("error"|"info"|"debug")}
 */

/**
 * Class that describes authentication errors in the Realm Object Server
 * @memberof Realm.Sync
 */
class AuthError extends Error {
    /**
     * The numerical code for this error.
     * @type {number}
     */
    get code() {}

    /**
     * The unique help URI that describes this error.
     * @type {string}
     */
    get type() {}
}

/**
 * Describes an error when an incompatible synced Realm is opened. The old version of the Realm can be accessed in readonly mode using the configuration() member
 * @memberof Realm.Sync
 */
class IncompatibleSyncedRealmError {
    /**
     * The name of the error is 'IncompatibleSyncedRealmError'
     */
    get name() {}
    
    /**
     * The {Realm~Configuration} of the backed up Realm.
     * @type {Realm~Configuration}
     */
    get configuration() {}
}

/**
 * Class for logging in and managing Sync users.
 * @memberof Realm.Sync
 */
class User {
    /**
     * Login a sync user with username and password.
     * @param {string} server - authentication server
     * @param {string} username
     * @param {string} password
     * @param {function(error, user)} [callback] - called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     * @returns {void|Promise<User>} Returns a promise with a user if the callback was not specified
     */
    static login(server, username, password, callback) {}

    /**
     * Register/login a sync user using an external login provider.
     * @param {string} server - authentication server
     * @param {object} options - options, containing the following:
     * @param {string} options.provider - The provider type
     * @param {string} options.providerToken - The access token for the given provider
     * @param {object} [options.userInfo] - A map containing additional data required by the provider
     * @param {function(error, User)} [callback] - an optional callback called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     * @return {void|Promise<User>} Returns a promise with a user if the callback was not specified
     */
    static registerWithProvider(server, options, callback) {}

    /**
     * Register a sync user with username and password.
     * @param {string} server - authentication server
     * @param {string} username
     * @param {string} password
     * @param {function(error, user)} [callback] - called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     * @return {void|Promise<User>} Returns a promise with a user if the callback was not specified
     */
    static register(server, username, password, callback) {}

    /**
     * Create an admin user for the given authentication server with an existing token
     * @param {string} adminToken - existing admin token
     * @param {string} server - authentication server
     * @return {User} - admin user populated with the given token and server
     */
    static adminUser(adminToken, server) {}

    /**
     * A dictionary containing users that are currently logged in.
     * The keys in the dictionary are user identities, values are corresponding User objects.
     * @type {object}
     */
    static get all() {}

    /**
     * Get the currently logged in user.
     * Throws error if > 1 user logged in, returns undefined if no users logged in.
     * @type {User}
     */
    static get current() {}

    /**
     * Gets the server URL that was used for authentication.
     * @type {string}
     */
    get server() {}

    /**
     * Gets the identity of this user on the Realm Object Server.
     * The identity is a guaranteed to be unique among all users on the Realm Object Server.
     * @type {string}
     */
    get identity() {}

    /**
     * Gets this user's refresh token. This is the user's credential for accessing the Realm
     * Object Server and should be treated as sensitive data.
     * @type {string}
     */
    get token() {}

    /**
     * Returns true if this user is an administrator
     * @type {bool}
     */
    get isAdmin() {}

    /**
     * Logs out the user from the Realm Object Server.
     */
    logout() {}

    /**
     * Get the management realm for this User.
     * This Realm can be used to control access and permissions for Realms owned by the user.
     * This includes giving others access to the Realms.
     * @returns {Realm}
     */
    openManagementRealm() {}

    /**
     * Get account information for a user. (requires administrator privilidges)
     * @param {string} provider - the provider to query for user account information (ex. 'password')
     * @param {string} username - the target username which account information should be retrieved
     * @returns {Promise} - a promise that will be resolved with the retrieved account information as json object
     * @example
     * {
     *   "provider_id": "user@email.co",
     *   "provider": "password",
     *       "user": {
     *           "id": "06ac9a0a-a96a-4ee1-b53c-b05a7542035a",
     *           "isAdmin": true,
     *       }
     * }
     */
    retrieveAccount(provider, username) {}

    /**
     * Asynchronously retrieves all permissions associated with the user calling this method.
     * @param {string} recipient the optional recipient of the permission. Can be either
     * 'any' which is the default, or 'currentUser' or 'otherUser' if you want only permissions
     * belonging to the user or *not* belonging to the user.
     * @returns {Promise} a Promise with a queryable collection of permission objects that provides detailed
     * information regarding the granted access.
     * The collection is a live query similar to what you would get by callig Realm.objects,
     * so the same features apply - you can listen for notifications or filter it.
     */
    getGrantedPermissions(recipient) { }

    /**
     * Changes the permissions of a Realm.
     * @param {object} condition - A condition that will be used to match existing users against.
     * This should be an object, containing either the key 'userId', or 'metadataKey' and 'metadataValue'.
     * @param {string} realmUrl - The path to the Realm that you want to apply permissions to.
     * @param {string} accessLevel - The access level you want to set: 'none', 'read', 'write' or 'admin'.
     * @returns {Promise} a Promise that, upon completion, indicates that the permissions have been
     * successfully applied by the server. It will be resolved with the
     * {@link PermissionChange PermissionChange} object that refers to the applied permission.
     */
    applyPermissions(condition, realmUrl, accessLevel) { }

    /**
     * Generates a token that can be used for sharing a Realm.
     * @param {string} realmUrl - The Realm URL whose permissions settings should be changed. Use * to change
     * the permissions of all Realms managed by this user.
     * @param {string} accessLevel - The access level to grant matching users. Note that the access level
     * setting is additive, i.e. you cannot revoke permissions for users who previously had a higher access level.
     * Can be 'read', 'write' or 'admin'.
     * @param {Date} [expiresAt] - Optional expiration date of the offer. If set to null, the offer doesn't expire.
     * @returns {string} - A token that can be shared with another user, e.g. via email or message and then consumed by
     * User.acceptPermissionOffer to obtain permissions to a Realm.
     */
    offerPermissions(realmUrl, accessLevel, expiresAt) { }

    /**
     * Consumes a token generated by {@link Realm#Sync#User#offerPermissions offerPermissions} to obtain permissions to a shared Realm.
     * @param {string} token - The token, generated by User.offerPermissions
     * @returns {string} The url of the Realm that the token has granted permissions to.
     */
    acceptPermissionOffer(token) { }

    /**
     * Invalidates a permission offer.
     * Invalidating an offer prevents new users from consuming its token. It doesn't revoke any permissions that have
     * already been granted.
     * @param {string|PermissionOffer} permissionOfferOrToken - Either the token or the entire
     * {@link PermissionOffer PermissionOffer} object that was generated with
     * {@link Realm#Sync#User#offerPermissions offerPermissions}.
     */
    invalidatePermissionOffer(permissionOfferOrToken) { }
}

/**
 * An object encapsulating a Realm Object Server session. Sessions represent the communication between the
 * client (and a local Realm file on disk), and the server (and a remote Realm at a given URL stored on a Realm Object Server).
 * Sessions are always created by the SDK and vended out through various APIs. The lifespans of sessions
 * associated with Realms are managed automatically.
 * @memberof Realm.Sync
 */
class Session {
    /**
     * Gets the Sync-part of the configuration that the corresponding Realm was
     * constructed with.
     * @type {object}
     */
    get config() {}

    /**
     * Gets the User that this session was created with.
     * @type {User}
     */
    get user() {}

    /**
     * Gets the URL of the Realm Object Server that this session is connected to.
     * @type {string}
     */
    get url() {}

    /**
     * Gets the current state of the session.
     * Can be either:
     *  - "active": The session is connected to the Realm Object Server and is actively transferring data.
     *  - "inactive": The session is not currently communicating with the Realm Object Server.
     *  - "invalid": A non-recoverable error has occurred, and this session is semantically invalid. A new session should be created.
     * @type {string}
     */
    get state() {}

    /**
     * Register a progress notification callback on a session object
     * @param {string} direction - The progress direction to register for.
     * Can be either:
     *  - `download` - report download progress
     *  - `upload` - report upload progress
     * @param {string} mode - The progress notification mode to use for the registration.
     * Can be either:
     *  - `reportIndefinitely` - the registration will stay active until the callback is unregistered
     *  - `forCurrentlyOutstandingWork` - the registration will be active until only the currently transferable bytes are synced
     * @param {callback(transferred, transferable)} callback - called with the following arguments:
     *   - `transferred` - the current number of bytes already transferred
     *   - `transferable` - the total number of transferable bytes (the number of bytes already transferred plus the number of bytes pending transfer)
     */
    addProgressNotification(direction, mode, progressCallback) {}

    /** Unregister a progress notification callback that was previously registered with addProgressNotification.
     * Calling the function multiple times with the same callback is ignored.
    * @param {callback(transferred, transferable)} callback - a previously registered progress callback
    */
    removeProgressNotification(progressCallback) {}
}


/**
 * Class for creating custom Data Connectors. Only available in the Enterprise Edition.
 * @memberof Realm.Sync
 */
class Adapter {
	/**
	 * Create a new Adapter to moitor and process changes made across multiple Realms
	 * @param {string} local_path - the local path where realm files are stored
	 * @param {string} server_url - the sync server to listen to
	 * @param {SyncUser} admin_user - an admin user obtained by calling `new Realm.Sync.User.adminUser`
	 * @param {string} regex - a regular expression used to determine which cahnged Realms should be monitored -
	 *  use `.*` to match all all Realms
	 * @param {function(realm_path)} change_callback - called when a new transaction is available
	 *  to process for the given realm_path
	 */
	constructor(local_path, server_url, admin_user, regex, change_callback) {}

	/**
	 * Get the Array of current instructions for the given Realm.
	 * @param {string} path - the path for the Realm being monitored
	 * @returns {Array(instructions)} or {undefined} if all transactions have been processed
	 */
	current(path) {}

	/**
	 * Advance the to the next transaction indicating that you are done processing the current
	 * instructions for the given Realm.
	 * @param {string} path - the path for the Realm to advance
	 */
	advance(path) {}

	/**
	 * Open the Realm used by the Adapter for the given path. This is useful for writing two way
	 * adapters as transactions written to this realm will be ignored when calling `current` and `advance`
	 * @param {string} path - the path for the Realm to open
	 * @returns {Realm}
	 */
	realmAtPath(path) {}

	/**
	 * Close the adapter and all opened Realms.
	 */
	close() {}
}

/**
 * The following Instructions can be returned by `Adapter.current(path)`. Each instruction object has
 * a `type` property which is one of the following types. For each type below we list the other properties
 * that will exist in the instruction object.
 * @typedef Realm.Sync.Adapter~Instruction
 * @type {(INSERT|SET|DELETE|CLEAR|CHANGE_IDENTITY|LIST_SET|LIST_INSERT|LIST_ERASE|LIST_CLEAR|ADD_TYPE|ADD_PROPERTY)}
 * @property INSERT - insert a new object
 * - `object_type` - type of the object being inserted
 * - `identity` - primary key value or row index for the object
 * - `values` - map of property names and property values for the object to insert
 * @property SET - set property values for an existing object
 * - `object_type` - type of the object
 * - `identity` - primary key value or row index for the object
 * - `values` - map of property names and property values to update for the object
 * @property DELETE - delete an exising object
 * - `object_type` - type of the object
 * - `identity` - primary key value or row index for the object
 * @property CLEAR - delete all objects of a given type
 * - `object_type` - type of the object
 * @property LIST_SET - set the object at a given list index to an object
 * - `object_type` - type of the object
 * - `identity` - primary key for the object
 * - `property` - property name for the list property to mutate
 * - `list_index` - list index to set
 * - `object_identity` - primary key or row number of the object being set
 * @property LIST_INSERT - insert an object in the list at the given index
 * - `object_type` - type of the object
 * - `identity` - primary key for the object
 * - `property` - property name for the list property to mutate
 * - `list_index` - list index at which to insert
 * - `object_identity` - primary key or row number of the object to insert
 * @property LIST_ERASE - erase an object in the list at the given index - this removes the object
 * from the list but the object will still exist in the Realm
 * - `object_type` - type of the object
 * - `identity` - primary key for the object
 * - `property` - property name for the list property to mutate
 * - `list_index` - list index which should be erased
 * @property LIST_CLEAR - clear a list removing all objects - objects are not deleted from the Realm
 * - `object_type` - type of the object
 * - `identity` - primary key for the object
 * - `property` - property name for the list property to clear
 * @property ADD_TYPE - add a new type
 * - `object_type` - name of the type
 * - `primary_key` - name of primary key property for this type
 * - `properties` - Property map as described in {@link Realm~ObjectSchema}
 * @property ADD_PROPERTIES - add properties to an existing type
 * - `object_type` - name of the type
 * - `properties` - Property map as described in {@link Realm~ObjectSchema}
 * @property CHANGE_IDENTITY - change the row index for an existing object - not called for objects
 * with primary keys
 * - `object_type` - type fo the object
 * - `identity` - old row value for the object
 * - `new_identity` - new row value for the object
 */
