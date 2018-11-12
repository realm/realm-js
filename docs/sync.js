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
 * This describes the different options used to create a {@link Realm} instance with Realm Platform synchronization.
 * @typedef {Object} Realm.Sync~SyncConfiguration
 * @property {Realm.Sync.User} user - A {@link Realm.Sync.User} object obtained by calling `Realm.Sync.User.login`.
 * @property {string} url - A `string` which contains a valid Realm Sync url.
 * @property {function} [error] - A callback function which is called in error situations.
 *    The `error` callback can take up to five optional arguments: `name`, `message`, `isFatal`,
 *    `category`, and `code`.
 *
 * @deprecated
 * @property {boolean} [validate_ssl] - Indicating if SSL certificates must be validated.
 * @deprecated
 * @property {string} [ssl_trust_certificate_path] - A path where to find trusted SSL certificates.
 * @deprecated
 * @property {Realm.Sync~sslValidateCallback} [open_ssl_verify_callback] - A callback function used to
 * accept or reject the server's SSL certificate.
 *
 * @property {Realm.Sync~SSLConfiguration} [ssl] - SSL configuration.
 * @deprecated
 * @property {boolean} [partial] - Whether this Realm should be opened in 'query-based synchronization' mode.
 *    Query-based synchronisation only synchronizes those objects that match the query specified in contrast
 *    to the normal mode of operation that synchronises all objects in a remote Realm.
 * @property {boolean} [fullSynchronization] - Whether this Realm should be opened in query-based or full
 *    synchronization mode. The default is query-based mode which only synchronizes objects that have been subscribed to.
 *    A fully synchronized Realm will synchronize the entire Realm in the background, irrespectively of the data being
 *    used or not.
 * @property {Object} [custom_http_headers] - A map (string, string) of custom HTTP headers.
 * @property {string} [customQueryBasedSyncIdentifier] - A custom identifier to append to the Realm url rather than the default
 *    identifier which is comprised of the user id and a random string. It allows you to reuse query based Realms across
 *    different devices.
 */

/**
 * This describes the different options used to create a {@link Realm} instance with Realm Platform synchronization.
 * @typedef {Object} Realm.Sync~SSLConfiguration
 * @property {boolean} validate - Indicating if SSL certificates must be validated. Default is `true`.
 * @property {string} certificatePath - A path where to find trusted SSL certificates.
 * @property {Realm.Sync~sslValidateCallback} validateCallback - A callback function used to
 * accept or reject the server's SSL certificate.
 */

/**
 * When the sync client has received the server's certificate chain, it presents every certificate in
 * the chain to the {@link Realm.Sync~sslValidateCallback} callback.
 *
 * The return value of the callback decides whether the certificate is accepted (`true`)
 * or rejected (`false`). {@link Realm.Sync~sslValidateCallback} is only respected on platforms where
 * OpenSSL is used for the sync client, e.g. Linux. The callback is not
 * allowed to throw exceptions. If the operations needed to verify the certificate lead to an exception,
 * the exception must be caught explicitly before returning. The return value would typically be false
 * in case of an exception.
 * @callback Realm.Sync~sslValidateCallback
 * @param {Realm.Sync~SSLCertificateValidationInfo} validationInfo
 * @return {boolean}
 */

