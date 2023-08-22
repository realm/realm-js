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

import {
  AnyRealmObject,
  ObjectSchema,
  Realm,
  RealmObjectConstructor,
  SyncConfiguration,
  TypeAssertionError,
  assert,
  validateRealmSchema,
  validateSyncConfiguration,
} from "./internal";

/**
 * A function which can be called to migrate a Realm from one version of the schema to another.
 */
export type MigrationCallback = (oldRealm: Realm, newRealm: Realm) => void;

/**
 * This describes options used during schema migration.
 */
export type MigrationOptions = {
  /**
   * A flag to indicate whether Realm should resolve
   * embedded object constraints after migration. If this is `true` then all embedded objects
   * without a parent will be deleted and every embedded object with every embedded object with
   * one or more references to it will be duplicated so that every referencing object will hold
   * its own copy of the embedded object.
   * @default false
   * @since 12.1.0
   */
   resolveEmbeddedConstraints?: boolean;
 };

/**
 * The options used to create a {@link Realm} instance.
 */
export type BaseConfiguration = {
  /**
   * The path to the file where the Realm database should be stored. For synced Realms, a relative path
   * is used together with the {@link AppConfiguration.id | app ID} and {@link User.id | user ID} in order to avoid collisions with other apps or users.
   * An absolute path is left untouched and on some platforms (iOS and Android) the app might not have
   * permissions to create or open the file - permissions are not validated.
   * If a relative path is specified, it is relative to {@link AppConfiguration.baseFilePath}.
   * @since 0.10.0
   */
  path?: string;
  /**
   * Specifies all the object types in this Realm. **Required** when first creating a Realm at this `path`.
   * If omitted, the schema will be read from the existing Realm file.
   * @since 0.10.0
   */
  schema?: (RealmObjectConstructor<AnyRealmObject> | ObjectSchema)[];
  /**
   * If changing the `schema`, this field is **required** and must be incremented. This only
   * applies to local Realms.
   * @since 0.11.0
   */
  schemaVersion?: number;
  /**
   * Specifies if this Realm should be opened in-memory. This
   * still requires a path (can be the default path) to identify the Realm so other processes can
   * open the same Realm. The file will also be used as swap space if the Realm becomes bigger than
   * what fits in memory, but it is not persistent and will be removed when the last instance
   * is closed. This option is incompatible with option `sync`.
   * @default false
   * @since 0.10.0
   */
  inMemory?: boolean;
  /**
   * Specifies if this Realm should be opened as read-only.
   * @default false
   * @since 0.10.0
   */
  readOnly?: boolean;
  /**
   * Opening a Realm creates a number of FIFO special files in order to
   * coordinate access to the Realm across threads and processes. If the Realm file is stored in a location
   * that does not allow the creation of FIFO special files (e.g. FAT32 file systems), then the Realm cannot be opened.
   * In that case Realm needs a different location to store these files and this property defines that location.
   * The FIFO special files are very lightweight and the main Realm file will still be stored in the location defined
   * by the `path` property. This property is ignored if the directory defined by `path` allow FIFO special files.
   * @since 2.23.0
   */
  fifoFilesFallbackPath?: string;
  sync?: SyncConfiguration;
  /** @internal */
  openSyncedRealmLocally?: true;
  /**
   * The function called when opening a Realm for the first time during the life of
   * a process to determine if it should be compacted before being returned to the user.
   *
   * It returns `true` to indicate that an attempt to compact the file should be made. The compaction
   * will be skipped if another process is accessing it.
   * @param totalBytes - The total file size (data + free space).
   * @param usedBytes - The total bytes used by data in the file.
   * @returns `true` if Realm file should be compacted before opening.
   * @since 2.9.0
   * @example
   * // compact large files (>100 MB) with more than half is free space
   * shouldCompact: (totalBytes, usedBytes) => {
   *   const oneHundredMB = 100 * 1024 * 1024; // 100 MB
   *   return totalBytes > oneHundredMB && usedBytes / totalBytes < 0.5;
   * }
   */
  shouldCompact?: (totalBytes: number, usedBytes: number) => boolean;
  /**
   * Specifies if this Realm should be deleted if a migration is needed.
   * The option is incompatible with option `sync`.
   * @default: false
   * @since 1.13.0
   */
  deleteRealmIfMigrationNeeded?: boolean;
  /**
   * Specifies if this Realm's file format should
   * be automatically upgraded if it was created with an older version of the Realm library.
   * If set to `true` and a file format upgrade is required, an error will be thrown instead.
   * @default false
   * @since 2.1.0
   */
  disableFormatUpgrade?: boolean;
  /**
   * The 512-bit (64-byte) encryption key used to encrypt and decrypt all data in the Realm.
   * @since 0.11.1
   */
  encryptionKey?: ArrayBuffer | ArrayBufferView | Int8Array;
  /**
   * The function to run if a migration is needed.
   *
   * This function should provide all the logic for converting data models from previous schemas
   * to the new schema. This option is incompatible with option `sync`.
   *
   * The function takes two arguments:
   *   - `oldRealm` - The Realm before migration is performed.
   *   - `newRealm` - The Realm that uses the latest `schema`, which should be modified as necessary.
   * @since 0.12.0
   */
  onMigration?: MigrationCallback;
  /**
   * The function called when opening a Realm for the first time. The function can populate the Realm
   * prior to opening it. When calling the callback, the Realm will be in a write transaction.
   * @param realm - The newly created Realm.
   * @since 10.14.0
   */
  onFirstOpen?: (realm: Realm) => void;
  migrationOptions?: MigrationOptions;
};

