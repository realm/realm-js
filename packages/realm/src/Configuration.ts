////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { ObjectSchema, RealmObjectConstructor, assert, DefaultObject, RealmObject } from "./internal";

// export type Configuration = ConfigurationWithSync | ConfigurationWithoutSync;
export type Configuration = BaseConfiguration;

type BaseConfiguration = {
  path?: string;
  schema?: (RealmObjectConstructor<any> | ObjectSchema)[];
  schemaVersion?: number;
  inMemory?: boolean;
  readOnly?: boolean;
  fifoFilesFallbackPath?: string;
  sync?: unknown;
  shouldCompactOnLaunch?: (totalBytes: number, usedBytes: number) => boolean;
  deleteRealmIfMigrationNeeded?: boolean;
  disableFormatUpgrade?: boolean;
  encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
};

// type ConfigurationWithSync = BaseConfiguration & {
//   sync: Record<string, unknown>;
// };

// type ConfigurationWithoutSync = BaseConfiguration & {
//   sync?: never;
// };

// export type PartitionValue = string | number | null | ObjectId | UUID;

// /**
//  * A function which can be called to migrate a Realm from one version of the schema to another.
//  */
// export type MigrationCallback = (oldRealm: Realm, newRealm: Realm) => void;

// export type SSLVerifyObject = {
//   serverAddress: string;
//   serverPort: number;
//   pemCertificate: string;
//   acceptedByOpenSSL: boolean;
//   depth: number;
// };

// export type SSLVerifyCallback = (sslVerifyObject: SSLVerifyObject) => boolean;
// export type SSLConfiguration = {
//   validate?: boolean;
//   certificatePath?: string;
//   validateCallback?: SSLVerifyCallback;
// };

// export enum ClientResetModeManualOnly {
//   Manual = "manual",
// }

// export enum ClientResetMode {
//   Manual = "manual",
//   DiscardLocal = "discardLocal",
// }

// export type ClientResetBeforeCallback = (localRealm: Realm) => void;
// export type ClientResetAfterCallback = (localRealm: Realm, remoteRealm: Realm) => void;
// export type ClientResetConfiguration<ClientResetModeT = ClientResetMode> = {
//   mode: ClientResetModeT;
//   clientResetBefore?: ClientResetBeforeCallback;
//   clientResetAfter?: ClientResetAfterCallback;
// };

// export type BaseSyncConfiguration = {
//   user: User;
//   customHttpHeaders?: { [header: string]: string };
//   ssl?: SSLConfiguration;
//   _sessionStopPolicy?: SessionStopPolicy;
//   newRealmFileBehavior?: OpenRealmBehaviorConfiguration;
//   existingRealmFileBehavior?: OpenRealmBehaviorConfiguration;
//   error?: ErrorCallback;
// };

// // We only allow `flexible` to be `true` or `undefined` - `{ flexible: false }`
// // is not allowed. This is because TypeScript cannot discriminate that
// // type correctly with `strictNullChecks` disabled, and there's no real use
// // case for `{ flexible: false }`.
// export type FlexibleSyncConfiguration = BaseSyncConfiguration & {
//   flexible: true;
//   partitionValue?: never;
//   clientReset?: ClientResetConfiguration<ClientResetModeManualOnly>;
//   /**
//    * Optional object to configure the setup of an initial set of flexible
//    * sync subscriptions to be used when opening the Realm. If this is specified,
//    * {@link Realm.open} will not resolve until this set of subscriptions has been
//    * fully synchronized with the server.
//    *
//    * Example:
//    * ```
//    * const config: Realm.Configuration = {
//    *   sync: {
//    *     user,
//    *     flexible: true,
//    *     initialSubscriptions: {
//    *       update: (subs, realm) => {
//    *         subs.add(realm.objects('Task'));
//    *       },
//    *       rerunOnOpen: true,
//    *     },
//    *   },
//    *   // ... rest of config ...
//    * };
//    * const realm = await Realm.open(config);
//    *
//    * // At this point, the Realm will be open with the data for the initial set
//    * // subscriptions fully synchronised.
//    * ```
//    */
//   initialSubscriptions?: {
//     /**
//      * Callback called with the {@link Realm} instance to allow you to setup the
//      * initial set of subscriptions by calling `realm.subscriptions.update`.
//      * See {@link Realm.App.Sync.SubscriptionSet.update} for more information.
//      */
//     update: (subs: Realm.App.Sync.MutableSubscriptionSet, realm: Realm) => void;
//     /**
//      * If `true`, the {@link update} callback will be rerun every time the Realm is
//      * opened (e.g. every time a user opens your app), otherwise (by default) it
//      * will only be run if the Realm does not yet exist.
//      */
//     rerunOnOpen?: boolean;
//   };
// };