/**
 * @typedef {Object} Realm.Sync~SSLCertificateValidationInfo
 * @property {string} serverAddress
 * @property {number} serverPort
 * @property {string} pemCertificate
 * @property {boolean} acceptedByOpenSSL - `true` if OpenSSL has accepted the certificate,
 * and `false` if OpenSSL has rejected it.
 * It is generally safe to return true when `acceptedByOpenSSL` is `true`. If `acceptedByOpenSSL` is `false`,
 * an independent verification should be made.
 * @property {number} depth - Specifies the position of the certificate in the chain.
 * `depth = 0` represents the actual server certificate. The root
 * certificate has the highest depth. The certificate of highest depth will be presented first.
 */

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
     * Add a sync listener to listen to changes across multiple Realms.
     *
     * @param {string} serverUrl - The sync server to listen to.
     * @param {SyncUser} adminUser - an admin user obtained by calling {@linkcode Realm.Sync.User.login|User.login} with admin credentials.
     * @param {string} filterRegex - A regular expression used to determine which changed Realms should trigger events. Use `.*` to match all Realms.
     * @param {string} name - The name of the event.
     * @param {function(changeEvent)} changeCallback - The callback to invoke with the events.
     *
     * Registers the `changeCallback` to be called each time the given event occurs on the specified server.
     * Only events on Realms with a _virtual path_ that matches the filter regex are emitted.
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
     * Only available in the Enterprise Edition.
     */
    static addListener(serverUrl, adminUser, filterRegex, name, changeCallback) {}

    /**
     * Add a sync listener to listen to changes across multiple Realms.
     *
     * @param {string} serverUrl - The sync server to listen to.
     * @param {SyncUser} adminUser - an admin user obtained by calling {@linkcode Realm.Sync.User.login|User.login} with admin credentials.
     * @param {string} filterRegex - A regular expression used to determine which changed Realms should trigger events. Use `.*` to match all Realms.
     * @param {Realm.Worker} worker - Worker to deliver events to.
     *
     * Only available in the Enterprise Edition.
     */
    static addListener(serverUrl, adminUser, filterRegex, worker) {}

    /**
     * Remove a previously registered sync listener.
     *
     * @param {string} filterRegex - The regular expression previously used to register the listener.
     * @param {string} name - The event name.
     * @param {function(changeEvent)} changeCallback - The previously registered callback to be removed.
     */
    static removeListener(regex, name, changeCallback) {}

    /**
     * Remove a previously registered sync listener.
     *
     * @param {string} filterRegex - The regular expression previously used to register the listener.
     * @param {string} worker - The worker registered as a listener.
     * @return {Promise<void>} A promise which is resolved when the worker has finished shutting down.
     */
    static removeListener(regex, worker) {}

    /**
     * Remove all previously registered listeners.
     * @return {Promise<void>} A promise which is resolved when all workers (if any) have finished shutting down.
     */
    static removeAllListeners(name) {}

    /**
     * Set the sync log level.
     * @param {Realm.Sync~LogLevel} log_level - The new log level.
     */
    static setLogLevel(log_level) {}

    /**
     * Initiate a client reset. The Realm must be closed prior to the reset.
     *
     * @param {string} [path] - The path to the Realm to reset.
     * Throws error if reset is not possible.
     * @example
     * {
     *   const config = { sync: { user, url: 'realm://localhost:9080/~/myrealm' } };
     *   config.sync.error = (sender, error) => {
     *     if (error.name === 'ClientReset') {
     *       Realm.Sync.initiateClientReset(original_path);
     *       // copy required objects from Realm at error.config.path
     *     }
     *   }
     * }
     */
    static initiateClientReset(path) {}
}

/**
 * Change information passed when receiving sync `'change'` events.
 *
 * A ChangeEvent object can only be used within the callback which it is
 * supplied to, and cannot be stored for use later. If the callback returns a
 * promise, the ChangeEvent will remain valid until that promise is resolved
 * (and no further notifications for that same Realm will be made until it is
 * resolved). The Realms supplied by the change event do not need to be
 * explicitly closed.
 *
 * @memberof Realm.Sync
 */
class ChangeEvent {
    /**
     * The virtual path of the changed Realm. This is the portion of the URL of
     * the synced Realm after the protocol and the host name.
     * @type {string}
     */
    get path() {}

    /**
     * The changed realm, with the changes applied.
     * @type {Realm}
     */
    get realm() {}

    /**
     * The modified Realm prior to any of the changes being applied. This can
     * be used in combination with the change indices to read the old values of
     * any objects which were modified.
     *
     * @type {Realm}
     */
    get oldRealm() {}

