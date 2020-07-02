////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

// TypeScript Version: 2.3.2
// With great contributions to @akim95 on github

import SubscriptionState = Realm.Sync.SubscriptionState;

declare namespace Realm {
    interface CollectionChangeSet {
        insertions: number[];
        deletions: number[];
        modifications: number[];
        newModifications: number[];
        oldModifications: number[];
    }

    interface ObjectChanges {
        insertions: Object[];
        deletions: Object[];
        newModifications: Object[];
        oldModifications: Object[];
    }

    type CollectionChangeCallback<T> = (collection: Collection<T>, change: ObjectChanges) => void;

    /**
     * PropertyType
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~PropertyType }
     */
    type PropertyType = string | 'bool' | 'int' | 'float' | 'double' | 'string' | 'data' | 'date' | 'list' | 'linkingObjects';

    /**
     * ObjectSchemaProperty
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~ObjectSchemaProperty }
     */
    interface ObjectSchemaProperty {
        type: PropertyType;
        objectType?: string;
        property?: string;
        default?: any;
        optional?: boolean;
        indexed?: boolean;
        mapTo?: string;
    }

    // properties types
    interface PropertiesTypes {
        [keys: string]: PropertyType | ObjectSchemaProperty;
    }

    enum UpdateMode {
        Never = 'never',
        Modified = 'modified',
        All = 'all'
    }

    /**
     * ObjectSchema
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~ObjectSchema }
     */
    interface ObjectSchema {
        name: string;
        primaryKey?: string;
        properties: PropertiesTypes;
    }

    /**
     * ObjectClass
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~ObjectClass }
     */
    interface ObjectClass {
        schema: ObjectSchema;
    }

    /**
     * ObjectType
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~ObjectType }
     */
    interface ObjectType {
        type: ObjectClass;
    }

    /**
     * A function which can be called to migrate a Realm from one version of the schema to another.
     */
    type MigrationCallback = (oldRealm: Realm, newRealm: Realm) => void;

    /**
     * realm configuration
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }
     */
    interface Configuration {
        encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
        migration?: MigrationCallback;
        shouldCompactOnLaunch?: (totalBytes: number, usedBytes: number) => boolean;
        path?: string;
        fifoFilesFallbackPath?: string;
        readOnly?: boolean;
        inMemory?: boolean;
        schema?: (ObjectClass | ObjectSchema)[];
        schemaVersion?: number;
        sync?: Partial<Realm.Sync.SyncConfiguration>;
        deleteRealmIfMigrationNeeded?: boolean;
        disableFormatUpgrade?: boolean;
    }

    /**
     * realm configuration used for overriding default configuration values.
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }
     */
    interface PartialConfiguration extends Partial<Realm.Configuration> {
    }

    // object props type
    interface ObjectPropsType {
        [keys: string]: any;
    }

    interface ObjectChangeSet {
        deleted: boolean;
        changedProperties: string[]
    }

    type ObjectChangeCallback = (object: Object, changes: ObjectChangeSet) => void;

    /**
     * Object
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Object.html }
     */
    interface Object {
        /**
         * @returns An array of the names of the object's properties.
         */
        keys(): string[];

        /**
         * @returns An array of key/value pairs of the object's properties.
         */
        entries(): [string, any][];

        /**
         * @returns An object for JSON serialization.
         */
        toJSON(): any;

        /**
         * @returns boolean
         */
        isValid(): boolean;

        /**
         * @returns ObjectSchema
         */
        objectSchema(): ObjectSchema;

        /**
         * @returns Results<T>
         */
        linkingObjects<T>(objectType: string, property: string): Results<T & Realm.Object>;

        /**
         * @returns number
         */
        linkingObjectsCount(): number;

        objectId(): string;

        /**
         * @returns void
         */
        addListener(callback: ObjectChangeCallback): void;

        removeListener(callback: ObjectChangeCallback): void;

        removeAllListeners(): void;
    }

    const Object: {
        readonly prototype: Object;
    }