export type ConfigurationWithSync = BaseConfiguration & {
  sync: SyncConfiguration;
};

export type ConfigurationWithoutSync = BaseConfiguration & {
  sync?: never;
};

export type Configuration = ConfigurationWithSync | ConfigurationWithoutSync;

/**
 * Validate the fields of a user-provided Realm configuration.
 * @internal
 */
export function validateConfiguration(config: unknown): asserts config is Configuration {
  assert.object(config, "realm configuration", { allowArrays: false });
  const {
    path,
    schema,
    schemaVersion,
    inMemory,
    readOnly,
    fifoFilesFallbackPath,
    sync,
    openSyncedRealmLocally,
    shouldCompact,
    deleteRealmIfMigrationNeeded,
    disableFormatUpgrade,
    encryptionKey,
    onMigration,
    autoResolveEmbeddedConstraintsInMigration,
  } = config;

  if (path !== undefined) {
    assert.string(path, "'path' on realm configuration");
    assert(path.length > 0, "The path cannot be empty. Provide a path or remove the field.");
  }
  if (schema !== undefined) {
    validateRealmSchema(schema);
  }
  if (schemaVersion !== undefined) {
    assert.number(schemaVersion, "'schemaVersion' on realm configuration");
    assert(
      schemaVersion >= 0 && Number.isInteger(schemaVersion),
      "'schemaVersion' on realm configuration must be 0 or a positive integer.",
    );
  }
  if (inMemory !== undefined) {
    assert.boolean(inMemory, "'inMemory' on realm configuration");
  }
  if (readOnly !== undefined) {
    assert.boolean(readOnly, "'readOnly' on realm configuration");
  }
  if (fifoFilesFallbackPath !== undefined) {
    assert.string(fifoFilesFallbackPath, "'fifoFilesFallbackPath' on realm configuration");
  }
  if (onMigration !== undefined) {
    assert.function(onMigration, "'onMigration' on realm configuration");
  }
  if (sync !== undefined) {
    assert(!onMigration, "The realm configuration options 'onMigration' and 'sync' cannot both be defined.");
    assert(inMemory === undefined, "The realm configuration options 'inMemory' and 'sync' cannot both be defined.");
    assert(
      deleteRealmIfMigrationNeeded === undefined,
      "The realm configuration options 'deleteRealmIfMigrationNeeded' and 'sync' cannot both be defined.",
    );
    validateSyncConfiguration(sync);
  }
  if (openSyncedRealmLocally !== undefined) {
    // Internal use
    assert(
      openSyncedRealmLocally === true,
      "'openSyncedRealmLocally' on realm configuration is only used internally and must be true if defined.",
    );
  }
  if (shouldCompact !== undefined) {
    assert.function(shouldCompact, "'shouldCompact' on realm configuration");
  }
  if (deleteRealmIfMigrationNeeded !== undefined) {
    assert.boolean(deleteRealmIfMigrationNeeded, "'deleteRealmIfMigrationNeeded' on realm configuration");
  }
  if (disableFormatUpgrade !== undefined) {
    assert.boolean(disableFormatUpgrade, "'disableFormatUpgrade' on realm configuration");
  }
  if (encryptionKey !== undefined) {
    assert(
      encryptionKey instanceof ArrayBuffer || ArrayBuffer.isView(encryptionKey) || encryptionKey instanceof Int8Array,
      `Expected 'encryptionKey' on realm configuration to be an ArrayBuffer, ArrayBufferView (Uint8Array), or Int8Array, got ${TypeAssertionError.deriveType(
        encryptionKey,
      )}.`,
    );
  }
  if (autoResolveEmbeddedConstraintsInMigration !== undefined) {
    assert.boolean(
      autoResolveEmbeddedConstraintsInMigration,
      "'autoResolveEmbeddedConstraintsInMigration' on realm configuration",
    );
  }
}
