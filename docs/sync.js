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
 * @typedef {Object} Realm.App.Sync~SyncConfiguration
 * @property {Realm.User} user - A {@link Realm.User} object obtained by calling `Realm.App.logIn`.
 * @property {string|number|BSON.ObjectId|null} partitionValue - The value of the partition key.
 * @property {callback(session, syncError)} [error] - A callback function which is called in error situations.
 *    The callback is passed two arguments: `session` and `syncError`. If `syncError.name == "ClientReset"`, `syncError.path` and `syncError.config` are set
 *    and `syncError.readOnly` is true. Otherwise, `syncError` can have up to five properties:
 *    `name`, `message`, `isFatal`, `category`, and `code`.
 * @property {Object} [customHttpHeaders] - A map (string, string) of custom HTTP headers.
 * @property {Realm.App.Sync~OpenRealmBehaviorConfiguration} [newRealmFileBehavior] - Whether to create a new file and sync in background or wait for the file to be synced.
       If not set, the Realm will be downloaded before opened.
 * @property {Realm.App.Sync~OpenRealmBehaviorConfiguration} [existingRealmFileBehavior] - Whether to open existing file and sync in background or wait for the sync of the
 *    file to complete and then open. If not set, the Realm will be downloaded before opened.
 */

/**
 * Specify how to open a synced Realm.
 *
 * @typedef {Object} Realm.App.Sync~OpenRealmBehaviorConfiguration
 * @property {string} type - how to open a Realm - 'downloadBeforeOpen' to wait for download to complete or 'openImmediately' to open the local Realm
 * @property {number} [timeOut] - how long to wait for a download (in ms). Default: infinity
 * @property {string} [timeOutBehavior] - what to do when download times out - 'openLocalRealm' to open the local Realm or 'throwException' to throw an exception.
 * @see {@link Realm.App.Sync~openLocalRealmBehavior}
 * @see {@link Realm.App.Sync~downloadBeforeOpenBehavior}
 */

/**
 * The default behavior settings if you want to open a synchronized Realm immediately and start working on it.
 * If this is the first time you open the Realm, it will be empty while the server data is being downloaded
 * in the background.
 *
 * @typedef {Realm.App.Sync~OpenRealmBehaviorConfiguration} Realm.App.Sync~openLocalRealmBehavior
 */

/**
 * The default behavior settings if you want to wait for downloading a synchronized Realm to complete before opening it.
 *
 * @typedef {Realm.App.Sync~OpenRealmBehaviorConfiguration} Realm.App.Sync~downloadBeforeOpenBehavior
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
     * @param {(Realm.App~AppConfiguration|string)} configOrId - The configuration of the app or a string app id.
     * @throws If no app id is provided.
     */
    constructor(configOrId) { }

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
    get currentUser() { }

    /**
     * Returns a dictionary of alll users. Users' identity is used as key.
     *
     * @returns {Array}
     */
    get allUsers() { }

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
     * Client for the email/password authentication provider.
     *
     * @example
     * {
     * // Creating a new user, by registering via email & password
     * const app = new Realm.App(config);
     * await app.emailPasswordAuth.registerUser('john@example.com', 'some-secure-password');
     * }
     *
     * @type {Realm.Auth.EmailPasswordAuth}
     */
    get emailPasswordAuth() { }

    /**
     * Returns an instance of an app. If an app with the specified id
     * hasn't been created, a new app instance will be created.
     *
     * @param {string} appId
     * @returns {Realm.App}
     * @since v10.0.0
     */
    getApp(appId) { }
 }


/**
 *
 * Class for interacting with MongoDB Realm Cloud.
 *
 * @memberof Realm.App
 */

class Sync {

    /**
     * Calling this method will force Realm to attempt to reconnect the Realm App to the server immediately.
     *
     * Realm will reconnect automatically, but by using exponential backoff. This means that if the device is offline for
     * a long time, restoring the connection after it comes back online can take longer than expected. In situations
     * where it is possible to detect the network condition (e.g. Airplane mode). Manually calling this method can
     * provide a smoother user experience.
     *
     * @param {Realm.App} app - The Realm app.
     */
    static reconnect(app) { }

    /**
     * Set the sync log level. You can only set the log level once, and you must do it after creating an App instance
     * but before opening any Realms.
     *
     * @param {Realm.App} app - The Realm app.
     * @param {Realm.App.Sync~LogLevel} level - The new log level.
     * @example
     * {
     * const app = new Realm.App(getAppConfig());
     * Realm.App.Sync.setLogLevel(app, "all");
     * const user = await app.logIn(credentials);
     * const realm = await Realm.open(getRealmConfig(user));
     * }
     */
    static setLogLevel(app, level) { }