    /**
     * SortDescriptor
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html#~SortDescriptor }
     */
    type SortDescriptor = [string] | [string, boolean];

    /**
     * Collection
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html }
     */
    interface Collection<T> extends ReadonlyArray<T> {
        readonly type: PropertyType;
        readonly optional: boolean;

        description(): string;

        /**
         * @returns boolean
         */
        isValid(): boolean;

        /**
         * @returns boolean
         */
        isEmpty(): boolean;

        min(property?: string): number | Date | null;
        max(property?: string): number | Date | null;
        sum(property?: string): number | null;
        avg(property?: string): number;

        /**
         * @param  {string} query
         * @param  {any[]} ...arg
         * @returns Results
         */
        filtered(query: string, ...arg: any[]): Results<T>;

        sorted(reverse?: boolean): Results<T>;
        sorted(descriptor: SortDescriptor[]): Results<T>;
        sorted(descriptor: string, reverse?: boolean): Results<T>;

        /**
         * @returns Results<T>
         */
        subscribe(subscriptionName?: string): Realm.Sync.Subscription;
        subscribe(options?: Realm.Sync.SubscriptionOptions): Realm.Sync.Subscription;

        /**
         * @returns Results
         */
        snapshot(): Results<T>;

        /**
         * @param  {(collection:any,changes:any)=>void} callback
         * @returns void
         */
        addListener(callback: CollectionChangeCallback<T>): void;

        /**
         * @returns void
         */
        removeAllListeners(): void;

        /**
         * @param  {()=>void} callback this is the callback to remove
         * @returns void
         */
        removeListener(callback: CollectionChangeCallback<T>): void;
    }

    const Collection: {
        readonly prototype: Collection<any>;
    };

    /**
     * List
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.List.html }
     */
    interface List<T> extends Collection<T> {
        [n: number]: T;

        pop(): T | null | undefined;

        /**
         * @param  {T} object
         * @returns number
         */
        push(...object: T[]): number;

        /**
         * @returns T
         */
        shift(): T | null | undefined;

        unshift(...object: T[]): number;

        /**
         * @param  {number} index
         * @param  {number} count?
         * @param  {any} object?
         * @returns T
         */
        splice(index: number, count?: number, object?: any): T[];
    }

    const List: {
        readonly prototype: List<any>;
    };

    /**
     * Results
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Results.html }
     */
    interface Results<T> extends Collection<T> {
        /**
         * Bulk update objects in the collection.
         * @param  {string} property
         * @param  {any} value
         * @returns void
         */
        update(property: string, value: any): void;
    }

    const Results: {
        readonly prototype: Results<any>;
    };
}

/**
 * Sync
 * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.html }
 */
declare namespace Realm.Sync {

    interface UserInfo {
        id: string;
        isAdmin: boolean;
    }

    interface Account {
        provider_id: string;
        provider: string;
        user: UserInfo
    }

    interface SerializedUser {
        server: string;
        refreshToken: string;
        identity: string;
        isAdmin: boolean;
    }

    interface SerializedTokenUser {
        server: string;
        adminToken: string;
    }

    interface SubscriptionOptions {
        name?: string;
        update?: boolean;
        timeToLive?: number;
        includeLinkingObjects?: string[];
    }

    class AdminCredentials extends Credentials {
        identityProvider: "adminToken";
    }

    class Credentials {
        static usernamePassword(username: string, password: string, createUser?: boolean): Credentials;
        static facebook(token: string): Credentials;
        static google(token: string): Credentials;
        static anonymous(): Credentials;
        static nickname(value: string, isAdmin?: boolean): Credentials;
        static azureAD(token: string): Credentials;
        static jwt(token: string, providerName?: string): Credentials;
        static adminToken(token: string): AdminCredentials;
        static custom(providerName: string, token: string, userInfo?: { [key: string]: any }): Credentials;

        readonly identityProvider: string;
        readonly token: string;
        readonly userInfo: { [key: string]: any };
    }

