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
        newModifications: number[];
        oldModifications: number[];
    }

    type CollectionChangeCallback<T> = (collection: Collection<T>, changes: CollectionChangeSet) => void;

    /**
     * PropertyType
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~PropertyType }
     */
    type PropertyType = string | 'bool' | 'int' | 'float' | 'double' | 'decimal128' | 'objectId' | 'string' | 'data' | 'date' | 'list' | 'linkingObjects';

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
        [keys: string]: PropertyType | ObjectSchemaProperty | ObjectSchema;
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

    type PrimaryKey = number | string | Realm.BSON.ObjectId | Realm.BSON.UUID;

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


    interface SSLVerifyObject {
        serverAddress: string;
        serverPort: number;
        pemCertificate: string;
        acceptedByOpenSSL: boolean;
        depth: number;
    }

    type SSLVerifyCallback = (sslVerifyObject: SSLVerifyObject) => boolean;
    interface SSLConfiguration {
        validate?: boolean;
        certificatePath?: string;
        validateCallback?: SSLVerifyCallback;
    }

    interface BaseSyncConfiguration {
        user: User;
        customHttpHeaders?: { [header: string]: string };
        newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        ssl?: SSLConfiguration;
        _sessionStopPolicy?: SessionStopPolicy;
        error?: ErrorCallback;
    }

    interface FlexibleSyncConfiguration extends BaseSyncConfiguration {
        // This isn't quite right as this matches flexible: false too, can't work out how to do it properly
        flexible: boolean;
    }

    interface PartitionSyncConfiguration extends BaseSyncConfiguration {
        flexible?: never;
        partitionValue: Realm.App.Sync.PartitionValue;
    }

    type SyncConfiguration = FlexibleSyncConfiguration | PartitionSyncConfiguration;

    interface BaseConfiguration {
        encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
        schema?: (ObjectClass | ObjectSchema)[];
        schemaVersion?: number;
        shouldCompactOnLaunch?: (totalBytes: number, usedBytes: number) => boolean;
        path?: string;
        fifoFilesFallbackPath?: string;
        readOnly?: boolean;
    }


    interface ConfigurationWithSync extends BaseConfiguration {
        sync: SyncConfiguration;
        migration?: never;
        inMemory?: never;
        deleteRealmIfMigrationNeeded?: never;
        disableFormatUpgrade?: never;
    }

    interface ConfigurationWithoutSync extends BaseConfiguration {
        sync?: never;
        migration?: MigrationCallback;
        inMemory?: boolean;
        deleteRealmIfMigrationNeeded?: boolean;
        disableFormatUpgrade?: boolean;
    }

    /**
     * realm configuration
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }
     */
    type Configuration = ConfigurationWithSync | ConfigurationWithoutSync;

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

    /**
     * Object
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Object.html }
     */
    abstract class Object {
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

        _objectId(): string;

        /**
         * @returns void
         */
        addListener(callback: ObjectChangeCallback): void;

        removeListener(callback: ObjectChangeCallback): void;

        removeAllListeners(): void;

        /**
         * @returns string
         */
        getPropertyType(propertyName: string) : string;
    }

    /**
     * JsonSerializationReplacer solves circular structures when serializing Realm entities
     * @example JSON.stringify(realm.objects("Person"), Realm.JsonSerializationReplacer)
     */
    const JsonSerializationReplacer: (key: string, val: any) => any;

    /**
     * SortDescriptor
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html#~SortDescriptor }
     */
    type SortDescriptor = [string] | [string, boolean];

    /**
     * Dictionary
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Dictionary.html }
     */

    type Dictionary<ValueType = Mixed> = DictionaryBase<ValueType> & {
        [key: string]: ValueType;
    }

    interface DictionaryChangeSet {
        deletions: string[],
        modifications: string[],
        insertions: string[]
    }

    type DictionaryChangeCallback = (dict: Dictionary, changes: DictionaryChangeSet) => void;

    const Dictionary: {
        new(): never; // This type isn't supposed to be constructed manually by end users.
        readonly prototype: Dictionary;
    };

    interface DictionaryBase<ValueType = Mixed> {
        /**
         * Adds given element to the dictionary
         * @returns The dictionary
         */
        set(element:{[key:string]: ValueType}): DictionaryBase<ValueType>;

        /**
         * Removes given element from the dictionary
         * @returns The dictionary
         */
        remove(key:string|string[]): DictionaryBase<ValueType>;

        /**
         * @returns void
         */
        addListener(callback: DictionaryChangeCallback): void;
        removeListener(callback: DictionaryChangeCallback): void;
        removeAllListeners(): void;
    }

    /**
     * Collection
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html }
     */
    interface Collection<T> extends ReadonlyArray<T> {
        readonly type: PropertyType;
        readonly optional: boolean;

        /**
         * @returns An object for JSON serialization.
         */
        toJSON(): Array<any>;

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
        new(): never; // This type isn't supposed to be constructed manually by end users.
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
        new(): never; // This type isn't supposed to be constructed manually by end users.
        readonly prototype: List<any>;
    };


    /**
     * Set
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Set.html }
     */
     interface Set<T> extends Collection<T> {
        /**
         * Delete a value from the Set
         * @param {T} object Value to delete from the Set
         * @returns Boolean:  true if the value existed in the Set prior to deletion, false otherwise
         */
        delete(object: T): boolean;

        /**
         * Add a new value to the Set
         * @param  {T} object Value to add to the Set
         * @returns The Realm.Set<T> itself, after adding the new value
         */
        add(object: T): Realm.Set<T>;

        /**
         * Clear all values from the Set
         */
        clear(): void;

        /**
         * Check for existence of a value in the Set
         * @param  {T} object Value to search for in the Set
         * @returns Boolean: true if the value exists in the Set, false otherwise
         */
         has(object: T): boolean;

         readonly size: number
    }

    const Set: {
        new(): never; // This type isn't supposed to be constructed manually by end users.
        readonly prototype: Set<any>;
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
        new(): never; // This type isn't supposed to be constructed manually by end users.
        readonly prototype: Results<any>;
    };

    /**
     * A primitive value, a BSON value or an object link.
     */
    type Mixed = unknown;

    interface UserMap {
        [identity: string]: User
    }

    interface SyncError {
        name: string;
        message: string;
        isFatal: boolean;
        category?: string;
        code: number;
    }

    interface ClientResetError {
        name: "ClientReset";
        path: string;
        config: SyncConfiguration;
        readOnly: true;
    }

    type ErrorCallback = (session: App.Sync.Session, error: SyncError | ClientResetError) => void;

    const enum SessionStopPolicy {
        AfterUpload = "after-upload",
        Immediately = "immediately",
        Never = "never"
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

    enum ConnectionState {
        Disconnected = "disconnected",
        Connecting = "connecting",
        Connected = "connected",
    }

    type ProgressNotificationCallback = (transferred: number, transferable: number) => void;
    type ProgressDirection = 'download' | 'upload';
    type ProgressMode = 'reportIndefinitely' | 'forCurrentlyOutstandingWork';

    type ConnectionNotificationCallback = (newState: ConnectionState, oldState: ConnectionState) => void;

    namespace App.Sync {
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

        type PartitionValue = string|number|Realm.BSON.ObjectId|Realm.BSON.UUID|null;

        function getAllSyncSessions(user: Realm.User): [Realm.App.Sync.Session];
        function getSyncSession(user: Realm.User, partitionValue: Realm.App.Sync.PartitionValue) : Realm.App.Sync.Session;
        function setLogLevel(app: App, logLevel: LogLevel): void;
        function setLogger(app: App, callback: (level: NumericLogLevel, message: string) => void): void;
        function setUserAgent(app: App, userAgent: string): void;
        function enableSessionMultiplexing(app: App): void;
        function initiateClientReset(app: App, path: string): void;
        function _hasExistingSessions(app: App): boolean;
        function reconnect(app: App): void;

        /**
         * The default behavior settings if you want to open a synchronized Realm immediately and start working on it.
         * If this is the first time you open the Realm, it will be empty while the server data is being downloaded in the background.
         */
        const openLocalRealmBehavior: OpenRealmBehaviorConfiguration;
        /**
         * The default behavior settings if you want to wait for downloading a synchronized Realm to complete before opening it.
         */
        const downloadBeforeOpenBehavior: OpenRealmBehaviorConfiguration;

        /**
         * A class representing a single query subscription for Flexible Sync. This class contains
         * readonly information about the subscription – any changes to the set of subscriptions
         * must be carried out in a `Subscriptions.update` callback.
         */
        class Subscription {
            new(): never; // This type isn't supposed to be constructed manually by end users.

            /**
             * The date when this subscription was created
             */
            readonly createdAt: Date;

            /**
             * The date when this subscription was last updated
             */
            readonly updatedAt: Date;

            /**
             * The name given to this subscription when it was created.
             * If no name was set, this will return null.
             */
            readonly name: string | null;

            /**
             * The type of objects the subscription refers to.
             */
            readonly objectType: string;

            /**
             * The string representation of the query the subscription was created with.
             * If no filter or sort was specified, this will return "TRUEPREDICATE".
             */
            readonly queryString: string;
        }

        /**
         * Enum representing the state of a set of subscriptions.
         */
        enum SubscriptionState {
            /**
             * The subscription update has been persisted locally, but the server hasn't
             * yet returned all the data that matched the updated subscription queries.
             */
            Pending = "pending",

            /**
             * The server has acknowledged the subscription and sent all the data that
             * matched the subscription queries at the time the subscription set was
             * updated. The server is now in steady-state synchronization mode where it
             * will stream updates as they come.
             */
            Complete = "complete",

            /**
             * The server has returned an error and synchronization is paused for this
             * Realm. To view the actual error, use `Subscriptions.error`.
             * You can still use `Subscriptions.update` to update the subscriptions,
             * and if the new update doesn't trigger an error, synchronization
             * will be restarted.
             */
            Error = "error",

            /**
             * The subscription set has been superceded by an updated one. This typically means
             * that someone has called `Subscriptions.update` on a different instance
             * of the `Subscriptions`. You should not use a superseded subscription set,
             * and instead obtain a new instance by calling `getSubscriptions()`.
             */
            Superceded = "superceded",
        }

        /**
         * Options for `Subscriptions.add`.
         */
        interface SubscriptionOptions {
            /**
             * Sets the name of the subscription being added. This allows you to later refer
             * to the subscription by name, e.g. when calling `Subscriptions.removeByName`.
             */
            name?: string;

            /**
             * By default, adding a subscription with the same name as an existing one
             * but a different query will update the existing subscription with the new
             * query. If `throwOnUpdate` is set to true, adding a subscription with the
             * same name but a different query will instead throw an exception.
             * Adding a subscription with the same name and query is always a no-op.
             */
            throwOnUpdate?: boolean;
        }

        /**
         * A class representing the set of all active Flexible Sync subscriptions for a Realm
         * instance.
         *
         * The server will continuously evaluate the queries that the instance is subscribed to
         * and will send data that matches them, as well as remove data that no longer does.
         *
         * The set of subscriptions can only be updated inside a `Subscriptions.update` callback.
         * Attempting to call any methods which mutate the set (e.g. `add`, `remove`) outside of
         * an `update` callback will throw an exception.
         */
        class Subscriptions {
            new(): never; // This type isn't supposed to be constructed manually by end users.

            /**
             * Returns true if there are no subscriptions in the set.
             */
            readonly empty: boolean;

            /**
             * The version of the subscription set. This is incremented every time an `update`
             * is applied.
             */
            readonly version: number;

            /**
             * Get a readonly array snapshot of all the subscriptions in the set.
             * Any changes to the set of subscriptions must be performed in an `update` callback.
             */
            snapshot(): ReadonlyArray<Subscription>;

            /**
             * Find a subscription by name. Returns null if the subscription is not found.
             */
            findByName(name: string): Subscription | null;

            /**
             * Find a subscription by query, represented as a `Realm.Results` instance, e.g.
             * `subs.find(Realm.objects("Cat").filtered("age > 10"))`. Will match both named
             * and unnamed subscriptions. Returns null if the subscription is not found.
             */
            find<T>(query: Realm.Results<T & Realm.Object>): Subscription | null;

            // The state of this collection - is it acknowledged by the server and
            // has the data been downloaded locally?
            readonly state: SubscriptionState;

            // The exception containing information for why the state of the SubscriptionSet
            // is set to Error. If the state is not set to Error, this will be null.
            readonly error: Realm.SyncError | null;

            // Wait for the server to acknowledge and send all the data associated
            // with this collection of subscriptions. If the State is Complete, this method
            // will return immediately. If the State is Error, this will throw an error
            // immediately. If someone updates the Realm subscriptions while waiting,
            // this will throw a specific error.
            waitForSynchronization: () => Promise<void>;

            // Creates a transaction and updates this subscription set,
            // returning the new updated subscription set
            update: (callback: (mutableSubs: MutableSubscriptions) => void) => Subscriptions;
        }

        interface MutableSubscriptions extends Subscriptions {
            // Add a query to the list of subscriptions. Optionally, provide a name
            // and other parameters.
            add: <T>(query: Realm.Results<T & Realm.Object>, options?: SubscriptionOptions) => Subscription;

            // Remove a subscription by name. Returns false if not found.
            removeByName: (name: string) => boolean;

            // Remove a subscription by query. Returns false if not found.
            remove: <T>(query: Realm.Results<T & Realm.Object>) => boolean;

            // Remove a concrete subscription. Returns false if not found.
            removeSubscription: <T>(subscription: Subscription) => boolean;

            // Remove all subscriptions. Returns number of removed subscriptions.
            removeAll: () => number;

            // Remove all subscriptions for object type. Returns number of removed subscriptions.
            removeByObjectType: (objectType: string) => number;
        }
    }

    namespace BSON {
        type Decimal128 = import("bson").Decimal128;
        type ObjectId = import("bson").ObjectId;
        type UUID = import("bson").UUID;
    }

    const BSON: typeof import("bson");
}