    /**
     * Enable multiplexing multiple sync sessions over a single connection for a Realm app.
     * When having a lot of synchronized realms open the system might run out of file
     * descriptors because of all the open sockets to the server. Session multiplexing
     * is designed to alleviate that, but it might not work with a server configured with
     * fail-over. Only use if you're seeing errors about reaching the file descriptor limit
     * and you know you are using many sync sessions.
     * @param {Realm.App} app - The Realm app.
     */
    static enableSessionMultiplexing(app) { }

    /**
     * A callback passed to `Realm.App.Sync.setLogger` when instrumenting the MongoDB Realm Cloud client with a custom logger.
     * @callback Realm.App.Sync~logCallback
     * @param {number} level The level of the log entry between 0 and 8 inclusively.
     * Use this as an index into `['all', 'trace', 'debug', 'detail', 'info', 'warn', 'error', 'fatal', 'off']` to get the name of the level.
     * @param {string} message The message of the log entry.
     */

    /**
     * Capture the sync client's log. You can only set the log level once, and you must do it after creating an App instance
     * but before opening any Realms.
     *
     * @param {Realm.App} app - the Realm app.
     * @param {Realm.App.Sync~logCallback} logger - The log callback.
     * @example
     * {
     * const app = new Realm.App(getAppConfig());
     * Realm.App.Sync.setLogger(app, (level, message) => console.log(`[${level}] ${message}`));
     * const user = await app.logIn(credentials);
     * const realm = await Realm.open(getRealmConfig(user));
     * }
     * @see {Realm.App.Sync~setLogLevel}
     */
    static setLogger(app, logger) { }

    /**
     * Set the application part of the User-Agent string that will be sent to the Realm Object Server when a session
     * is created.
     *
     * This method can only be called up to the point where the first Realm is opened. After that, the User-Agent
     * can no longer be changed.
     * @param {Realm.App} the Realm app
     * @param {string} the user agent description
     */
    static setUserAgent(app, userAgent) { }

    /**
     * Initiate a client reset. The Realm must be closed prior to the reset.
     *
     * A synced Realm may need to be reset if the communications with the MongoDB Realm Server
     * indicate an unrecoverable error that prevents continuing with normal synchronization. The
     * most common reason for this is if a client has been disconnected for too long.
     *
     * The local copy of the Realm is moved into a recovery directory
     * for safekeeping.
     *
     * Local writes that were not successfully synchronized to the MongoDB Realm server
     * will be present in the local recovery copy of the Realm file. The re-downloaded Realm will
     * initially contain only the data present at the time the Realm was synchronized up on the server.
     *
     * @param {Realm.App} [app] - The app where the Realm was opened.
     * @param {string} [path] - The path to the Realm to reset.
     * Throws error if reset is not possible.
     * @example
     * {
     *   const config = {
     *     // schema, etc.
     *     sync: {
     *       user,
     *       partitionValue,
     *       error: (session, error) => {
     *         if (error.name === 'ClientReset') {
     *           let path = realm.path; // realm.path will no be accessible after realm.close()
     *           realm.close();
     *           Realm.App.Sync.initiateClientReset(app, path);
     *           // - open Realm at `error.config.path` (oldRealm)
     *           // - open Realm with `config` (newRealm)
     *           // - copy required objects from oldRealm to newRealm
     *           // - close both Realms
     *         }
     *       }
     *     }
     *   };
     * }
     */
    static initiateClientReset(app, path) { }

    /**
     * Returns `true` if Realm still has a reference to any sync sessions regardless of their state.
     * If `false` is returned it means that no sessions currently exist.
     * @param {Realm.App} [app] - The app where the Realm was opened.
     */
    static _hasExistingSessions(app) { }

    /**
     * Returns all sync sessions for a user.
     *
     * @param {Realm.User} user  - the user.
     * @returns {Array<Realm.App.Sync.Session>} an array of sessions
     * @since 10.0.0
     */
    static getAllSyncSessions(user) { }

    /**
     * Returns the session associated with a user and partition value.
     *
     * @param {Realm.User} user
     * @param {string|number|ObjectId|null} partitionValue
     * @returns {Realm.App.Sync.Session} the session
     * @since 10.0.0
     */
    static getSyncSession(user, partitionValue) { }
}