    /**
     * The change indexes for all added, removed, and modified objects in the
     * changed Realm. This object is a hashmap of object types to arrays of
     * indexes for all changed objects:
     *
     * Note that deleting an object in Realm can cause other objects in the
     * Realm to move, which will be reported as an insertion/deletion pair. For
     * example, if there are ten objects in a Realm and the fifth is deleted,
     * the change indices will be `{insertions: [4], deletions: [4, 9]}`.
     *
     * @example
     * {
     *   MyObject: {
     *     insertions:    [indexes...],
     *     deletions:     [indexes...],
     *     modifications: [indexes...]
     *   },
     *   MyOtherObject:
     *     ...
     * }
     *
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
 * Class for creating user credentials
 * @memberof Realm.Sync
 */
class Credentials {
    /**
     * Creates credentials based on a login with a username and a password.
     * @param {string} username The username of the user.
     * @param {string} password The user's password.
     * @param {boolean} [createUser] optional - `true` if the user should be created, `false` otherwise. If
     * `true` is provided and the user exists, or `false` is provided and the user doesn't exist,
     * an error will be thrown. If not specified, if the user doesn't exist, they will be created,
     * otherwise, they'll be logged in if the password matches.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static usernamePassword(username, password, createUser) {};

    /**
     * Creates credentials based on a Facebook login.
     * @param {string} token A Facebook authentication token, obtained by logging into Facebook..
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static facebook(token) {};

    /**
     * Creates credentials based on a Google login.
     * @param {string} token A Google authentication token, obtained by logging into Google..
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static google(token) {};

    /**
     * Creates credentials for an anonymous user. These can only be used once - using them a second
     * time will result in a different user being logged in. If you need to get a user that has already logged
     * in with the Anonymous credentials, use {@linkcode Realm.Sync.User.current|User.current} or {@linkcode Realm.Sync.User.all|User.all}
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static anonymous() {};

    /**
     * Creates credentials based on a login with a nickname. If multiple users try to login
     * with the same nickname, they'll get the same underlying sync user.
     * @param {string} value The nickname of the user.
     * @param {boolean} [isAdmin] An optional parameter controlling whether the user is admin. Default is `false`.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static nickname(value, isAdmin) {};

    /**
     * Creates credentials based on an Active Directory login.
     * @param {string} token An access token, obtained by logging into Azure Active Directory.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static azureAD(token) {};

    /**
     * Creates credentials based on a JWT login.
     * @param {string} token A JSON Web Token, that will be validated against the server's configured rules.
     * @param {string} [providerName] The name of the provider as configured in the Realm Object. If not specified, the default
     * name - `jwt` - will be used.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static jwt(token, providerName) {};

    /**
     * Creates credentials based on an admin token. Using this credential will not contact the Realm Object Server.
     * @param {string} token The admin token.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static adminToken(token) {};

    /**
     * Creates credentials with a custom provider and user identifier.
     * @param {string} providerName Provider used to verify the credentials.
     * @param {string} token A string identifying the user. Usually an identity token or a username.
     * @param {userInfo} token Data describing the user further or null if the user does not have any extra data.
     * The data will be serialized to JSON, so all values must be mappable to a valid JSON data type.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.Sync.User.login|User.login}.
     */
    static custom(providerName, token, userInfo) {};


    /**
     * Gets the identity provider for the credentials.
     * @returns {string} The identity provider, such as Google, Facebook, etc.
     */
    get identityProvider() {};

    /**
     * Gets the access token.
     * @returns {string}
     */
    get token() {};

    /**
     * Gets additional user information associated with the credentials.
     * @returns {object} A dictionary, containing the additional information.
     */
    get userInfo() {};
}

/**
 * Class for managing Sync users.
 * @memberof Realm.Sync
 */
class User {
    /**
     * Logs the user in to the Realm Object Server.
     * @param {string} server The url of the server that the user is authenticated against.
     * @param {Credentials} credentials The credentials to use for authentication. Obtain them by calling one of
     * the {@linkcode Realm.Sync.Credentials|Credentials} static methods.
     * @return {Promise<User> | User} A {@linkcode Realm.Sync.User|User} object if the credentials are
     * {@linkcode Realm.Sync.Credentials.adminToken|adminToken}, {@link Realm.Sync.User|`Promise<User>`} otherwise.
     */
    static login(server, credentials) {}

    /**
     * Request a password reset email to be sent to a user's email.
     * This will not throw an exception, even if the email doesn't belong to a Realm Object Server user.
     *
     * This can only be used for users who authenticated with the 'password' provider, and passed a valid email address as a username.
     *
     * @param {string} server - authentication server
     * @param {string} email - The email that corresponds to the user's username.
     * @return {Promise<void>} A promise which is resolved when the request has been sent.
     */
    static requestPasswordReset(server, email) {}

