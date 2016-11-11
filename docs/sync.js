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
}

/**
 * Set a global listener function.
 * @param {string} local_path - The path to the directory where realm files are stored [deprecated]
 * @param {string} server_url - The sync server to listen to
 * @param {SyncUser} admin_user - An admin user obtained by calling `new Realm.Sync.User.Admin`
 * @param {function(realm_name)} filter_callback - Return true to recieve changes for the given realm
 * @param {function(realm_name, realm, change_set)} change_callback - called on any realm changes with 
 *  the following arguments:
 *   - `realm_name` - path of the Realm on which changes occurred
 *   - `realm` - a `Realm` object for the changed Realm
 *   - `change_set` - a dictionary of object names to arays of indexes indicating the indexes of objects of each type
 *   which have been added, removed, or modified
 */
Sync.setGlobalListener = function(local_path, server_url, admin_user, filter_callback, change_callback) {};

/**
 * Set the sync log level.
 * @param {string} log_level
 */
Sync.setLogLevel = function(log_level) {};

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
	login(server, username, password, callback) {}

	/**
	 * Login a sync user using an external login provider.
	 * @param {string} server - authentication server
	 * @param {string} provider - The provider type
	 * @param {string} providerToken - The access token for the given provider
	 * @param {function(error, User)} callback - called with the following arguments:
	 *   - `error` - an Error object is provided on failure
	 *   - `user` - a valid User object on success
	 */
	loginWithProvider(server, provider, providerToken, callback) {}

	/**
	 * Create a new user using the username/password provider
	 * @param {string} server - authentication server
	 * @param {string} username
	 * @param {string} password
	 * @param {function(error, User)} callback - called with the following arguments:
	 *   - `error` - an Error object is provided on failure
	 *   - `user` - a valid User object on success
	 */
	create(server, username, password, callback) {}

	/**
	 * Create an admin user for the given authentication server with an existing token
	 * @param {string} server - authentication server
	 * @param {string} adminToken - existing admin token
	 * @return {User} - admin user populated with the given token and server
	 */
	adminUser(server, adminToken) {}

	/**
	 * A dictionary containing users that are currently logged in.
	 * The keys in the dictionary are user identities, values are corresponding User objects.
	 * @type {object}
	 */
	get all() {};

	/**
	 * Get the currently logged in user.
	 * Throws error if > 1 user logged in, returns undefined if no users logged in.
	 * @type {User}
	 */
	get current() {};
}
