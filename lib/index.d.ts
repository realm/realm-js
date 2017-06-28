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

declare namespace Realm {
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
    }

    // properties types
    interface PropertiesTypes {
        [keys: string]: PropertyType | ObjectSchemaProperty;
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
     * realm configuration
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.html#~Configuration }
     */
    interface Configuration {
        encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
        migration?: (oldRealm: Realm, newRealm: Realm) => void;
        path?: string;
        readOnly?: boolean;
        schema?: ObjectClass[] | ObjectSchema[];
        schemaVersion?: number;
        sync?: Realm.Sync.SyncConfiguration;
    }

    // object props type
    interface ObjectPropsType {
        [keys: string]: any;
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
        linkingObjects<T>(objectType: string, property: string): Results<T>;
    }

    const Object: {
        readonly prototype: Object;
    }

    /**
     * SortDescriptor
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html#~SortDescriptor }
     */
    type SortDescriptor = string | [string, boolean] | any[];

    interface CollectionChangeSet {
        insertions: number[];
        deletions: number[];
        modifications: number[];
    }

    type CollectionChangeCallback<T> = (collection: Collection<T>, change: CollectionChangeSet) => void;

    /**
     * Collection
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Collection.html }
     */
    interface Collection<T> extends ReadonlyArray<T> {
        /**
         * @returns boolean
         */
        isValid(): boolean;

        /**
         * @param  {string} query
         * @param  {any[]} ...arg
         * @returns Results
         */
        filtered(query: string, ...arg: any[]): Results<T>;

        /**
         * @param  {string|SortDescriptor} descriptor
         * @param  {boolean} reverse?
         * @returns Results
         */
        sorted(descriptor: string | SortDescriptor, reverse?: boolean): Results<T>;

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

        /**
         * @returns T
         */
        pop(): T | null | undefined;

        /**
         * @param  {T} object
         * @returns number
         */
        push(object: T): number;

        /**
         * @returns T
         */
        shift(): T | null | undefined;

        /**
         * @param  {number} index
         * @param  {number} count?
         * @param  {any} object?
         * @returns T
         */
        splice(index: number, count?: number, object?: any): T[];

        /**
         * @param  {T} object
         * @returns number
         */
        unshift(object: T): number;
    }

    const List: {
        readonly prototype: List<any>;
    };

    /**
     * Results
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Results.html }
     */
    interface Results<T> extends Collection<T> {

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

    /**
     * User
     * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.User.html }
     */
    class User {
        static readonly all: { [identity: string]: User };
        static readonly current: User;
        readonly identity: string;
        readonly isAdmin: boolean;
        readonly server: string;
        readonly token: string;
        static adminUser(adminToken: string): User;
        static login(server: string, username: string, password: string, callback: (error: any, user: User) => void): void;
        static loginWithProvider(server: string, provider: string, providerToken: string, callback: (error: any, user: User) => void): void;
        static register(server: string, username: string, password: string, callback: (error: any, user: User) => void): void;
        static registerWithProvider(server: string, options: { provider: string, providerToken: string, userInfo: any }, callback: (error: Error | null, user: User | null) => void): void;
        logout(): void;
        openManagementRealm(): Realm;
    }

    interface SyncConfiguration {
        user: User;
        url: string;
        validate_ssl?: boolean;
        ssl_trust_certificate_path?: string;
    }

    /**
    * Session
    * @see { @link https://realm.io/docs/javascript/latest/api/Realm.Sync.Session.html }
    */
    class Session {
        readonly config: SyncConfiguration;
        readonly state: 'invalid' | 'active' | 'inactive';
        readonly url: string;
        readonly user: User;
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
        readonly changes: { [object_type: string]: CollectionChangeSet };
        readonly oldRealm: Realm;
        readonly path: string;
        readonly realm: Realm;
    }

    function addListener(serverURL: string, adminUser: Realm.Sync.User, regex: string, name: string, changeCallback: (changeEvent: ChangeEvent) => void): void;
    function removeAllListeners(name?: string): void;
    function removeListener(regex: string, name: string, changeCallback: (changeEvent: ChangeEvent) => void): void;
    function setLogLevel(logLevel: 'error' | 'info' | 'debug'): void;
    function setAccessToken(accessToken: string): void;

    type Instruction = {
        type: 'INSERT' | 'SET' | 'DELETE' | 'CLEAR' | 'LIST_SET' | 'LIST_INSERT' | 'LIST_ERASE' | 'LIST_CLEAR' | 'ADD_TYPE' | 'ADD_PROPERTIES'
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
            regex: string,
            change_callback: Function
        )

        /**
         * Advance the to the next transaction indicating that you are done processing the current instructions for the given Realm.
         * @param path the path for the Realm to advance
         */
        advance(path: string): void;
        close(): void;
        current(path: string): Array<Instruction>;
        realmAtPath(path: string, realmID?: string, schema?: ObjectSchema[]): Realm
    }
}

declare class Realm {
    static defaultPath: string;

    readonly path: string;
    readonly readOnly: boolean;
    readonly schema: Realm.ObjectSchema[];
    readonly schemaVersion: number;

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
    static open(config: Realm.Configuration): Promise<Realm>
    /**
     * Open a realm asynchronously with a callback. If the realm is synced, it will be fully synchronized before it is available.
     * @param {Configuration} config 
     * @param {Function} callback will be called when the realm is ready.
     */
    static openAsync(config: Realm.Configuration, callback: (error: any, realm: Realm) => void): void

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
     */
    create<T>(type: string | Realm.ObjectClass | Function, properties: T & Realm.ObjectPropsType, update?: boolean): T;

    /**
     * @param  {Realm.Object|Realm.Object[]|Realm.List<any>|Realm.Results<any>|any} object
     * @returns void
     */
    delete(object: Realm.Object | Realm.Object[] | Realm.List<any> | Realm.Results<any> | any): void;

    /**
     * @returns void
     */
    deleteAll(): void;

    /**
     * @param  {string|Realm.ObjectSchema|Function} type
     * @param  {number|string} key
     * @returns T
     */
    objectForPrimaryKey<T>(type: string | Realm.ObjectSchema | Function, key: number | string): T | null;

    /**
     * @param  {string|Realm.ObjectType|Function} type
     * @returns Realm
     */
    objects<T>(type: string | Realm.ObjectSchema | Function): Realm.Results<T>;

    /**
     * @param  {string} name
     * @param  {()=>void} callback
     * @returns void
     */
    addListener(name: string, callback: (sender: Realm, event: 'change') => void): void;

    /**
     * @param  {string} name
     * @param  {()=>void} callback
     * @returns void
     */
    removeListener(name: string, callback: (sender: Realm, event: 'change') => void): void;

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
}

declare module 'realm' {
    export = Realm
}