    /**
     * User
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.User.html }
     */
    class User {
        static readonly all: { [identity: string]: User };
        static readonly current: User | undefined;
        readonly identity: string;
        readonly isAdmin: boolean;
        readonly isAdminToken: boolean;
        readonly server: string;
        readonly token: string;
        static login(server: string, credentials: AdminCredentials): User;
        static login(server: string, credentials: Credentials): Promise<User>;

        static requestPasswordReset(server: string, email: string): Promise<void>;

        static completePasswordReset(server: string, resetToken: string, newPassword: string): Promise<void>;

        static requestEmailConfirmation(server: string, email: string): Promise<void>;

        static confirmEmail(server: string, confirmationToken: string): Promise<void>;

        static deserialize(serialized: SerializedUser | SerializedTokenUser): Realm.Sync.User;

        createConfiguration(config?: Realm.PartialConfiguration): Realm.Configuration
        serialize(): SerializedUser | SerializedTokenUser;
        logout(): Promise<void>;
        retrieveAccount(provider: string, username: string): Promise<Account>;

        getGrantedPermissions(recipient: 'any' | 'currentUser' | 'otherUser'): Promise<Permission[]>;
        applyPermissions(condition: PermissionCondition, realmUrl: string, accessLevel: AccessLevel): Promise<void>;
        offerPermissions(realmUrl: string, accessLevel: AccessLevel, expiresAt?: Date): Promise<string>;
        acceptPermissionOffer(token: string): Promise<string>
        invalidatePermissionOffer(permissionOfferOrToken: PermissionOffer | string): Promise<void>;
        getPermissionOffers(): Promise<PermissionOffer[]>;

        // Deprecated

        /** @deprecated, to be removed in future versions */
        static adminUser(adminToken: string, server?: string): User;
        /** @deprecated, to be removed in future versions */
        static login(server: string, username: string, password: string): Promise<Realm.Sync.User>;
        /** @deprecated, to be removed in future versions */
        static register(server: string, username: string, password: string): Promise<Realm.Sync.User>;
        /** @deprecated, to be removed in future versions */
        static registerWithProvider(server: string, options: { provider: string, providerToken: string, userInfo: any }): Promise<Realm.Sync.User>;
        /** @deprecated, to be removed in future versions */
        static authenticate(server: string, provider: string, options: any): Promise<Realm.Sync.User>;
    }

    interface _PermissionConditionUserId {
        userId: string
    }

    interface _PermissionConditionMetadata {
        metadataKey: string
        metadataValue: string
    }

    type PermissionCondition = _PermissionConditionUserId | _PermissionConditionMetadata

    type AccessLevel = 'none' | 'read' | 'write' | 'admin';

    class Permission {
        readonly id: string;
        readonly updatedAt: Date;
        readonly userId: string;
        readonly path: string;
        readonly mayRead?: boolean;
        readonly mayWrite?: boolean;
        readonly mayManage?: boolean;
    }

    class PermissionChange {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        statusCode?: number;
        statusMessage?: string;
        userId: string;
        metadataKey?: string;
        metadataValue?: string;
        realmUrl: string;
        mayRead?: boolean;
        mayWrite?: boolean;
        mayManage?: boolean;
    }

    class PermissionOffer {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        statusCode?: number;
        statusMessage?: string;
        token?: string;
        realmUrl: string;
        mayRead?: boolean;
        mayWrite?: boolean;
        mayManage?: boolean;
        expiresAt?: Date;
    }

    interface SyncError {
        name: string;
        message: string;
        isFatal: boolean;
        category?: string;
        code: number;
    }

    interface SSLVerifyObject {
        serverAddress: string;
        serverPort: number;
        pemCertificate: string;
        acceptedByOpenSSL: boolean;
        depth: number;
    }

    type ErrorCallback = (session: Session, error: SyncError) => void;
    type SSLVerifyCallback = (sslVerifyObject: SSLVerifyObject) => boolean;
    const enum SessionStopPolicy {
        AfterUpload = "after-upload",
        Immediately = "immediately",
        Never = "never"
    }

