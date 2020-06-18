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

/* eslint getter-return: "off", no-dupe-class-members: "off" */

/**
 * This describes the options used to create a {@link Realm.App} instance.
 * @typedef {Object} Realm.App~AppConfiguration
 * @property {string} id - The id of the MongoDB Realm app.
 * @property {string} url - The URL of the MongoDB Realm end-point.
 * @property {number} timeout - General timeout (in millisecs) for requests.
 * @property {Realm.App~LocalAppConfiguration} app - local app configuration
 */

/**
 * This describes the options used for local app configuration.
 * @typedef {Object} Realm.App~LocalAppConfiguration
 * @property {string} name - The name of the app.
 * @property {string} version - The version of the app.
 */

/**
 * This describes the different options used to create a {@link Realm} instance with Realm Cloud synchronization.
 * @typedef {Object} Realm.Sync~SyncConfiguration
 * @property {Realm.User} user - A {@link Realm.User} object obtained by calling `Realm.App.logIn`.
 * @property {string|number|BSON.ObjectId} partitionValue - The value of the partition key.
 * @property {function} [error] - A callback function which is called in error situations.
 *    The `error` callback can take up to five optional arguments: `name`, `message`, `isFatal`,
 *    `category`, and `code`.
 *
 * @property {Object} [customHttpHeaders] - A map (string, string) of custom HTTP headers.
 * @property {Realm.Sync~OpenRealmBehaviorConfiguration} [newRealmFileBehavior] - Whether to create a new file and sync in background or wait for the file to be synced.
       If not set, the Realm will be downloaded before opened.
 * @property {Realm.Sync~OpenRealmBehaviorConfiguration} [existingRealmFileBehavior] - Whether to open existing file and sync in background or wait for the sync of the
 *    file to complete and then open. If not set, the Realm will be downloaded before opened.
 */

/**
 * Specify how to open a synced Realm.
 *
 * @typedef {Object} Realm.Sync~OpenRealmBehaviorConfiguration
 * @property {string} type - how to open a Realm - 'downloadBeforeOpen' to wait for download to complete or 'openImmediately' to open the local Realm
 * @property {number} [timeOut] - how long to wait for a download (in ms). Default: infinity
 * @property {string} [timeOutBehavior] - what to do when download times out - 'openLocalRealm' to open the local Realm or 'throwException' to throw an exception.
 * @see {@link Realm.Sync~openLocalRealmBehavior}
 * @see {@link Realm.Sync~downloadBeforeOpenBehavior}
 */

/**
 * The default behavior settings if you want to open a synchronized Realm immediately and start working on it.
 * If this is the first time you open the Realm, it will be empty while the server data is being downloaded
 * in the background.
 *
 * @typedef {Realm.Sync~OpenRealmBehaviorConfiguration} Realm.Sync~openLocalRealmBehavior
 */

/**
 * The default behavior settings if you want to wait for downloading a synchronized Realm to complete before opening it.
 *
 * @typedef {Realm.Sync~OpenRealmBehaviorConfiguration} Realm.Sync~downloadBeforeOpenBehavior
 */

 /**
  * The class represents a MongoDB Realm App.
  *
  * ```js
  * let app = new Realm.App(config);
  * ```
  *
  * @memberof Realm
  */
 class App {

    /**
     * Creates a new app and connects to a MongoDB Realm instance.
     *
     * @param {Realm.App~AppConfiguration} config - The configuration of the app.
     * @throws If no app id is provided.
     */
    constructor(config) { }

    /**
     * Logs in a user.
     *
     * @param {Realm.Credentials} credentials - Valid Credentials for the user.
     * @returns {Promise<Realm.User>}
     */
    logIn(credentials) { }

    /**
     * Returns the current user if any.
     *
     * @returns {Realm.User} The current user, `null` is no current user.
     */
    currentUser() { }

    /**
     * Returns a dictionary of alll users. Users' identity is used as key.
     *
     * @returns {Array}
     */
    allUsers() { }

    /**
     * Switches the current user.
     *
     * @param {Realm.User} user - The user to switch to.
     * @throws If user is not logged in.
     */
    switchUser(user) { }

    /**
     * Removes the user from MongoDB Realm.
     *
     * @param {Realm.User} user - The user to remove.
     * @returns {Promise<void>}
     */
    removeUser(user) { }

    /**
     * Auth providers. Currently only `emailPassword` provider is support
     *
     * @example
     * {
     * let app = new Realm.App(config);
     * let provider = app.auth.emailPassword;
     * }
     *
     * @see Realm.Auth
     * @see Realm.Auth.EmailPassword
     */
    get auth() { }
 }