interface ProgressPromise extends Promise<Realm> {
    cancel(): void;
    progress(callback: Realm.ProgressNotificationCallback): Promise<Realm>;
}

/**
 * Extracts an intersection of keys from T, where the value extends the given PropType.
 */
type ExtractPropertyNamesOfType<T, PropType> = {
    [K in keyof T]: T[K] extends PropType ? K : never
}[keyof T];

/**
 * Exchanges properties defined as Realm.List<Model> with an optional Array<Model | RealmInsertionModel<Model>>.
 */
type RealmListsRemappedModelPart<T> = {
    [K in ExtractPropertyNamesOfType<T, Realm.List<any>>]?: T[K] extends Realm.List<infer GT> ? Array<GT | RealmInsertionModel<GT>> : never
}

/**
* Exchanges properties defined as Realm.Dicionary<Model> with an optional key to mixed value object.
*/
type RealmDictionaryRemappedModelPart<T> = {
    [K in ExtractPropertyNamesOfType<T, Realm.Dictionary>]?: T[K] extends Realm.Dictionary<infer ValueType> ? { [key: string]: ValueType } : never
}

/** Omits all properties of a model which are not defined by the schema */
type OmittedRealmTypes<T> = Omit<T,
    keyof Realm.Object |
    ExtractPropertyNamesOfType<T, Function> |
    ExtractPropertyNamesOfType<T, Realm.Collection<any>> |
    ExtractPropertyNamesOfType<T, Realm.Dictionary>