    interface SSLConfiguration {
        validate?: boolean;
        certificatePath?: string;
        validateCallback?: SSLVerifyCallback;
    }

    const enum ClientResyncMode {
        Discard = 'discard',
        Manual = 'manual',
        Recover = 'recover'
    }

    interface SyncConfiguration {
        user: User;
        url: string;
        /** @deprecated use `ssl` instead */
        validate_ssl?: boolean;
        /** @deprecated use `ssl` instead */
        ssl_trust_certificate_path?: string;
        /** @deprecated use `ssl` instead */
        open_ssl_verify_callback?: SSLVerifyCallback;
        ssl?: SSLConfiguration;
        error?: ErrorCallback;
        partial?: boolean;
        fullSynchronization?: boolean;
        _disableQueryBasedSyncUrlChecks?: boolean;
        _sessionStopPolicy?: SessionStopPolicy;
        custom_http_headers?: { [header: string]: string };
        customQueryBasedSyncIdentifier?: string;
        newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        clientResyncMode?: ClientResyncMode;
    }

    interface OpenRealmBehaviorConfiguration {
        readonly type: OpenRealmBehaviorType
        readonly timeOut?: number;
        readonly timeOutBehavior?: OpenRealmTimeOutBehavior;
    }

    const enum OpenRealmBehaviorType {
        DownloadBeforeOpen = 'downloadBeforeOpen',
        OpenImmediately = "openImmediately"
    }

    const enum OpenRealmTimeOutBehavior {
        OpenLocalRealm = 'openLocalRealm',
        ThrowException = 'throwException'
    }

    let openLocalRealmBehavior: OpenRealmBehaviorConfiguration;
    let downloadBeforeOpenBehavior: OpenRealmBehaviorConfiguration;

    enum ConnectionState {
        Disconnected = "disconnected",
        Connecting = "connecting",
        Connected = "connected",
    }

    type ProgressNotificationCallback = (transferred: number, transferable: number) => void;
    type ProgressDirection = 'download' | 'upload';
    type ProgressMode = 'reportIndefinitely' | 'forCurrentlyOutstandingWork';

    type ConnectionNotificationCallback = (newState: ConnectionState, oldState: ConnectionState) => void;

    /**
    * Session
    * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.Session.html }
    */
    class Session {
        readonly config: SyncConfiguration;
        readonly state: 'invalid' | 'active' | 'inactive';
        readonly url: string;
        readonly user: User;
        readonly connectionState: ConnectionState;

        addProgressNotification(direction: ProgressDirection, mode: ProgressMode, progressCallback: ProgressNotificationCallback): void;
        removeProgressNotification(progressCallback: ProgressNotificationCallback): void;

        addConnectionNotification(callback: ConnectionNotificationCallback): void;
        removeConnectionNotification(callback: ConnectionNotificationCallback): void;

        isConnected(): boolean;

        resume(): void;
        pause(): void;

        downloadAllServerChanges(timeoutMs?: number): Promise<void>;
        uploadAllLocalChanges(timeoutMs?: number): Promise<void>;
    }

    type SubscriptionNotificationCallback = (subscription: Subscription, state: SubscriptionState) => void;

    /**
     * Subscription
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.Subscription.html }
     */
    class Subscription {
        readonly state: SubscriptionState;
        readonly error: string;

        unsubscribe(): void;
        addListener(subscriptionCallback: SubscriptionNotificationCallback): void;
        removeListener(subscriptionCallback: SubscriptionNotificationCallback): void;
        removeAllListeners(): void;
    }

    enum SubscriptionState {
        Error,
        Creating,
        Pending,
        Complete,
        Invalidated,
    }

    /**
    * AuthError
    * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.AuthError.html }
    */
    class AuthError {
        readonly code: number;
        readonly type: string;
    }

    /**
     * ChangeEvent
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.ChangeEvent.html }
     */
    interface ChangeEvent {
        readonly changes: { [object_type: string]: ObjectChanges };
        readonly oldRealm: Realm;
        readonly path: string;
        readonly realm: Realm;
    }