/**
 * @typedef Realm.App.Sync~LogLevel
 * @type {("all"|"trace"|"debug"|"detail"|"info"|"warn"|"error"|"fatal"|"off")}
 */

/**
 * Class that describes authentication errors in the Realm Object Server
 * @memberof Realm.App.Sync
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
 * @memberof Realm.App.Sync
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
     * @param {string} token A Facebook authentication token, obtained by logging into Facebook.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static facebook(token) { }

    /**
     * Creates credentials based on a Google login.
     * @param {string} authCode A Google authentication code, obtained by logging into Google.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     * @deprecated
     */
    static google(authCode) { }

    /**
     * Creates credentials based on a Google login.
     * @param {object} An object with either an `authCode` or `idToken` property.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static google(authObject) { }

    /**
     * Creates credentials for an anonymous user. These can only be used once - using them a second
     * time will result in a different user being logged in. If you need to get a user that has already logged
     * in with the Anonymous credentials, use {@linkcode Realm.App.currentUser} or {@linkcode Realm.App.allUsers}
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static anonymous() { }

    /**
     * Creates credentials with a JSON Web Token (JWT) provider and user identifier.
     * @param {string} token A string identifying the user. Usually an identity token or a username.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static jwt(token) { }

    /**
     * Creates credentials with a MongoDB Realm function and user identifier.
     * @param {string} payload A string identifying the user. Usually an identity token or a username.
     * @return {Promise<Credentials>} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static function(payload) { }

    /**
     * Creates credentials from a user API key.
     * @param {string} key A string identifying the user by API key.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static userApiKey(token) { }

    /**
     * Creates credentials from a server API key.
     * @param {string} key A string identifying the user by API key.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static serverApiKey(token) { }

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

    /**
     * @returns {object} A simple object which can be passed to the server as the body of a request to authenticate.
     */
    get payload() { }
}

/**
 * A namespace for auth providers
 * @see Realm.Auth.EmailPasswordAuth
 * @see Realm.Auth.ApiKeyAuth
 * @memberof Realm
 */
class Auth {
}


/**
 * Class for managing email/password for users
 * @memberof Realm.Auth
 */
class EmailPasswordAuth {

    /**
     * Registers a new email identity with the email/password provider,
     * and sends a confirmation email to the provided address.
     *
     * @param {string} email - The email address of the user to register.
     * @param {string} password  - The password that the user created for the new username/password identity.
     * @returns {Promise<void>}
     */
    registerUser(email, password) { }

    /**
     * Confirms an email identity with the email/password provider.
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

    /**
     * Resets the password of an email identity using the
     * password reset function set up in the application.
     *
     * @param {string} email - The email address of the user.
     * @param {string} password - The desired new password.
     * @param {Array<BSON>} args - Arguments passed onto the function.
     * @return {Promose<void>}
     */
    callResetPasswordFunction(email, password, ...args) { }
}

/**
 * A client for the user API key authentication provider which
 * can be used to create and modify user API keys. This
 * client should only be used by an authenticated user.
 * @memberof Realm.Auth
 */
class ApiKeyAuth {

    /**
     * Creates a user API key that can be used to authenticate as the current user.
     *
     * @param {string} name - The name of the API key to be created.
     * @returns {Promise<void>}
     */
    create(name) { }

    /**
     * Fetches a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to fetch.
     * @returns {Promise<Object>}
     */
    fetch(id) { }

    /**
     * Fetches the user API keys associated with the current user.
     *
     * @returns {Promise<Array>}
     */
    fetchAll() { }

    /**
     * Deletes a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to delete.
     * @returns {Promise<void>}
     */
    delete(id) { }

    /**
     * Enables a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to enable.
     * @returns {Promise<void>}
     */
    enable(id) { }

    /**
     * Disables a user API key associated with the current user.
     *
     * @param {string} id - The id of the API key to disable.
     * @returns {Promise<void>}
     */
    disable(id) { }
}

/**
 * The type of an authentication provider, used to authenticate a user.
 * @typedef Realm.App.Sync~ProviderType
 * @type {("anon-user"|"api-key"|"local-userpass"|"custom-function"|"custom-token"|"oauth2-google"|"oauth2-facebook"|"oauth2-apple")}
 */

/**
 * The identity of a user with a specific authentication provider.
 * NOTE: A particular user might have identities with multiple providers.
 * @memberof Realm.App.Sync
 */
class UserIdentity {
    /**
     * The id of a users identity at an authentication provider.
     * @type {string}
     */
    get id() { }