>;

/** Remaps realm types to "simpler" types (arrays and objects) */
type RemappedRealmTypes<T> =
    RealmListsRemappedModelPart<T> &
    RealmDictionaryRemappedModelPart<T>;

/**
 * Joins T stripped of all keys which value extends Realm.Collection and all inherited from Realm.Object,
 * with only the keys which value extends Realm.List, remapped as Arrays.
 */
type RealmInsertionModel<T> = OmittedRealmTypes<T> & RemappedRealmTypes<T>;
declare class Realm {
    static defaultPath: string;

    readonly empty: boolean;
    readonly path: string;
    readonly readOnly: boolean;
    readonly schema: Realm.ObjectSchema[];
    readonly schemaVersion: number;
    readonly isInTransaction: boolean;
    readonly isClosed: boolean;

    readonly syncSession: Realm.App.Sync.Session | null;

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
     * @param  {string} type
     * @param  {T} properties
     * @param  {Realm.UpdateMode} mode? If not provided, `Realm.UpdateMode.Never` is used.
     * @returns T & Realm.Object
     */
    create<T>(type: string, properties: RealmInsertionModel<T>, mode?: Realm.UpdateMode.Never): T & Realm.Object;
    create<T>(type: string, properties: Partial<T> | Partial<RealmInsertionModel<T>>, mode: Realm.UpdateMode.All | Realm.UpdateMode.Modified): T & Realm.Object;

