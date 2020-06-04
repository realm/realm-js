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

/// <reference path="./app.d.ts"/>

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
        embedded?: boolean;
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
        sync?: Realm.Sync.SyncConfiguration;
        deleteRealmIfMigrationNeeded?: boolean;
        disableFormatUpgrade?: boolean;
    }

    /**
     * realm configuration used for overriding default configuration values.
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }
     */

    // object props type
    interface ObjectPropsType {
        [keys: string]: any;
    }

    interface ObjectChangeSet {
        deleted: boolean;
        changedProperties: string[]
    }

    type ObjectChangeCallback = (object: Object, changes: ObjectChangeSet) => void;

    interface PartialConfiguration extends Partial<Realm.Configuration> {
    }

    /**
     * Object
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Object.html }
     */
    interface Object {
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
        static custom(providerName: string, token: string, userInfo?: { [key: string]: any }): Credentials;
        static adminToken(token: string): AdminCredentials;

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
        _sessionStopPolicy?: SessionStopPolicy;
        custom_http_headers?: { [header: string]: string };
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


    /**
    * AuthError
    * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.AuthError.html }
    */
    class AuthError {
        readonly code: number;
        readonly type: string;
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

    function setLogLevel(logLevel: LogLevel): void;
    function setLogger(callback: (level: NumericLogLevel, message: string) => void): void;
    function setUserAgent(userAgent: string): void;
    function initiateClientReset(path: string): void;
    function _hasExistingSessions(): boolean;
    function reconnect(): void;

    /**
     * @deprecated, to be removed in future versions
     */
    function setFeatureToken(token: string): void;
}

interface ProgressPromise extends Promise<Realm> {
    cancel(): void;
    progress(callback: Realm.Sync.ProgressNotificationCallback): Promise<Realm>;
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