class Sync {

    /**
     * Calling this method will force Realm to attempt to reconnect to the server immediately.
     *
     * Realm will reconnect automatically, but by using exponential backoff. This means that if the device is offline for
     * a long time, restoring the connection after it comes back online can take longer than expected. In situations
     * where it is possible to detect the network condition (e.g. Airplane mode). Manually calling this method can
     * provide a smoother user experience.
     */
    static reconnect() { }

    /**
     * Set the sync log level.
     * @param {Realm.Sync~LogLevel} level - The new log level.
     */
    static setLogLevel(level) { }

    /**
     * Enable multiplexing multiple sync sessions over a single connection.
     * When having a lot of synchronized realms open the system might run out of file
     * descriptors because of all the open sockets to the server. Session multiplexing
     * is designed to alleviate that, but it might not work with a server configured with
     * fail-over. Only use if you're seeing errors about reaching the file descriptor limit
     * and you know you are using many sync sessions.
     */
    static enableSessionMultiplexing() { }

    /**
     * A callback passed to `Realm.Sync.setLogger` when instrumenting the Realm Sync client with a custom logger.
     * @callback Realm.Sync~logCallback
     * @param {number} level The level of the log entry between 0 and 8 inclusively.
     * Use this as an index into `['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off']` to get the name of the level.
     * @param {string} message The message of the log entry.
     */

    /**
     * Capture the sync client's log.
     * @param {Realm.Sync~logCallback} logger - The log callback.
     */
    static setLogger(logger) { }

    /**
     * Set the application part of the User-Agent string that will be sent to the Realm Object Server when a session
     * is created.
     *
     * This method can only be called up to the point where the first Realm is opened. After that, the User-Agent
     * can no longer be changed.
     * @param {string} the user agent description
     */
    static setUserAgent(userAgent) { }

    /**
     * Initiate a client reset. The Realm must be closed prior to the reset.
     *
     * @param {string} [path] - The path to the Realm to reset.
     * Throws error if reset is not possible.
     * @example
     * {
     *   const config = { sync: { user, partitionValue } };
     *   config.sync.error = (sender, error) => {
     *     if (error.name === 'ClientReset') {
     *       Realm.Sync.initiateClientReset(original_path);
     *       // copy required objects from Realm at error.config.path
     *     }
     *   }
     * }
     */
    static initiateClientReset(path) { }

    /**
     * Returns `true` if Realm still has a reference to any sync sessions regardless of their state.
     * If `false` is returned it means that no sessions currently exist.
     */
    static _hasExistingSessions() { }
}

/**
 * @typedef Realm.Sync~LogLevel
 * @type {("all"|"trace"|"debug"|"detail"|"info"|"warn"|"error"|"fatal"|"off")}
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
    get code() { }

    /**
     * The unique help URI that describes this error.
     * @type {string}
     */
    get type() { }
}

/**
 * Describes an error when an incompatible synced Realm is opened. The old version of the Realm can be accessed in readonly mode using the configuration() member
 * @memberof Realm.Sync
 */
class IncompatibleSyncedRealmError {
    /**
     * The name of the error is 'IncompatibleSyncedRealmError'
     */
    get name() { }

    /**
     * The {Realm~Configuration} of the backed up Realm.
     * @type {Realm~Configuration}
     */
    get configuration() { }
}

/**
 * Class for creating user credentials
 * @memberof Realm
 */