// export type PartitionSyncConfiguration = BaseSyncConfiguration & {
//   flexible?: never;
//   partitionValue: PartitionValue;
//   clientReset?: ClientResetConfiguration<ClientResetMode>;
// };

// export type SyncConfiguration = FlexibleSyncConfiguration | PartitionSyncConfiguration;

// export type BaseConfiguration = {
//   encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
//   schema?: (ObjectConstructor | ObjectSchema)[];
//   schemaVersion?: number;
//   shouldCompactOnLaunch?: (totalBytes: number, usedBytes: number) => boolean;
//   onFirstOpen?: (realm: Realm) => void;
//   path?: string;
//   fifoFilesFallbackPath?: string;
//   readOnly?: boolean;
// };

// export type ConfigurationWithSync = BaseConfiguration & {
//   sync: SyncConfiguration;
//   migration?: never;
//   inMemory?: never;
//   deleteRealmIfMigrationNeeded?: never;
//   disableFormatUpgrade?: never;
// };

// export type ConfigurationWithoutSync = BaseConfiguration & {
//   sync?: never;
//   migration?: MigrationCallback;
//   inMemory?: boolean;
//   deleteRealmIfMigrationNeeded?: boolean;
//   disableFormatUpgrade?: boolean;
// };

export function validateConfiguration(arg: unknown): asserts arg is Configuration {
  assert.object(arg);
  const { path, schema } = arg;
  if (typeof path === "string") {
    assert(path.length > 0, "Expected a non-empty path or none at all");
  }
  if (schema) {
    validateRealmSchema(schema);
  }
}

export function validateRealmSchema(schema: unknown): asserts schema is Configuration["schema"][] {
  assert.array(schema, "schema");
  schema.forEach(validateObjectSchema);
  // TODO: Assert that backlinks point to object schemas that are actually declared
}

export function validateObjectSchema(arg: unknown): asserts arg is ObjectSchema {
  if (typeof arg === "function") {
    // Class based model
    const clazz = arg as unknown as DefaultObject;
    // We assert this later, but want a custom error message
    if (!(arg.prototype instanceof RealmObject)) {
      const schemaName = clazz.schema && (clazz.schema as DefaultObject).name;
      if (typeof schemaName === "string" && schemaName != arg.name) {
        throw new TypeError(`Class '${arg.name}' (declaring '${schemaName}' schema) must extend Realm.Object`);
      } else {
        throw new TypeError(`Class '${arg.name}' must extend Realm.Object`);
      }
    }
    assert.object(clazz.schema, "schema static");
    validateObjectSchema(clazz.schema);
  } else {
    assert.object(arg, "object schema");
    const { name, properties, asymmetric, embedded } = arg;
    assert.string(name, "name");
    assert.object(properties, "properties");
    if (typeof asymmetric !== "undefined") {
      assert.boolean(asymmetric);
    }
    if (typeof embedded !== "undefined") {
      assert.boolean(embedded);
    }
    assert(!asymmetric || !embedded, `Cannot be both asymmetric and embedded`);
  }
}