    /**
     * Complete the password reset flow by using the reset token sent to the user's email as a one-time authorization token to change the password.
     *
     * By default, Realm Object Server will send a link to the user's email that will redirect to a webpage where they can enter their new password.
     * If you wish to provide a native UX, you may wish to modify the password authentication provider to use a custom URL with deep linking, so you can
     * open the app, extract the token, and navigate to a view that allows to change the password within the app.
     *
     * @param {string} server - authentication server
     * @param {string} resetToken - The token that was sent to the user's email address.
     * @param {string} newPassword - The user's new password.
     * @return {Promise<void>} A promise which is resolved when the request has been sent.
     */
    static completePasswordReset(server, resetToken, newPassword) {}

    /**
     * Request an email confirmation email to be sent to a user's email.
     * This will not throw an exception, even if the email doesn't belong to a Realm Object Server user.
     *
     * @param {string} server - authentication server
     * @param {string} email - The email that corresponds to the user's username.
     * @return {Promise<void>} A promise which is resolved when the request has been sent.
     */
    static requestEmailConfirmation(server, email) {}

    /**
     * Complete the email confirmation flow by using the confirmation token sent to the user's email as a one-time authorization token to confirm their email.
     *
     * By default, Realm Object Server will send a link to the user's email that will redirect to a webpage where they can enter their new password.
     * If you wish to provide a native UX, you may wish to modify the password authentication provider to use a custom URL with deep linking, so you can
     * open the app, extract the token, and navigate to a view that allows to confirm the email within the app.
     *
     * @param {string} server - authentication server
     * @param {string} confirmationToken - The token that was sent to the user's email address.
     * @return {Promise<void>} A promise which is resolved when the request has been sent.
     */
    static confirmEmail(server, confirmationToken) {}

    /**
     * Creates a new sync user instance from the serialized representation.
     * @param {object} serialized - the serialized version of the user, obtained by calling {@link User#serialize}.
     */
    static deserialize(serialized) {}

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
     * Returns true if this user is an administrator.
     * @type {bool}
     */
    get isAdmin() {}

    /**
     * Returns true if the token is an administrator token.
     */
    get isAdminToken() {}

    /**
     * Creates the configuration object required to open a synchronized Realm.
     *
     * @param {Realm.PartialConfiguration} config - optional parameters that should override any default settings.
     * @returns {Realm.Configuration} the full Realm configuration
     * @since 3.0.0
     */
    createConfiguration(config) {}

    /**
     * Serializes a user to an object, that can be persisted or passed to another component to create a new instance
     * by calling {@link User.deserialize}. The serialized user instance includes the user's refresh token and should
     * be treated as sensitive data.
     * @returns {object} an object, containing the user identity, server url, and refresh token.
     */
    serialize() {}

    /**
     * Logs out the user from the Realm Object Server. Once the Object Server has confirmed the logout the user
     * credentials will be deleted from this device.
     * @return {Promise<void>} A promise which is resolved when the user has logged out both locally and on the server.
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
     * @returns {Promise} - a promise that will be resolved with the retrieved account information as JSON object
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

    // Deprecated
    /**
     * @deprecated to be removed in future versions. Use User.login(server, Credentials.usernamePassword) instead.
     */
    static register(server, username, password) {}

    /**
     * @deprecated to be removed in future versions. Use User.login(server, Credentials.adminToken) instead.
     */
    static adminUser(adminToken, server) {}

    /**
     * @deprecated to be removed in future versions. Use User.login(server, Credentials.SOME-PROVIDER) instead.
     */
    static registerWithProvider(server, options) {}

    /**
     * @deprecated to be removed in future versions. Use User.login(server, Credentials.SOME-PROVIDER) instead.
     */
    static authenticate(server, provider, options) {}
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

    /**
     * Registers a connection notification on the session object. This will be notified about changes to the
     * underlying connection to the Realm Object Server.
     *
     * @param {callback(newState, oldState)} callback - called with the following arguments:
     *   - `newState` - the new state of the connection
     *   - `oldState` - the state the connection transitioned from.
     */
    addConnectionNotification(connectionCallback) {}

    /**
     * Unregister a state notification callback that was previously registered with addStateNotification.
     * Calling the function multiple times with the same callback is ignored.
     *
     * @param {callback(oldState, newState)} callback - a previously registered state callback.
     */
    removeConnectionNotification(connectionCallback) {}

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
    connectionState() {}

    /**
     * Returns `true` if the session is currently active and connected to the server, `false` if not.
     *
     * @type {boolean}
     */
    isConnected() {}

