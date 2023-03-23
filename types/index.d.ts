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
/// <reference path="./decorators.d.ts"/>
/// <reference path="./types.d.ts"/>

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
     * This is the structure of a schema as input when configuring a Realm
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

    /**
     * CanonicalObjectSchemaProperty
     * This depicts the structure of a schema retrieved from a Realm
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~CanonicalObjectSchemaProperty }
     */
    interface CanonicalObjectSchemaProperty {
        name: string;
        type: PropertyType;
        objectType?: string;
        property?: string;
        optional: boolean;
        indexed: boolean;
        mapTo: string;
    }

    // properties types
    interface PropertiesTypes {
        [keys: string]: ObjectSchemaProperty | PropertyType;
    }

    interface CanonicalPropertiesTypes {
        [keys: string]: CanonicalObjectSchemaProperty;
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

    interface BaseObjectSchema {
        name: string;
        primaryKey?: string;
        embedded?: boolean;
        asymmetric?: boolean;
    }

    interface ObjectSchema extends BaseObjectSchema {
        properties: PropertiesTypes;
    }

    interface CanonicalObjectSchema extends BaseObjectSchema {
        properties: CanonicalPropertiesTypes;
    }

    /**
     * ObjectClass
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~ObjectClass }
     */
    type ObjectClass<T extends Realm.Object<T> = any> = {
        new(...args: any): Realm.Object<T>;
        schema?: ObjectSchema;
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
        validateCertificates?: SSLVerifyCallback;
    }

    enum ClientResetMode {
        Manual = 'manual',
        DiscardLocal = 'discardLocal', // for backward compatibility
        DiscardUnsyncedChanges = 'discardUnsyncedChanges',
        RecoverUnsyncedChanges = 'recoverUnsyncedChanges',
        RecoverOrDiscardUnsyncedChanges = 'recoverOrDiscardUnsyncedChanges'
    }

    type ClientResetFallbackCallback = (session: Realm.App.Sync.Session, path: string) => void;
    type ClientResetBeforeCallback = (localRealm: Realm) => void;
    type ClientResetAfterCallback = (localRealm: Realm, remoteRealm: Realm) => void;
    interface ClientResetManualConfiguration {
      mode: ClientResetMode.Manual;
      onManual?: ClientResetFallbackCallback;
    }
    interface ClientResetDiscardUnsyncedChangesConfiguration {
      mode: ClientResetMode.DiscardLocal | ClientResetMode.DiscardUnsyncedChanges;
      onBefore?: ClientResetBeforeCallback;
      onAfter?: ClientResetAfterCallback;
    }

    interface ClientResetRecoveryConfiguration {
      mode: ClientResetMode.RecoverUnsyncedChanges;
      onBefore?: ClientResetBeforeCallback;
      onAfter?: ClientResetAfterCallback;
      onFallback?: ClientResetFallbackCallback;
    }
    interface ClientResetRecoveryOrDiscardConfiguration {
      mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges;
      onBefore?: ClientResetBeforeCallback;
      onRecovery?: ClientResetAfterCallback;
      onDiscard?: ClientResetAfterCallback;
      onFallback?: ClientResetFallbackCallback;
    }

    type ClientResetConfiguration = ClientResetManualConfiguration | ClientResetDiscardUnsyncedChangesConfiguration | ClientResetRecoveryConfiguration | ClientResetRecoveryOrDiscardConfiguration;

    interface BaseSyncConfiguration{
        user: User;
        customHttpHeaders?: { [header: string]: string };
        ssl?: SSLConfiguration;
        _sessionStopPolicy?: SessionStopPolicy;
        newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
        onError?: ErrorCallback;
        clientReset?: ClientResetConfiguration;
    }

    // We only allow `flexible` to be `true` or `undefined` - `{ flexible: false }`
    // is not allowed. This is because TypeScript cannot discriminate that
    // type correctly with `strictNullChecks` disabled, and there's no real use
    // case for `{ flexible: false }`.
    interface FlexibleSyncConfiguration extends BaseSyncConfiguration {
        flexible: true;
        partitionValue?: never;
        /**
         * Optional object to configure the setup of an initial set of flexible
         * sync subscriptions to be used when opening the Realm. If this is specified,
         * {@link Realm.open} will not resolve until this set of subscriptions has been
         * fully synchronized with the server.
         *
         * Example:
         * ```
         * const config: Realm.Configuration = {
         *   sync: {
         *     user,
         *     flexible: true,
         *     initialSubscriptions: {
         *       update: (subs, realm) => {
         *         subs.add(realm.objects('Task'));
         *       },
         *       rerunOnOpen: true,
         *     },
         *   },
         *   // ... rest of config ...
         * };
         * const realm = await Realm.open(config);
         *
         * // At this point, the Realm will be open with the data for the initial set
         * // subscriptions fully synchronised.
         * ```
         */
        initialSubscriptions?: {
            /**
             * Callback called with the {@link Realm} instance to allow you to setup the
             * initial set of subscriptions by calling `realm.subscriptions.update`.
             * See {@link Realm.App.Sync.SubscriptionSet.update} for more information.
             */
            update: (subs: Realm.App.Sync.MutableSubscriptionSet, realm: Realm) => void;
            /**
             * If `true`, the {@link update} callback will be rerun every time the Realm is
             * opened (e.g. every time a user opens your app), otherwise (by default) it
             * will only be run if the Realm does not yet exist.
             */
            rerunOnOpen?: boolean;
        };
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
        shouldCompact?: (totalBytes: number, usedBytes: number) => boolean;
        onFirstOpen?: (realm: Realm) => void;
        path?: string;
        fifoFilesFallbackPath?: string;
        readOnly?: boolean;
    }

    interface ConfigurationWithSync extends BaseConfiguration {
        sync: SyncConfiguration;
        onMigration?: never;
        inMemory?: never;
        deleteRealmIfMigrationNeeded?: never;
        disableFormatUpgrade?: never;
    }

    interface ConfigurationWithoutSync extends BaseConfiguration {
        sync?: never;
        onMigration?: MigrationCallback;
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

    interface ObjectChangeSet<T> {
        deleted: boolean;
        changedProperties: (keyof T)[]
    }

    type ObjectChangeCallback<T> = (object: T, changes: ObjectChangeSet<T>) => void;

    /**
     * Base class for a Realm Object.
     * @see
     * {@link https://realm.io/docs/javascript/latest/api/Realm.Object.html}
     *
     * @example
     * To define a class `Person` which requires the `name` and `age` properties to be
     * specified when it is being constructed, using the Realm Babel plugin to allow
     * Typescript-only model definitions (otherwise it would require a `static` schema):
     * ```
     * class Person extends Realm.Object<Person, "name" | "age"> {
     *   _id = new Realm.Types.ObjectId();
     *   name: string;
     *   age: Realm.Types.Int;
     * }
     * ```
     *
     * @typeParam `T` - The type of this class (e.g. if your class is `Person`,
     * `T` should also be `Person` - this duplication is required due to how
     * TypeScript works)
     *
     * @typeParam `RequiredProperties` - The names of any properties of this
     * class which are required when an instance is constructed with `new`. Any
     * properties not specified will be optional, and will default to a sensible
     * null value if no default is specified elsewhere.
     */
    abstract class Object<T = unknown, RequiredProperties extends keyof OmittedRealmTypes<T> = never> {
        /**
         * Creates a new object in the database.
         */
        constructor(realm: Realm, values: Unmanaged<T, RequiredProperties>);

        /**
         * @returns An array of the names of the object's properties.
         */
        keys(): string[];

        /**
         * @returns An array of key/value pairs of the object's properties.
         */
        entries(): [string, any][];

        /**
         * @returns A plain object for JSON serialization.
         */
        toJSON(): Record<string, unknown>;

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

        _objectKey(): string;

        /**
         * @returns void
         */
        addListener(callback: ObjectChangeCallback<T>): void;

        removeListener(callback: ObjectChangeCallback<T>): void;

        removeAllListeners(): void;

        /**
         * @returns string
         */
        getPropertyType(propertyName: string): string;

        /**
         * Optionally specify the name of the schema when using @realm/babel-plugin
         */
         static name?: string;

         /**
          * Optionally specify the primary key of the schema when using @realm/babel-plugin
          */
         static primaryKey?: string;

         /**
          * Optionally specify that the schema is an embedded schema when using @realm/babel-plugin
          */
         static embedded?: boolean;

         /**
          * Optionally specify that the schema should sync unidirectionally if using flexible sync when using @realm/babel-plugin
          */
         static asymmetric?: boolean;
    }
    /**
     * SortDescriptor
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html#~SortDescriptor }
     */
    type SortDescriptor = string | [string, boolean];

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

        /**
         * @returns A plain object for JSON serialization.
         */
        toJSON(): Record<string, unknown>;
    }

    /**
     * Collection
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html }
     */
    interface Collection<T> extends ReadonlyArray<T> {
        readonly type: PropertyType;
        readonly optional: boolean;

        /**
         * @returns An array of plain objects for JSON serialization.
         */
        toJSON(): Array<Record<string, unknown>>;

        description(): string;

        /**
         * @returns boolean
         */
        isValid(): boolean;

        /**
         * @returns boolean
         */
        isEmpty(): boolean;

        min(property?: string): number | Date | undefined;
        max(property?: string): number | Date | undefined;
        avg(property?: string): number | undefined;
        sum(property?: string): number;

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

    /**
     * @deprecated
     */
    interface ClientResetError {
        name: "ClientReset";
        path: string;
        config: SyncConfiguration;
        readOnly: true;
    }

    type ErrorCallback = (session: App.Sync.Session, error: SyncError | ClientResetError) => void;

    enum SessionStopPolicy {
        AfterUpload = "after-upload",
        Immediately = "immediately",
        Never = "never"
    }

    interface OpenRealmBehaviorConfiguration {
        readonly type: OpenRealmBehaviorType
        readonly timeOut?: number;
        readonly timeOutBehavior?: OpenRealmTimeOutBehavior;
    }

    enum OpenRealmBehaviorType {
        DownloadBeforeOpen = 'downloadBeforeOpen',
        OpenImmediately = "openImmediately"
    }

    enum OpenRealmTimeOutBehavior {
        OpenLocalRealm = 'openLocalRealm',
        ThrowException = 'throwException'
    }

    enum ConnectionState {
        Disconnected = "disconnected",
        Connecting = "connecting",
        Connected = "connected",
    }

    enum SessionState {
        Invalid = "invalid",
        Active = "active",
        Inactive = "inactive",
    }

    enum ProgressDirection {
        Download = "download",
        Upload = "upload",
    }

    enum ProgressMode {
        ReportIndefinitely = "reportIndefinitely",
        ForCurrentlyOutstandingWork = "forCurrentlyOutstandingWork",
    }

    type ProgressNotificationCallback = (transferred: number, transferable: number) => void;

    type ConnectionNotificationCallback = (newState: ConnectionState, oldState: ConnectionState) => void;

    namespace App.Sync {
        class Session {
            readonly config: SyncConfiguration;
            readonly state: SessionState;
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
         * Class representing a single query subscription in a set of flexible sync
         * {@link SubscriptionSet}. This class contains readonly information about the
         * subscription – any changes to the set of subscriptions must be carried out
         * in a {@link SubscriptionSet.update} callback.
         */
        class Subscription {
            new(): never; // This type isn't supposed to be constructed manually by end users.

            /**
             * @returns The ObjectId of the subscription
             */
             readonly id: BSON.ObjectId;

            /**
             * @returns The date when this subscription was created
             */
            readonly createdAt: Date;

            /**
             * @returns The date when this subscription was last updated
             */
            readonly updatedAt: Date;

            /**
             * @returns The name given to this subscription when it was created.
             * If no name was set, this will return null.
             */
            readonly name: string | null;

            /**
             * @returns The type of objects the subscription refers to.
             */
            readonly objectType: string;

            /**
             * @returns The string representation of the query the subscription was created with.
             * If no filter or sort was specified, this will return "TRUEPREDICATE".
             */
            readonly queryString: string;
        }

        /**
         * Enum representing the state of a {@link SubscriptionSet} set.
         */
        enum SubscriptionsState {
            /**
             * The subscription update has been persisted locally, but the server hasn't
             * yet returned all the data that matched the updated subscription queries.
             */
            Pending = "pending",

            /**
             * The server has acknowledged the subscription and sent all the data that
             * matched the subscription queries at the time the SubscriptionSet was
             * updated. The server is now in steady-state synchronization mode where it
             * will stream updates as they come.
             */
            Complete = "complete",

            /**
             * The server has returned an error and synchronization is paused for this
             * Realm. To view the actual error, use `Subscriptions.error`.
             *
             * You can still use {@link SubscriptionSet.update} to update the subscriptions,
             * and if the new update doesn't trigger an error, synchronization
             * will be restarted.
             */
            Error = "error",

            /**
             * The SubscriptionSet has been superseded by an updated one. This typically means
             * that someone has called {@link SubscriptionSet.update} on a different instance
             * of the `Subscriptions`. You should not use a superseded SubscriptionSet,
             * and instead obtain a new instance from {@link Realm.subscriptions}.
             */
            Superseded = "superseded",
        }

        /**
         * Options for {@link SubscriptionSet.add}.
         */
        interface SubscriptionOptions {
            /**
             * Sets the name of the subscription being added. This allows you to later refer
             * to the subscription by name, e.g. when calling {@link MutableSubscriptionSet.removeByName}.
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
         * Class representing the common functionality for the {@link SubscriptionSet} and
         * {@link MutableSubscriptionSet} classes.
         *
         * SubscriptionSets can only be modified inside a {@link SubscriptionSet.update} callback.
         *
         * The SubscriptionSet is an iterable; thus, if absolutely needed, the contained
         * {@link Subscription}s can be accessed in `for-of` loops or spread into an `Array`
         * for access to the ECMAScript Array API, e.g. `[...realm.subscriptions][0]`. Directly
         * accessing the SubscriptionSet as an array is deprecated.
         */
        interface BaseSubscriptionSet extends DeprecatedReadonlyArray<Subscription> {
            new(): never; // This type isn't supposed to be constructed manually by end users.

            // /**
            //  * @returns A readonly array snapshot of all the subscriptions in the set.
            //  * Any changes to the set of subscriptions must be performed in an {@link update}
            //  * callback.
            //  */
            // [key:number]: Subscription;

            /**
             * @returns `true` if there are no subscriptions in the set, `false` otherwise.
             */
            readonly isEmpty: boolean;

            /**
             * @returns The number of subscriptions in the set.
             */
            readonly length: number;

            /**
             * @returns The version of the SubscriptionSet. This is incremented every time an
             * {@link update} is applied.
             */
            readonly version: number;

            /**
             * Find a subscription by name.
             *
             * @param name The name to search for.
             * @returns The named subscription, or `null` if the subscription is not found.
             */
            findByName(name: string): Subscription | null;

            /**
             * Find a subscription by query. Will match both named and unnamed subscriptions.
             *
             * @param query The query to search for, represented as a {@link Realm.Results} instance,
             * e.g. `Realm.objects("Cat").filtered("age > 10")`.
             * @returns The subscription with the specified query, or null if the subscription is not found.
             */
            findByQuery<T>(query: Realm.Results<T & Realm.Object>): Subscription | null;

            /**
             * @returns The state of the SubscriptionSet.
             */
            readonly state: SubscriptionsState;

            /**
             * @returns If `state` is {@link Realm.App.Sync.SubscriptionsState.Error}, this will return a `string`
             * representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.
             */
            readonly error: string | null;
        }

        /**
         * Class representing the set of all active flexible sync subscriptions for a Realm
         * instance.
         *
         * The server will continuously evaluate the queries that the instance is subscribed to
         * and will send data that matches them, as well as remove data that no longer does.
         *
         * The set of subscriptions can only be updated inside a {@link SubscriptionSet.update} callback,
         * by calling methods on the corresponding {@link MutableSubscriptionSet} instance.
         */
        interface SubscriptionSet extends BaseSubscriptionSet {
            /**
             * Wait for the server to acknowledge this set of subscriptions and return the
             * matching objects.
             *
             * If `state` is {@link SubscriptionsState.Complete}, the promise will be resolved immediately.
             *
             * If `state` is {@link SubscriptionsState.Error}, the promise will be rejected immediately.
             *
             * @returns A promise which is resolved when synchronization is complete, or is
             * rejected if there is an error during synchronisation.
             */
            waitForSynchronization: () => Promise<void>;

            /**
             * Update the SubscriptionSet and change this instance to point to the updated SubscriptionSet.
             *
             * Adding or removing subscriptions from the set must be performed inside
             * the callback argument of this method, and the mutating methods must be called on
             * the `mutableSubs` argument rather than the original {@link SubscriptionSet} instance.
             *
             * Any changes to the subscriptions after the callback has executed will be batched and sent
             * to the server. You can either `await` the call to `update`, or call {@link waitForSynchronization}
             * to wait for the new data to be available.
             *
             * Example:
             * ```
             * await realm.subscriptions.update(mutableSubs => {
             *   mutableSubs.add(realm.objects("Cat").filtered("age > 10"));
             *   mutableSubs.add(realm.objects("Dog").filtered("age > 20"));
             *   mutableSubs.removeByName("personSubs");
             * });
             * // `realm` will now return the expected results based on the updated subscriptions
             * ```
             *
             * @param callback A callback function which receives a
             * {@link Realm.App.Sync.MutableSubscriptionSet} instance as the
             * first argument, which can be used to add or remove subscriptions
             * from the set, and the {@link Realm} associated with the SubscriptionSet
             * as the second argument (mainly useful when working with
             * `initialSubscriptions` in
             * {@link Realm.App.Sync.FlexibleSyncConfiguration}).
             *
             * @returns A promise which resolves when the SubscriptionSet is synchronized, or is rejected
             * if there was an error during synchronization (see {@link waitForSynchronisation})
             */
            update: (callback: (mutableSubs: MutableSubscriptionSet, realm: Realm) => void) => Promise<void>;
        }

        const SubscriptionSet: {
            new(): never; // This type isn't supposed to be constructed manually by end users.
            readonly prototype: SubscriptionSet;
        };

        /**
         * The mutable version of a given SubscriptionSet. The mutable methods of a given
         * {@link SubscriptionSet} instance can only be accessed from inside the {@link SubscriptionSet.update}
         * callback.
         */
        interface MutableSubscriptionSet extends BaseSubscriptionSet {
            new(): never; // This type isn't supposed to be constructed manually by end users.

            /**
             * Adds a query to the set of active subscriptions. The query will be joined via
             * an `OR` operator with any existing queries for the same type.
             *
             * A query is represented by a {@link Realm.Results} instance returned from {@link Realm.objects},
             * for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.
             *
             * @param query A {@link Realm.Results} instance representing the query to subscribe to.
             * @param options An optional {@link SubscriptionOptions} object containing options to
             * use when adding this subscription (e.g. to give the subscription a name).
             * @returns A `Subscription` instance for the new subscription.
             */
            add: (query: Realm.Results<unknown>, options?: SubscriptionOptions) => Subscription;

            /**
             * Removes a subscription with the given query from the SubscriptionSet.
             *
             * @param query A {@link Realm.Results} instance representing the query to remove a subscription to.
             * @returns `true` if the subscription was removed, `false` if it was not found.
             */
            remove: (query: Realm.Results<unknown>) => boolean;

            /**
             * Removes a subscription with the given name from the SubscriptionSet.
             *
             * @param name The name of the subscription to remove.
             * @returns `true` if the subscription was removed, `false` if it was not found.
             */
            removeByName: (name: string) => boolean;

            /**
             * Removes the specified subscription from the SubscriptionSet.
             *
             * @param subscription The {@link Subscription} instance to remove.
             * @returns `true` if the subscription was removed, `false` if it was not found.
             */
            removeSubscription: (subscription: Subscription) => boolean;

            /**
             * Removes all subscriptions for the specified object type from the SubscriptionSet.
             *
             * @param objectType The string name of the object type to remove all subscriptions for.
             * @returns The number of subscriptions removed.
             */
            removeByObjectType: (objectType: string) => number;

            /**
             * Removes all subscriptions from the SubscriptionSet.
             *
             * @returns The number of subscriptions removed.
             */
            removeAll: () => number;
        }

        const MutableSubscriptionSet: {
            new(): never; // This type isn't supposed to be constructed manually by end users.
            readonly prototype: MutableSubscriptionSet;
        };
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
 * Exchanges properties defined as Realm.List<Model> with an optional Array<Model | Unmanaged<Model>>.
 */
type RealmListsRemappedModelPart<T> = {
    [K in ExtractPropertyNamesOfType<T, Realm.List<any>>]?: T[K] extends Realm.List<infer GT> ? Array<GT | Unmanaged<GT>> : never
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

/** Make all fields optional except those specified in K */
type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Omits all properties of a model which are not defined by the schema,
 * making all properties optional except those specified in RequiredProperties.
 */
type OmittedRealmTypesWithRequired<T, RequiredProperties extends keyof OmittedRealmTypes<T>> =
    OptionalExcept<OmittedRealmTypes<T>, RequiredProperties>;

/** Remaps realm types to "simpler" types (arrays and objects) */
type RemappedRealmTypes<T> =
    RealmListsRemappedModelPart<T> &
    RealmDictionaryRemappedModelPart<T>;

/**
 * Joins T stripped of all keys which value extends Realm.Collection and all inherited from Realm.Object,
 * with only the keys which value extends Realm.List, remapped as Arrays. All properties are optional
 * except those specified in RequiredProperties.
 */
type Unmanaged<T, RequiredProperties extends keyof OmittedRealmTypes<T> = never> =
    OmittedRealmTypesWithRequired<T, RequiredProperties> & RemappedRealmTypes<T>;

/**
 * ReadonlyArray with members marked as deprecated.
 */
interface DeprecatedReadonlyArray<T> extends ReadonlyArray<T> {
    /**@deprecated */
    toString(): string;
    /**@deprecated */
    toLocaleString(): string;
    /**@deprecated */
    concat(...items: ConcatArray<T>[]): T[];
    /**@deprecated */
    concat(...items: (T | ConcatArray<T>)[]): T[];
    /**@deprecated */
    join(separator?: string): string;
    /**@deprecated */
    slice(start?: number, end?: number): T[];
    /**@deprecated */
    indexOf(searchElement: T, fromIndex?: number): number;
    /**@deprecated */
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    /**@deprecated */
    every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): this is readonly S[];
    /**@deprecated */
    every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
    /**@deprecated */
    some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
    /**@deprecated */
    forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void;
    /**@deprecated */
    map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[];
    /**@deprecated */
    filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
    /**@deprecated */
    filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
    /**@deprecated */
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
    /**@deprecated */
    reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
    /**@deprecated */
    reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
    /**@deprecated */
    reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
    /**@deprecated */
    reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
    /**@deprecated */
    reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;

    /**@deprecated */
    readonly [n: number]: T;
}

declare class Realm {
    static defaultPath: string;

    readonly isEmpty: boolean;
    readonly path: string;
    readonly isReadOnly: boolean;
    readonly schema: Realm.CanonicalObjectSchema[];
    readonly schemaVersion: number;
    readonly isInTransaction: boolean;
    readonly isClosed: boolean;

    readonly syncSession: Realm.App.Sync.Session | null;

    /**
     * Get the latest set of flexible sync subscriptions.
     * @throws if flexible sync is not enabled for this app
     */
    readonly subscriptions: Realm.App.Sync.SubscriptionSet

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
     * Copy any Realm files  (i.e. `*.realm`) bundled with the application from the application
     * directory into the application's documents directory, so that they can be opened and used
     * by Realm. If the file already exists in the documents directory, it will not be
     * overwritten, so this can safely be called multiple times.
     *
     * This should be called before opening the Realm, in order to move the bundled Realm
     * files into a place where they can be written to, for example:
     *
     * ```
     * // Given a bundled file, example.realm, this will copy example.realm (and any other .realm files)
     * // from the app bundle into the app's documents directory. If the file already exists, it will
     * // not be overwritten, so it is safe to call this every time the app starts.
     * Realm.copyBundledRealmFiles();
     *
     * const realm = await Realm.open({
     *   // This will open example.realm from the documents directory, with the bundled data in.
     *   path: "example.realm"
     * });
     * ```
     *
     * This is only implemented for React Native.
     *
     * @throws {Error} If an I/O error occured or method is not implemented.
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
    create<T>(type: string, properties: Unmanaged<T>, mode?: Realm.UpdateMode.Never): T & Realm.Object;
    create<T>(type: string, properties: Partial<T> | Partial<Unmanaged<T>>, mode: Realm.UpdateMode.All | Realm.UpdateMode.Modified): T & Realm.Object;

    /**
     * @param  {Class} type
     * @param  {T} properties
     * @param  {Realm.UpdateMode} mode? If not provided, `Realm.UpdateMode.Never` is used.
     * @returns T
     */
    create<T extends Realm.Object<any>>(type: {new(...arg: any[]): T; }, properties: Unmanaged<T>, mode?: Realm.UpdateMode.Never): T;
    create<T extends Realm.Object<any>>(type: {new(...arg: any[]): T; }, properties: Partial<T> | Partial<Unmanaged<T>>, mode: Realm.UpdateMode.All | Realm.UpdateMode.Modified): T;

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
     * @returns {T | null}
     */
    objectForPrimaryKey<T>(type: string, key: Realm.PrimaryKey): (T & Realm.Object) | null;

    /**
     * @param  {Class} type
     * @param  {number|string|ObjectId|UUID} key
     * @returns {T | undefined}
     */
    objectForPrimaryKey<T extends Realm.Object>(type: {new(...arg: any[]): T; }, key: Realm.PrimaryKey): T | undefined;

    // Combined definitions
    objectForPrimaryKey<T>(type: string | {new(...arg: any[]): T; }, key: Realm.PrimaryKey): (T & Realm.Object<T>) | undefined;

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
     * Writes a compacted copy of the Realm with the given configuration.
     *
     * The destination file cannot already exist.
     * All conversions between synced and non-synced Realms are supported, and will be
     * performed according to the `config` parameter, which describes the desired output.
     *
     * Note that if this method is called from within a write transaction, the current data is written,
     * not the data from the point when the previous write transaction was committed.
     * @param {Realm~Configuration} config Realm configuration that describes the output realm.
     */
    writeCopyTo(config: Realm.Configuration): void;

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
