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

export {
  ApiKey,
  ApiKeyAuth,
  App,
  AppChangeCallback,
  AppConfiguration,
  BaseConfiguration,
  BaseObjectSchema,
  BaseSubscriptionSet,
  BaseSyncConfiguration,
  BSON,
  CanonicalObjectSchema,
  /** @deprecated Got renamed to {@link CanonicalPropertySchema} */
  CanonicalObjectSchemaProperty,
  CanonicalPropertiesTypes,
  CanonicalPropertySchema,
  ClientResetAfterCallback,
  ClientResetBeforeCallback,
  ClientResetConfig,
  ClientResetDiscardUnsyncedChangesConfiguration,
  ClientResetFallbackCallback,
  ClientResetManualConfiguration,
  ClientResetMode,
  ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
  ClientResetRecoverUnsyncedChangesConfiguration,
  /**  @deprecated Got renamed to {@link ClientResetRecoverUnsyncedChangesConfiguration} */
  ClientResetRecoverUnsyncedChangesConfiguration as ClientResetRecoveryConfiguration,
  Collection,
  CollectionChangeCallback,
  CollectionChangeSet,
  CollectionPropertyTypeName,
  Configuration,
  ConfigurationWithoutSync,
  ConfigurationWithSync,
  ConnectionNotificationCallback,
  ConnectionState,
  Credentials,
  DefaultFunctionsFactory,
  DefaultUserProfileData,
  Dictionary,
  DictionaryChangeCallback,
  DictionaryChangeSet,
  EmailPasswordAuth,
  ErrorCallback,
  flags,
  FlexibleSyncConfiguration,
  List,
  LocalAppConfiguration,
  LogLevel,
  MigrationCallback,
  MutableSubscriptionSet,
  NumericLogLevel,
  /** @deprecated Got renamed to {@link RealmObjectConstructor} */
  RealmObjectConstructor as ObjectClass,
  ObjectChangeCallback,
  ObjectChangeSet,
  ObjectSchema,
  ObjectSchemaProperty,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  OrderedCollection,
  PartitionSyncConfiguration,
  PartitionValue,
  PrimaryKey,
  PrimitivePropertyTypeName,
  ProgressDirection,
  ProgressMode,
  ProgressNotificationCallback,
  ProgressRealmPromise,
  PropertiesTypes,
  PropertySchema,
  PropertySchemaShorthand,
  PropertySchemaStrict,
  PropertyTypeName,
  ProviderType,
  Realm,
  RealmFunction,
  RealmObject as Object,
  RealmObjectConstructor,
  RealmSet as Set,
  RelationshipPropertyTypeName,
  Results,
  SessionState,
  SessionStopPolicy,
  SortDescriptor,
  Subscription,
  SubscriptionOptions,
  SubscriptionSet,
  SubscriptionsState,
  SyncConfiguration,
  SyncError,
  SyncSession,
  /** @deprecated Got renamed to {@link SyncSession} */
  SyncSession as Session,
  Types,
  UpdateMode,
  User,
  UserChangeCallback,
  UserState,
  UserTypeName,
} from "./internal";

import { Realm, RealmObjectConstructor } from "./internal";

export type Mixed = unknown;
export type ObjectType = string | RealmObjectConstructor;

// Exporting default for backwards compatibility
export default Realm;