    /**
     * The type of the authentication provider.
     * @type {Realm.App.Sync~ProviderType}
     */
    get providerType() { }
}


/**
 * Class for managing users.
 * @memberof Realm
 */
class User {
    /**
     * Gets the id of this user on MongoDB Realm Cloud.
     * The id is a guaranteed to be unique among all users on MongoDB Realm Cloud .
     * @type {string}
     */
    get id() { }

    /**
     * Gets an array of identities for this user.
     * @type {Array<Realm.App.Sync.UserIdentity>}
     */
    get identities() { }

    /**
     * Gets the provider type for the identity.
     * @type {Realm.App.Sync~ProviderType}
     */
    get providerType() { }

    /**
     * Gets the device id. `null` if no device id.
     * @type {string}
     */
    get deviceId() { }

    /**
     * Gets this user's access token. This is the user's credential for accessing the MongoDB
     * Realm Cloud and should be treated as sensitive data.
     * @type {string}
     */
    get accessToken() { }

    /**
     * Gets this user's refresh token. This is the user's credential for accessing the MongoDB
     * Realm Cloud and should be treated as sensitive data.
     * @type {string}
     */
    get refreshToken() { }

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
     * @returns {Promise<void>} - resolves when the user has been logged out
     */
    logOut() { }

    /**
     * Links a user to another credentials. This is useful when linking
     * different account togteher.
     * @param {Realm.Credentials} credentials
     * @returns {Promise<void>} - resolves when the user has been linked with the other credentials.
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
     * @return {Realm.Auth.ApiKeyAuth} - the provider
     */
    apiKeys() { }

    /**
     * Calls the named server function as this user.
     * @param {string} name - name of the function to call
     * @param {any[]} args - list of arguments to pass
     * @return {Promise<any>} - resolves when the function terminates.
     */
    callFunction(name, args) { }

    /**
     * Convenience wrapper around `callFunction(name, [args])`
     *
     * @example
     * // These are all equivalent:
     * await user.callFunction("do_thing", [a1, a2, a3]);
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

    /**
     * Returns a connection to the MongoDB service.
     *
     * @example
     * let blueWidgets = user.mongoClient('myClusterName')
     *                       .db('myDb')
     *                       .collection('widgets')
     *                       .find({color: 'blue'});
     *
     * @param {string} serviceName
     * @returns {Realm~MongoDB}
     */
    mongoClient(serviceName) { }

    /**
     * @class Realm.User~Push Access to the operations of the push service.
     */

    /**
     * Registers the provided token with this User's device.
     *
     * @function Realm.User~Push#register
     * @param {string} token
     * @returns {Promise<void>} completed when the user is registered, or the operation fails.
     */

    /**
     * Deregisters this User's device.
     *
     * @function Realm.User~Push#deregister
     * @returns {Promise<void>} completed when the user is deregistered, or the operation fails.
     */

    /**
     * Access the operations of the push service.
     *
     * @param {string} serviceName
     * @returns {Realm.User~Push}
     */
    push(serviceName) { }
}

/**
 * An object encapsulating a MongoDB Realm Cloud session. Sessions represent the communication between the
 * client (and a local Realm file on disk), and the server (and a remote Realm at a given URL stored on a Realm Object Server).
 * Sessions are always created by the SDK and vended out through various APIs. The lifespans of sessions
 * associated with Realms are managed automatically.
 * @memberof Realm.App.Sync
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
     *  - Realm.App.Sync.ConnectionState.Disconnected: No connection to the server is available.
     *  - Realm.App.Sync.ConnectionState.Connecting: An attempt to connect to the server is in progress.
     *  - Realm.App.Sync.ConnectionState.Connected: The connection to the server is active and data can be synchronized.
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
 *    regex has changed. A [ChangeEvent]{@link Realm.App.Sync.ChangeEvent} argument
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
 * Realm.App.Sync.addListener(realmServerURL, adminUser, '.*', new Realm.Worker('my-worker'));
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



/**
 * The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.
 * @alias Realm~MongoDB
 */
class MongoDB {
    /**
     * Get the service name.
     * @return {string} The service name.
     */
    get serviceName() { }

    /**
     * Get the interface to a remote MongoDB database.
     *
     * @param {string} databaseName The name of the database.
     * @returns {Realm~MongoDBDatabase} The remote MongoDB database.
     */
    db(databaseName) { }
}

/**
 * The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.
 * @alias Realm~MongoDBDatabase
 */
class MongoDBDatabase {
    /**
     * Get the database name.
     * @return {string} The database name.
     */
    get name() { }