    type RealmListenerEventName = 'available' | 'change' | 'delete';

    interface RealmListenerConfiguration {
        serverUrl: string;
        adminUser: User;
        filterRegex: string;
        sslConfiguration?: SSLConfiguration;
    }

    type LogLevel = 'all' | 'trace' | 'debug' | 'detail' | 'info' | 'warn' | 'error' | 'fatal' | 'off';

    enum NumericLogLevel {
        All,
        Trace,
        Debug,
        Detail,
        Info,
        Warn,
        Error,
        Fatal,
        Off,
    }

    /**
     * LocalRealm
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.LocalRealm.html }
     */
    interface LocalRealm {
        readonly path: string;
        realm(): Realm;
    }

    type RealmWatchPredicate = (realmPath: string) => boolean;

    /**
     * @deprecated, to be removed in future versions
     */
    function addListener(serverURL: string, adminUser: Realm.Sync.User, regex: string, name: RealmListenerEventName, changeCallback: (changeEvent: ChangeEvent) => void): Promise<void>;
    /**
     * @deprecated, to be removed in future versions
     */
    function addListener(serverURL: string, adminUser: Realm.Sync.User, regex: string, name: RealmListenerEventName, changeCallback: (changeEvent: ChangeEvent) => Promise<void>): Promise<void>;
    function addListener(config: RealmListenerConfiguration, eventName: RealmListenerEventName, changeCallback: (changeEvent: ChangeEvent) => void): Promise<void>;
    function addListener(config: RealmListenerConfiguration, eventName: RealmListenerEventName, changeCallback: (changeEvent: ChangeEvent) => Promise<void>): Promise<void>;
    function removeAllListeners(): Promise<void>;
    function removeListener(regex: string, name: string, changeCallback: (changeEvent: ChangeEvent) => void): Promise<void>;
    function setLogLevel(logLevel: LogLevel): void;
    function setLogger(callback: (level: NumericLogLevel, message: string) => void): void;
    function setUserAgent(userAgent: string): void;
    function enableSessionMultiplexing(): void;
    function initiateClientReset(path: string): void;
    function _hasExistingSessions(): boolean;
    function reconnect(): void;
    function localListenerRealms(regex: string): Array<LocalRealm>;

    /**
     * @deprecated, to be removed in future versions
     */
    function setFeatureToken(token: string): void;

    type Instruction = {
        type: 'INSERT' | 'SET' | 'DELETE' | 'CLEAR' | 'LIST_SET' | 'LIST_INSERT' | 'LIST_ERASE' | 'LIST_CLEAR' | 'ADD_TYPE' | 'ADD_PROPERTIES' | 'CHANGE_IDENTITY' | 'SWAP_IDENTITY'
        object_type: string,
        identity: string,
        values: any | undefined
        list_index: any | undefined
        object_identity: any | undefined
        new_identity: any | undefined,
        property: any | undefined,
        properties: any | undefined,
        primary_key: string | undefined
    }

    class Adapter {
        constructor(
            local_path: string,
            server_url: string,
            admin_user: User,
            filter: string | RealmWatchPredicate,
            change_callback: Function,
            ssl?: SSLConfiguration
        )

        /**
         * Advance the to the next transaction indicating that you are done processing the current instructions for the given Realm.
         * @param path the path for the Realm to advance
         */
        advance(path: string): void;
        close(): void;
        current(path: string): Array<Instruction>;
        realmAtPath(path: string, schema?: ObjectSchema[]): Realm
    }
}

declare namespace Realm.Permissions {
    class Permission {
        static schema: ObjectSchema;

        role: Role;
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canQuery: boolean;
        canModifySchema: boolean;
        canSetPermissions: boolean;
    }

    class User {
        static schema: ObjectSchema;
        id: string;
    }

    class Role {
        static schema: ObjectSchema;
        name: string;
        members: User[];
    }