class Credentials {
    /**
     * Creates credentials based on a login with an email address and a password.
     * @param {string} username The username of the user.
     * @param {string} password The user's password.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static emailPassword(email, password) { }

    /**
     * Creates credentials based on a Facebook login.
     * @param {string} token A Facebook authentication token, obtained by logging into Facebook..
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static facebook(token) { }

    /**
     * Creates credentials based on a Google login.
     * @param {string} token A Google authentication token, obtained by logging into Google.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static google(token) { }

    /**
     * Creates credentials for an anonymous user. These can only be used once - using them a second
     * time will result in a different user being logged in. If you need to get a user that has already logged
     * in with the Anonymous credentials, use {@linkcode Realm.App.currentUser} or {@linkcode Realm.App.allUsers}
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static anonymous() { }

    /**
     * Creates credentials with a custom provider and user identifier.
     * @param {string} token A string identifying the user. Usually an identity token or a username.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static custom(token) { }

    /**
     * Creates credentials with a MongoDB Realm function and user identifier.
     * @param {string} token A string identifying the user. Usually an identity token or a username.
     * @return {Promise<Credentials>} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static function(token) { }

    /**
     * Creates credentials from a user API key.
     * @param {string} key A string identifying the user by API key.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static userAPIKey(token) { }

    /**
     * Creates credentials from a server API key.
     * @param {string} key A string identifying the user by API key.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static serverAPIKey(token) { }

    /**
     * Creates credentials based on an Apple login.
     * @param {string} token An Apple authentication token, obtained by logging into Apple.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static apple(token) { }

    /**
     * Gets the identity provider for the credentials.
     * @returns {string} The identity provider, such as Google, Facebook, etc.
     */
    get provider() { }
}

/**
 * A namespace for auth providers
 * @see Realm.Auth.EmailPassword
 * @see Realm.Auth.UserAPIKey
 * @memberof Realm
 */
class Auth {
}


/**
 * Class for managing email/password for users
 * @memberof Realm.Auth
 */
class EmailPassword {

    /**
     * Registers a new email identity with the username/password provider,
     * and sends a confirmation email to the provided address.
     *
     * @param {string} email - The email address of the user to register.
     * @param {string} password  - The password that the user created for the new username/password identity.
     * @returns {Promise<void>}
     */
    registerEmail(email, password) { }

    /**
     * Confirms an email identity with the username/password provider.
     *
     * @param {string} token - The confirmation token that was emailed to the user.
     * @param {string} id - The confirmation token id that was emailed to the user.
     * @returns {Promise<void>}
     */
    confirmUser(token, id) { }

    /**
     * Re-sends a confirmation email to a user that has registered but
     * not yet confirmed their email address.
     *
     * @param {string} email - The email address of the user to re-send a confirmation for.
     * @returns {Promise<void>}
     */
    resendConfirmationEmail(email) { }

    /**
     * Sends an email to the user for resetting the password.
     * @param {string} email - The email address of the user to re-send a confirmation for.
     * @returns {Promise<void>}
     */
    sendResetPasswordEmail(email) { }

    /**
     * Resets the password of an email identity using the password reset token emailed to a user.
     * @param {string} password - The desired new password.
     * @param {string} token - The password reset token that was emailed to the user.
     * @param {string} id - The password reset token id that was emailed to the user.
     * @returns {Promise<void>}
     */
    resetPassword(password, token, id) { }
}

/**
 * A client for the user API key authentication provider which
 * can be used to create and modify user API keys. This
 * client should only be used by an authenticated user.
 * @memberof Realm.Auth
 */
class APIKeys {

    /**
     * Creates a user API key that can be used to authenticate as the current user.
     *
     * @param {string} name - The name of the API key to be created.
     * @returns {Promise<void>}
     */
    createAPIKey(name) { }

    /**
     * Fetches a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to fetch.
     * @returns {Promise<Object>}
     */
    fetchAPIKey(id) { }

    /**
     * Fetches the user API keys associated with the current user.
     *
     * @returns {Promise<Array>}
     */
    allAPIKeys() { }

    /**
     * Deletes a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to delete.
     * @returns {Promise<void>}
     */
    deleteAPIKey(id) { }

    /**
     * Enables a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to enable.
     * @returns {Promise<void>}
     */
    enableAPIKey(id) { }

    /**
     * Disables a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to disable.
     * @returns {Promise<void>}
     */
    disableAPIKey(id) { }
}


/**
 * Class for managing users.
 * @memberof Realm
 */
class User {
    /**
     * Gets the identity of this user on MongoDB Realm Cloud.
     * The identity is a guaranteed to be unique among all users on MongoDB Realm Cloud .
     * @type {string}
     */
    get identity() { }