    /**
     * Resumes a sync session that has been paused.
     *
     * This method is asynchronous so in order to know when the session has started you will need
     * to add a connection notification with `addConnectionNotification`.
     *
     * This method is idempotent so it will be a no-op if the session is already started.
     */
    resume() {}

    /**
     * Pause a sync session.
     *
     * This method is asynchronous so in order to know when the session has started you will need
     * to add a connection notification with `addConnectionNotification`.
     *
     * This method is idempotent so it will be a no-op if the session is already paused.
     */
    pause() {}

}

/**
 * An object encapsulating query-based sync subscriptions.
 * @memberof Realm.Sync
 */
class Subscription {
    /**
     * Gets the current state of the subscription.
     * Can be either:
     *  - Realm.Sync.SubscriptionState.Error: An error occurred while creating or processing the query-based sync subscription.
     *  - Realm.Sync.SubscriptionState.Creating: The subscription is being created.
     *  - Realm.Sync.SubscriptionState.Pending: The subscription was created, but has not yet been processed by the sync server.
     *  - Realm.Sync.SubscriptionState.Complete: The subscription has been processed by the sync server and data is being synced to the device.
     *  - Realm.Sync.SubscriptionState.Invalidated: The subscription has been removed.
     * @type {number}
     */
    get state() {}

    /**
     * Gets the error message. `undefined` if no error.
     * @type {string}
     */
    get error() {}

    /**
     * Unsubscribe a query-based synced `Realm.Results`. The state will change to `Realm.Sync.SubscriptionState.Invalidated`.
     * The `Realm.Results` will not produce any meaningful values. Moreover, any objects matching the query will be
     * removed if they are not matched by any other query. The object removal is done asynchronously.
     */
    unsubscribe() {}

    /**
     * Adds a listener `callback` which will be called when the state of the subscription changes.
     * @param {function(subscription, state)} callback - A function to be called when changes to the subscription occur.
     * @throws {Error} If `callback` is not a function.
     * @example
     * let subscription = results.subscribe();
     * subscription.addListener((subscription, state) => {
     *     switch (state) {
     *     case Realm.Sync.SubscriptionState.Complete:
     *         // results is ready to be consumed
     *         break;
     *     case Realm.Sync.SubscriptionState.Error:
     *         console.log('An error occurred: ', subscription.error);
     *         break;
     *     }
     * }
     */
     addListener(callback) {}

    /**
     * Remove the listener `callback` from the subscription instance.
     * @param {function(subscription, state)} callback - Callback function that was previously
     *   added as a listener through the {@link Subscription#addListener addListener} method.
     * @throws {Error} If `callback` is not a function.
     */
    removeListener(callback) {}

    /**
     * Remove all listeners from the subscription instance.
     */
    removeAllListeners() {}
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
 * function onchange(path) {
 *    console.log(`Realm created at ${path}`);
 * }
 *
 * function onavailable(change) {
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
    constructor(moduleName, options = {}) {}
}

/**
 * Custom Data Connectors.
 * @memberof Realm.Sync
 */
class Adapter {
	/**
	 * Create a new Adapter to monitor and process changes made across multiple Realms
	 * @param {string} localPath - the local path where realm files are stored
	 * @param {string} serverUrl - the sync server to listen to
	 * @param {SyncUser} adminUser - an admin user obtained by calling {@linkcode Realm.Sync.User.login|User.login} with admin credentials.
	 * @param {string} regex - a regular expression used to determine which changed Realms should be monitored -
	 *  use `.*` to match all all Realms
	 * @param {function(realmPath)} changeCallback - called when a new transaction is available
	 *  to process for the given realm_path
     * @param {Realm.Sync~SSLConfiguration} [ssl] - SSL configuration for the spawned sync sessions.
	 */
	constructor(localPath, serverUrl, adminUser, regex, changeCallback, ssl) {}

	/**
	 * Get the Array of current instructions for the given Realm.
	 * @param {string} path - the path for the Realm being monitored
     *
     * The following Instructions can be returned. Each instruction object has
     * a `type` property which is one of the following types. For each type below we list the other properties
     * that will exist in the instruction object.
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
     *
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
     * @param {Realm~ObjectSchema[]} [schema] - optional schema to apply when opening the Realm
	 * @returns {Realm}
	 */
	realmAtPath(path, schema) {}

	/**
	 * Close the adapter and all opened Realms.
	 */
	close() {}
}