    /**
     * @param  {Class} type
     * @param  {T} properties
     * @param  {Realm.UpdateMode} mode? If not provided, `Realm.UpdateMode.Never` is used.
     * @returns T
     */
    create<T extends Realm.Object>(type: {new(...arg: any[]): T; }, properties: RealmInsertionModel<T>, mode?: Realm.UpdateMode.Never): T;
    create<T extends Realm.Object>(type: {new(...arg: any[]): T; }, properties: Partial<T> | Partial<RealmInsertionModel<T>>, mode: Realm.UpdateMode.All | Realm.UpdateMode.Modified): T;

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
     * @param  {string} type
     * @param  {number|string|ObjectId|UUID} key
     * @returns {T | undefined}
     */
    objectForPrimaryKey<T>(type: string, key: Realm.PrimaryKey): (T & Realm.Object) | undefined;

    /**
     * @param  {Class} type
     * @param  {number|string|ObjectId|UUID} key
     * @returns {T | undefined}
     */
    objectForPrimaryKey<T extends Realm.Object>(type: {new(...arg: any[]): T; }, key: Realm.PrimaryKey): T | undefined;

    // Combined definitions
    objectForPrimaryKey<T>(type: string | {new(...arg: any[]): T; }, key: Realm.PrimaryKey): (T & Realm.Object) | undefined;

    /**
     * @param  {string} type
     * @returns Realm.Results<T & Realm.Object>
     */
    objects<T>(type: string): Realm.Results<T & Realm.Object>;

    /**
     * @param  {Class} type
     * @returns Realm.Results<T>
     */
    objects<T extends Realm.Object>(type: {new(...arg: any[]): T; }): Realm.Results<T>;

    // Combined definitions
    objects<T>(type: string | {new(...arg: any[]): T; }): Realm.Results<T & Realm.Object>;

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
     * @param  {()=>ReturnValueType} callback
     * @returns {ReturnValueType}
     */
    write<ReturnValueType>(callback: () => ReturnValueType): ReturnValueType;

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

    // TODO
    getSubscriptions: () => Realm.App.Sync.Subscriptions;

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