    /**
     * Gets this user's refresh token. This is the user's credential for accessing the MongoDB
     * Realm Cloud and should be treated as sensitive data.
     * @type {string}
     */
    get token() { }

    /**
     * Gets this user's associated custom data. This is application-specific data provided by the server.
     * @type {object?}
     */
    get customData() { }

    /**
     * Is true if the user is logged in. False otherwise.
     * @type {boolean}
     */
    get isLoggedIn() { }

    /**
     * Gets the user's state which can be one of the following:
     *  - `LoggedOut` - the user is logged out
     *  - `LoggedIn` - the user is logged in
     *  - `Removed`  - the user has been removed
     * @type {string}
     */
    get state() { }

    /**
     * Gets the user's profile (name, email address, etc.).
     * @type {object}
     */
    get profile() { }

    /**
     * Logs out the user.
     */
    logOut() { }

    /**
     * Links a user to another credentials. This is useful when linking
     * different account togteher.
     * @param {Realm.Credentials} credentials
     * @returns {Promise<Realm.User>} - updated user object
     */
    linkCredentials(credentials) { }


    /**
     * Refresh user's custom data.
     * @returns {Promise<Object>}
     * @see {Realm.User.customData}
     */
    refreshCustomData() { }

    /**
     * Returns a provider to interact with API keys.
     * @return {Realm.Auth.APIKeys} - the provider
     */
    apiKeys() { }

    /**
     * Calls the named server function as this user.
     * @param {string} name - name of the function to call
     * @param {any[]} args - list of arguments to pass
     */
    callFunction(name, args) { }

    /**
     * Convenience wrapper around `call_function(name, [args])`
     *
     * @example
     * // These are all equivalent:
     * await user.call_function("do_thing", [a1, a2, a3]);
     * await user.functions.do_thing(a1, a2, a3);
     * await user.functions["do_thing"](a1, a2, a3);
     *
     * @example
     * // It it legal to store the functions as first-class values:
     * const do_thing = user.functions.do_thing;
     * await do_thing(a1);
     * await do_thing(a2);
     */
    get functions() { }
}

/**
 * An object encapsulating a MongoDB Realm Cloud session. Sessions represent the communication between the
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
    get config() { }

    /**
     * Gets the User that this session was created with.
     * @type {User}
     */
    get user() { }

    /**
     * Gets the URL of the Realm Object Server that this session is connected to.
     * @type {string}
     */
    get url() { }

    /**
     * Gets the current state of the session.
     * Can be either:
     *  - "active": The session is connected to the Realm Object Server and is actively transferring data.
     *  - "inactive": The session is not currently communicating with the Realm Object Server.
     *  - "invalid": A non-recoverable error has occurred, and this session is semantically invalid. A new session should be created.
     * @type {string}
     */
    get state() { }

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
    addProgressNotification(direction, mode, progressCallback) { }

    /** Unregister a progress notification callback that was previously registered with addProgressNotification.
     * Calling the function multiple times with the same callback is ignored.
    * @param {callback(transferred, transferable)} callback - a previously registered progress callback
    */
    removeProgressNotification(progressCallback) { }

    /**
     * Registers a connection notification on the session object. This will be notified about changes to the
     * underlying connection to the Realm Object Server.
     *
     * @param {callback(newState, oldState)} callback - called with the following arguments:
     *   - `newState` - the new state of the connection
     *   - `oldState` - the state the connection transitioned from.
     */
    addConnectionNotification(connectionCallback) { }

    /**
     * Unregister a state notification callback that was previously registered with addStateNotification.
     * Calling the function multiple times with the same callback is ignored.
     *
     * @param {callback(oldState, newState)} callback - a previously registered state callback.
     */
    removeConnectionNotification(connectionCallback) { }

    /**
     * Gets the current state of the connection to the server. Multiple sessions might share the same underlying
     * connection. In that case, any connection change is sent to all sessions.
     *
     * Can be either:
     *  - Realm.Sync.ConnectionState.Disconnected: No connection to the server is available.
     *  - Realm.Sync.ConnectionState.Connecting: An attempt to connect to the server is in progress.
     *  - Realm.Sync.ConnectionState.Connected: The connection to the server is active and data can be synchronized.
     *
     * Data will only be synchronized with the Realm ObjectServer if this method returns `Connected` and `state()`
     * returns `Active` or `Dying`.
     *
     * @type {string}
     */
    connectionState() { }

    /**
     * Returns `true` if the session is currently active and connected to the server, `false` if not.
     *
     * @type {boolean}
     */
    isConnected() { }

    /**
     * Resumes a sync session that has been paused.
     *
     * This method is asynchronous so in order to know when the session has started you will need
     * to add a connection notification with `addConnectionNotification`.
     *
     * This method is idempotent so it will be a no-op if the session is already started.
     */
    resume() { }

    /**
     * Pause a sync session.
     *
     * This method is asynchronous so in order to know when the session has started you will need
     * to add a connection notification with `addConnectionNotification`.
     *
     * This method is idempotent so it will be a no-op if the session is already paused.
     */
    pause() { }

    /**
     * This method returns a promise that does not resolve successfully until all known local changes have been uploaded
     * to the server or the specified timeout is hit in which case it will be rejected. If the method times out, the upload
     * will still continue in the background.
     *
     * This method cannot be called before the Realm has been opened.
     *
     * @param timeout maximum amount of time to wait in milliseconds before the promise is rejected. If no timeout
     * is specified the method will wait forever.
     */
    uploadAllLocalChanges(timeoutMs) { }

    /**
     * This method returns a promise that does not resolve successfully until all known remote changes have been
     * downloaded and applied to the Realm or the specified timeout is hit in which case it will be rejected. If the method
     * times out, the download will still continue in the background.
     *
     * This method cannot be called before the Realm has been opened.
     *
     * @param timeout maximum amount of time to wait in milliseconds before the promise will be rejected. If no timeout
     * is specified the method will wait forever.
     */
    downloadAllServerChanges(timeoutMs) { }
}

