import {stringify} from 'ini';
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
 * @memberof Realm
 */
class Sync {
    /**
     * Add a sync listener to listen to changes across multiple Realms
     * @param {string} server_url - the sync server to listen to
     * @param {SyncUser} admin_user - an admin user obtained by calling `new Realm.Sync.User.adminUser`
     * @param {string} regex - a regular expression used to determine which cahnged Realms should trigger events -
     *  Use `.*` to match all all Realms
     * @param {string} name - The name of event that should cause the callback to be called
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


}

/**
 * Change info passed when receiving sync 'change' events
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
 * Class for logging in and managing Sync users.
 * @memberof Realm.Sync
 */
class User {
    /**
     * Login a sync user with username and password.
     * @param {string} server - authentication server
     * @param {string} username
     * @param {string} password
     * @param {function(error, user)} callback - called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     */
    static login(server, username, password, callback) {}

    /**
     * Register/login a sync user using an external login provider.
     * @param {string} server - authentication server
   * @param {object} options - options, containing the following:
     * @param {string} options.provider - The provider type
     * @param {string} options.providerToken - The access token for the given provider
   * @param {object} [options.userInfo] - A map containing additional data required by the provider
     * @param {function(error, User)} callback - called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     */
    static registerWithProvider(server, options, callback) {}

    /**
     * Register a sync user with username and password.
     * @param {string} server - authentication server
     * @param {string} username
     * @param {string} password
     * @param {function(error, user)} callback - called with the following arguments:
     *   - `error` - an Error object is provided on failure
     *   - `user` - a valid User object on success
     */
    static register(server, username, password, callback) {}

    /**
     * Create an admin user for the given authentication server with an existing token
     * @param {string} adminToken - existing admin token
     * @return {User} - admin user populated with the given token and server
     */
    static adminUser(adminToken) {}

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
}
