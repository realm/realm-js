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
  App,
  AppChangeCallback,
  AppConfiguration,
  BaseConfiguration,
  BaseObjectSchema,
  BaseSubscriptionSet,
  BaseSyncConfiguration,
  BSON,
  CanonicalObjectSchemaProperty,
  CanonicalPropertiesTypes,
  ClientResetAfterCallback,
  ClientResetBeforeCallback,
  ClientResetConfig,
  ClientResetDiscardUnsyncedChangesConfiguration,
  ClientResetFallbackCallback,
  ClientResetManualConfiguration,
  ClientResetMode,
  ClientResetRecoverOrDiscardUnsyncedChangesConfiguration,
  ClientResetRecoverUnsyncedChangesConfiguration,
  /**
   * This type got renamed to {@link ClientResetRecoverUnsyncedChangesConfiguration}
   * @deprecated Please use named imports
   */
  ClientResetRecoverUnsyncedChangesConfiguration as ClientResetRecoveryConfiguration,
  Collection,
  CollectionChangeCallback,
  CollectionChangeSet,
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
  ErrorCallback,
  flags,
  FlexibleSyncConfiguration,
  List,
  LocalAppConfiguration,
  LogLevel,
  MigrationCallback,
  MutableSubscriptionSet,
  NumericLogLevel,
  /**
   * This type got renamed to {@link RealmObjectConstructor}
   * @deprecated Please use named imports
   */
  RealmObjectConstructor as ObjectClass,
  ObjectChangeCallback,
  ObjectChangeSet,
  ObjectSchema,
  OpenRealmBehaviorConfiguration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  OrderedCollection,
  PartitionSyncConfiguration,
  PartitionValue,
  PrimaryKey,
  ProgressDirection,
  ProgressMode,
  ProgressNotificationCallback,
  ProgressRealmPromise,
  PropertiesTypes,
  PropertySchema,
  ObjectSchemaProperty,
  PropertySchemaShorthand,
  ProviderType,
  Realm,
  RealmFunction,
  RealmObject as Object,
  RealmObjectConstructor,
  RealmSet as Set,
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
  /**
   * @deprecated Got renamed to {@link SyncSession} and please use named imports
   */
  SyncSession as Session,
  Types,
  UpdateMode,
  User,
  UserChangeCallback,
  UserState,
  EmailPasswordAuth,
  ApiKey,
  ApiKeyAuth,
} from "./internal";

import { Realm, RealmObjectConstructor } from "./internal";

export type Mixed = unknown;
export type ObjectType = string | RealmObjectConstructor;

// Exporting default for backwards compatibility
export default Realm;