    class Class {
        static schema: ObjectSchema;
        class_name: string;
        name: string;
        permissions: Permission[];
        findOrCreate(roleName: string): Permission;
    }

    class Realm {
        static schema: ObjectSchema;
        id: number;
        permissions: Permission[];
        findOrCreate(roleName: string): Permission;
    }

    class RealmPrivileges {
        canRead: boolean;
        canUpdate: boolean;
        canModifySchema: boolean;
        canSetPermissions: boolean;
    }

    class ClassPrivileges {
        canCreate: boolean;
        canRead: boolean;
        canUpdate: boolean;
        canQuery: boolean;
        canModifySchema: boolean;
        canSetPermissions: boolean;
    }

    class ObjectPrivileges {
        canRead: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canSetPermissions: boolean;
    }
}

interface ProgressPromise extends Promise<Realm> {
    cancel(): void;
    progress(callback: Realm.Sync.ProgressNotificationCallback): Promise<Realm>;
}

interface NamedSubscription {
    readonly name: string,
    readonly objectType: string,
    query: string
    readonly state: SubscriptionState;
    readonly error: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly expiresAt: Date;
    timeToLive: number;
}

declare class Realm {
    static defaultPath: string;

    readonly empty: boolean;
    readonly path: string;
    readonly readOnly: boolean;
    readonly schema: Realm.ObjectSchema[];
    readonly schemaVersion: number;
    readonly isInTransaction: boolean;
    readonly isClosed: boolean;

    readonly syncSession: Realm.Sync.Session | null;

    /**
     * Get the current schema version of the Realm at the given path.
     * @param  {string} path
     * @param  {any} encryptionKey?
     * @returns number
     */
    static schemaVersion(path: string, encryptionKey?: ArrayBuffer | ArrayBufferView): number;

    /**
     * Open a realm asynchronously with a promise. If the realm is synced, it will be fully synchronized before it is available.
     * @param {Configuration} config
     */
    static open(config: Realm.Configuration): ProgressPromise;
    /**
     * @deprecated in favor of `Realm.open`
     * Open a realm asynchronously with a callback. If the realm is synced, it will be fully synchronized before it is available.
     * @param {Configuration} config
     * @param {Function} callback will be called when the realm is ready.
     * @param {ProgressNotificationCallback} progressCallback? a progress notification callback for 'download' direction and 'forCurrentlyOutstandingWork' mode
     */
    static openAsync(config: Realm.Configuration, callback: (error: any, realm: Realm) => void, progressCallback?: Realm.Sync.ProgressNotificationCallback): void

    /**
     * @deprecated in favor of `Realm.Sync.User.createConfiguration()`.
     * Return a configuration for a default Realm.
     * @param {Realm.Sync.User} optional user.
     */
    static automaticSyncConfiguration(user?: Realm.Sync.User): string;

    /**
     * @param {Realm.ObjectSchema} object schema describing the object that should be created.
     * @returns {T}
     */
    static createTemplateObject<T>(objectSchema: Realm.ObjectSchema): T & Realm.Object;

    /**
     * Delete the Realm file for the given configuration.
     * @param {Configuration} config
     */
    static deleteFile(config: Realm.Configuration): void;

    /**
     * Copy all bundled Realm files to app's default file folder.
     */
    static copyBundledRealmFiles(): void;

    /**
     * Clears the state by closing and deleting any Realm in the default directory and logout all users.
     * @private Not a part of the public API: It's primarily used from the library's tests.
     */
    static clearTestState(): void;

    /**
     * Checks if the Realm already exists on disk.
     */
    static exists(config: Realm.Configuration): boolean;

    /**
     * @param  {Realm.Configuration} config?
     */
    constructor(config?: Realm.Configuration);

    /**
     * @param  {string} path
     */
    constructor(path?: string);

    /**
     * @returns void
     */
    close(): void;