/**
 * A Realm Worker can be used to process Sync events in multiple automatically-managed child processes.
 *
 * Similar to Web Workers, a Worker is initialized by passing it the name of a module which should be loaded in the new process.
 * The module should export a function for each even type it wishes to handle, which will be called when that event is emitted.
 *
 * Currently supported events:
 *
 *  * `'available'`: Emitted whenever there is a new Realm which has a virtual
 *    path matching the filter regex, either due to the Realm being newly created
 *    or the listener being added. The virtual path (i.e. the portion of the
 *    URL after the protocol and hostname) is passed as an argument.
 *  * `'change'`: Emitted whenever the data within a Realm matching the filter
 *    regex has changed. A [ChangeEvent]{@link Realm.Sync.ChangeEvent} argument
 *    is passed containing information about which Realm changed and what
 *    objects within the Realm changed.
 *  * `'delete'`: Emitted whenever a Realm matching the filter regex has been
 *    deleted from the server. The virtual path of the Realm being deleted is
 *    passed as an argument.
 *
 * Worker automatically spawns child processes as needed to handle events in
 * parallel (up to the limit specified in the `options` parameter). Events for
 * each specific Realm will be processes in serial in the order in which the
 * events occurred, but may not all be processed in the same child.
 *
 * @example
 * // my-worker.js
 * function onavailable(path) {
 *    console.log(`Realm available at ${path}`);
 * }
 *
 * function onchange(change) {
 *    console.log(`Realm at ${change.path} changed`);
 * }
 *
 * function ondelete(path) {
 *    console.log(`Realm at ${path} deleted`);
 * }
 *
 * module.exports = {onchange, oncavailable, ondelete};
 *
 * // server script
 * Realm.Sync.addListener(realmServerURL, adminUser, '.*', new Realm.Worker('my-worker'));
 *
 * @memberof Realm
 */
class Worker {
    /**
     * Create a new Worker which executes the given module.
     *
     * @param {string} moduleName - The module to load in the worker process.
     * @param {object} [options] - An object containing option properties to configure the worker.
     * Available properties are as follows:
     *
     * * `maxWorkers`: The maximum number of child processes to spawn. Defaults to `os.cpus().length`.
     * * `env`: An object containing environment variables to set for the child process.
     * * `execArgv`: Command-line arguments to pass to the `node` worker processes.
     */
    constructor(moduleName, options = {}) { }
}