    /**
     * Get the interface to a remote MongoDB collection.
     *
     * @param {string} name The name of the collection.
     * @returns {Realm.MongoDBCollection} The remote MongoDB collection.
     */
    collection(name) { }
}

/**
 * A remote collection of documents in a MongoDB database.
 * @memberof Realm
 */
class MongoDBCollection {
    /**
     * Gets the name of the collection.
     * @return {string} The name.
     */
    get name() { }

    /**
     * Finds the documents which match the provided query.
     *
     * @param {object} [filter] An optional filter applied to narrow down the results.
     * @param {object} [options] Additional options to apply.
     * @param {object} [options.projection] Limits the fields to return for all matching documents.
     * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
     * @param {object} [options.sort] The order in which to return matching documents.
     * @param {number} [options.limit] The maximum number of documents to return.
     * @returns {Promise<object[]>} The documents.
     */
    async find(filter, options) { }

    /**
     * Finds a document which matches the provided filter.
     *
     * @param {object} [filter] An optional filter applied to narrow down the results.
     * @param {object} [options] Additional options to apply.
     * @param {object} [options.projection] Limits the fields to return for all matching documents.
     * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
     * @param {object} [options.sort] The order in which to return matching documents.
     * @returns {Promise<object>} The document or null if nothing matched.
     */
    async findOne(filter, options) { }

    /**
     * Finds a document which matches the provided query and performs the desired update to individual fields.
     *
     * @param {object} filter A filter applied to narrow down the results.
     * @param {object} update The new values for the document.
     * @param {object} [options] Additional options to apply.
     * @param {object} [options.projection] Limits the fields to return for all matching documents.
     * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
     * @param {object} [options.sort] The order in which to return matching documents.
     * @param {boolean} [options.upsert=false] if true, indicates that MongoDB should insert a new document that matches the
     * query filter when the query does not match any existing documents in the collection.
     * @param {boolean} [options.returnNewDocument=false] if true, indicates that the action should return
     * the document in its updated form instead of its original, pre-update form.
     * @returns {Promise<?object>} The document (before or after modification) or null if nothing matched.
     */
    async findOneAndUpdate(filter, update, options) { }

    /**
     * Finds a document which matches the provided filter and replaces it with a new document.
     *
     * @param {object} filter A filter applied to narrow down the results.
     * @param {object} replacement The new values for the document.
     * @param {object} [options] Additional options to apply.
     * @param {object} [options.projection] Limits the fields to return for all matching documents.
     * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
     * @param {object} [options.sort] The order in which to return matching documents.
     * @param {boolean} [options.upsert=false] if true, indicates that MongoDB should insert a new document that matches the
     * query filter when the query does not match any existing documents in the collection.
     * @param {boolean} [options.returnNewDocument=false] if true, indicates that the action should return
     * the document in its updated form instead of its original, pre-update form.
     * @returns {Promise<?object>} The document (before or after modification) or null if nothing matched.
     */
    async findOneAndReplace(filter, replacement, options) { }

    /**
     * Finds a document which matches the provided filter and deletes it
     *
     * @param {object} filter A filter applied to narrow down the results.
     * @param {object} [options] Additional options to apply.
     * @param {object} [options.projection] Limits the fields to return for all matching documents.
     * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
     * @param {object} [options.sort] The order in which to return matching documents.
     * @returns {Promise<object>} The document or null if nothing matched.
     */
    async findOneAndDelete(filter, options) { }

    /**
     * Runs an aggregation framework pipeline against this collection.
     *
     * @param {object[]} pipeline An array of aggregation pipeline stages.
     * @returns {Promise<object[]>} The result.
     */
    async aggregate(pipeline) { }

    /**
     * Counts the number of documents in this collection matching the provided filter.
     *
     * @param {object} [filter] An optional filter applied to narrow down the results.
     * @param {object} [options] Additional options to apply.
     * @param {number} [options.limit] The maximum number of documents to return.
     * @returns {Promise<number>}
     */
    async count(filter, options) { }

    /**
     * @typedef Realm.MongoDBCollection~InsertOneResult Result of inserting a document
     * @property insertedId The id of the inserted document
     */

    /**
     * Inserts a single document into the collection.
     * Note: If the document is missing an _id, one will be generated for it by the server.
     *
     * @param {object} document The document.
     * @returns {Promise<Realm.MongoDBCollection~InsertOneResult>} The _id of the inserted document.
     */
    async insertOne(document) { }