    /**
     * @param  {string|Realm.ObjectClass|Function} type
     * @param  {T&Realm.ObjectPropsType} properties
     * @param  {boolean} update?
     * @returns T
     *
     * @deprecated, to be removed in future versions. Use `create(type, properties, UpdateMode)` instead.
     */
    create<T>(type: string | Realm.ObjectClass | Function, properties: T | Realm.ObjectPropsType, update?: boolean): T;

    /**
     * @param  {string|Realm.ObjectClass|Function} type
     * @param  {T&Realm.ObjectPropsType} properties
     * @param  {Realm.UpdateMode} mode? If not provided, `Realm.UpdateMode.Never` is used.
     * @returns T
     */
    create<T>(type: string | Realm.ObjectClass | Function, properties: T | Realm.ObjectPropsType, mode?: Realm.UpdateMode): T;

    /**
     * @param  {Realm.Object|Realm.Object[]|Realm.List<any>|Realm.Results<any>|any} object
     * @returns void
     */
    delete(object: Realm.Object | Realm.Object[] | Realm.List<any> | Realm.Results<any> | any): void;

    /**
     * @returns void
     */
    deleteModel(name: string): void;

    /**
     * @returns void
     */
    deleteAll(): void;

    /**
     * @param  {string|Realm.ObjectType|Function} type
     * @param  {number|string} key
     * @returns {T | undefined}
     */
    objectForPrimaryKey<T>(type: string | Realm.ObjectType | Function, key: number | string): T & Realm.Object | undefined;

    /**
     * @param  {string|Realm.ObjectType|Function} type
     * @param  {string} id
     * @returns {T | undefined}
     */
    objectForPrimaryKey<T>(type: string | Realm.ObjectType | Function, id: string): T & Realm.Object | undefined;

    /**
     * @param  {string|Realm.ObjectType|Function} type
     * @returns Realm
     */
    objects<T>(type: string | Realm.ObjectType | Function): Realm.Results<T & Realm.Object>;

    /**
     * @param  {string} name
     * @param  {()=>void} callback
     * @returns void
     */
    addListener(name: string, callback: (sender: Realm, event: 'change') => void): void;
    addListener(name: string, callback: (sender: Realm, event: 'schema', schema: Realm.ObjectSchema[]) => void): void;

    /**
     * @param  {string} name
     * @param  {()=>void} callback
     * @returns void
     */
    removeListener(name: string, callback: (sender: Realm, event: 'change') => void): void;
    removeListener(name: string, callback: (sender: Realm, event: 'schema', schema: Realm.ObjectSchema[]) => void): void;

    /**
     * @param  {string} name?
     * @returns void
     */
    removeAllListeners(name?: string): void;

    /**
     * @param  {()=>void} callback
     * @returns void
     */
    write(callback: () => void): void;

    /**
     * @returns void
     */
    beginTransaction(): void;

    /**
     * @returns void
     */
    commitTransaction(): void;

    /**
     * @returns void
     */
    cancelTransaction(): void;

    /**
     * @returns boolean
     */
    compact(): boolean;

    /**
     * Write a copy to destination path
     * @param path destination path
     * @param encryptionKey encryption key to use
     * @returns void
     */
    writeCopyTo(path: string, encryptionKey?: ArrayBuffer | ArrayBufferView): void;

    privileges(): Realm.Permissions.RealmPrivileges;
    privileges(objectType: string | Realm.ObjectSchema | Function): Realm.Permissions.ClassPrivileges;
    privileges(obj: Realm.Object): Realm.Permissions.ObjectPrivileges;

    permissions(): Realm.Permissions.Realm;
    permissions(objectType: string | Realm.ObjectSchema | Function): Realm.Permissions.Class;

    subscriptions(name?: string): Realm.Results<NamedSubscription>;
    unsubscribe(name: string): void;

    /**
     * Update the schema of the Realm.
     *
     * @param schema The schema which the Realm should be updated to use.
     * @private Not a part of the public API: Consider passing a `schema` when constructing the `Realm` instead.
     */
    _updateSchema(schema: Realm.ObjectSchema[]): void;
}

declare module 'realm' {
    export = Realm
}