    /**
     * @typedef Realm.MongoDBCollection~InsertManyResult Result of inserting many documents
     * @property {Array} insertedIds The ids of the inserted documents
     */

    /**
     * Inserts an array of documents into the collection.
     * If any values are missing identifiers, they will be generated by the server.
     *
     * @param {object[]} documents The array of documents.
     * @returns {Promise<Realm.MongoDBCollection~InsertManyResult>} The _ids of the inserted documents.
     */
    async insertMany(documents) { }

    /**
     * @typedef {object} Realm.MongoDBCollection~DeleteResult Result of deleting documents
     * @property {number} deletedCount The number of documents that were deleted.
     */

    /**
     * Deletes a single matching document from the collection.
     *
     * @param {object} filter A filter applied to narrow down the result.
     * @returns {Promise<Realm.MongoDBCollection~DeleteResult>}
     */
    async deleteOne(filter) { }

    /**
     * Deletes multiple documents.
     *
     * @param {object} filter A filter applied to narrow down the result.
     * @returns {Promise<Realm.MongoDBCollection~DeleteResult>}
     */
    async deleteMany(filter) { }

    /**
     * @typedef {object} Realm.MongoDBCollection~UpdateResult Result of updating documents
     * @property {number} matchedCount The number of documents that matched the filter.
     * @property {number} modifedCount The number of documents matched by the query.
     * @property [upsertedId] The identifier of the inserted document if an upsert took place.
     */

    /**
     * Updates a single document matching the provided filter in this collection.
     *
     * @param {object} filter A filter applied to narrow down the results.
     * @param {object} update The new values for the document.
     * @param {object} [options] Additional options to apply.
     * @param {boolean} [options.upsert=false] if true, indicates that MongoDB should insert a new document that matches the
     * query filter when the query does not match any existing documents in the collection.
     * @returns {Promise<Realm.MongoDBCollection~UpdateResult>}
     */
    async updateOne(filter, update, options) { }

    /**
     * Updates multiple documents matching the provided filter in this collection.
     *
     * @param {object} filter A filter applied to narrow down the results.
     * @param {object} update The new values for the document.
     * @param {object} [options] Additional options to apply.
     * @param {boolean} [options.upsert=false] if true, indicates that MongoDB should insert a new document that matches the
     * query filter when the query does not match any existing documents in the collection.
     * @returns {Promise<Realm.MongoDBCollection~UpdateResult>}
     */
    async updateMany(filter, update, options) { }

    /**
     * @typedef {object} Realm.MongoDBCollection~ChangeEvent An event in a change stream.
     *
     * Note that which properties are present will depend on both the
     * `operationType` field, which is itself always present, and the MongoDB
     * server version.
     *
     * @see https://docs.mongodb.com/manual/reference/change-events/
     * @property _id The opaque resume token for this event.
     * @property {string} operationType What kind of operation was this? One of:
     * `"insert"`, `"delete"`, `"replace"`, `"update"`, `"drop"`, `"rename"`, `"dropDatabase"`, or `"invalidate"`.
     * @property {object} fullDocument A full copy of the document that was touched by this operation.
     * See the mongodb reference manual for details about which version of the document will be returned.
     * @property {object} ns Namespace of the collection affected by this event.
     * @property {string} ns.db Database name
     * @property {string} ns.coll Collection name
     * @property {object} to Destination namespace for `"rename"` events.
     * @property {string} to.db Database name
     * @property {string} to.coll Collection name
     * @property {object} documentKey The `_id` and shard key of the modified document. `_id` is not duplicated
     * if it is part of the shard key.
     * @property {object} updateDescription
     * @property {object} updateDescription.updatedFields An object mapping from modified field names to their new values.
     * @property {string[]} updateDescription.removedFields A list of field names that were removed.
     * @property {Timestamp} clusterTime The timestamp from the oplog entry associated with the event.
     * @property {Long} txnNumber The transaction number. Only present if part of a multi-document transaction.
     * @property {object} lsid The logical session id of the transaction. Only present if part of a multi-document transaction.
     */

    /**
     * Creates an asynchronous change stream to monitor this collection for changes.
     *
     * By default, yields all change events for this collection. You may specify at most one of
     * the `filter` or `ids` options.
     *
     * @param {object} [options={}]
     * @param {object} [options.filter] A filter for which change events you are interested in.
     * @param {any[]} [options.ids] A list of ids that you are interested in watching
     *
     * @yields {Realm.MongoDBCollection~ChangeEvent} a change event
     */
    async* watch(options) {}
}
