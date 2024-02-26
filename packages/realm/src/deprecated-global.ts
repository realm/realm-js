////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { Realm as RealmConstructor, flags, safeGlobalThis } from "./internal";
import * as internal from "./internal";

let warnedAboutGlobalRealmUse = false;
Object.defineProperty(safeGlobalThis, "Realm", {
  get() {
    if (flags.THROW_ON_GLOBAL_REALM) {
      throw new Error(
        "Accessed global Realm, please update your code to ensure you import Realm:\nimport Realm from 'realm';",
      );
    } else if (!warnedAboutGlobalRealmUse) {
      // eslint-disable-next-line no-console
      console.warn(
        "Your app is relying on a Realm global, which will be removed in realm-js v13, please update your code to ensure you import Realm:\n\n",
        'import Realm from "realm"; // For ES Modules\n',
        'const Realm = require("realm"); // For CommonJS\n\n',
        "To determine where, put this in the top of your index file:\n",
        `import Realm from "realm";\n`,
        `Realm.flags.THROW_ON_GLOBAL_REALM = true`,
      );
      warnedAboutGlobalRealmUse = true;
    }
    return RealmConstructor;
  },
  configurable: true,
});

declare global {
  // No need to keep this updated with the namespace in Realm.ts, since this is marked as deprecated
  // We cannot simply "export import Realm" here, because that results in ts(2667):
  // "Imports are not permitted in module augmentations. Consider moving them to the enclosing external module."

  /* eslint-disable @typescript-eslint/no-namespace */

  /** @deprecated Will be removed in v13.0.0. Please use an import statement. */
  export class Realm extends RealmConstructor {}
  /**
   * @deprecated Will be removed in v13.0.0. Please use an import statement.
   */
  export namespace Realm {
    export import Realm = RealmItself;
    export import flags = internal.flags;

    export import Object = internal.RealmObject;
    export import App = internal.App;
    export import Auth = internal.Auth;
    export import BSON = internal.BSON;
    export import Types = internal.Types;
    export import Services = internal.Services;

    export import index = internal.index;
    export import mapTo = internal.mapTo;
    export import kmToRadians = internal.kmToRadians;
    export import miToRadians = internal.miToRadians;

    export import AnyCollection = internal.AnyCollection;
    export import AnyDictionary = internal.AnyDictionary;
    export import AnyList = internal.AnyList;
    export import AnyRealmObject = internal.AnyRealmObject;
    export import AnyResults = internal.AnyResults;
    export import AnyUser = internal.AnyUser;
    export import ApiKey = internal.ApiKey;
    export import AppChangeCallback = internal.AppChangeCallback;
    export import AssertionError = internal.AssertionError;
    export import AppConfiguration = internal.AppConfiguration;
    export import AppServicesFunction = internal.AppServicesFunction;
    export import BaseConfiguration = internal.BaseConfiguration;
    export import BaseObjectSchema = internal.BaseObjectSchema;
    export import BaseSyncConfiguration = internal.BaseSyncConfiguration;
    export import CanonicalGeoPoint = internal.CanonicalGeoPoint;
    export import CanonicalGeoPolygon = internal.CanonicalGeoPolygon;
    export import CanonicalObjectSchema = internal.CanonicalObjectSchema;
    export import CanonicalPropertiesTypes = internal.CanonicalPropertiesTypes;
    export import CanonicalPropertySchema = internal.CanonicalPropertySchema;
    export import ClientResetAfterCallback = internal.ClientResetAfterCallback;
    export import ClientResetBeforeCallback = internal.ClientResetBeforeCallback;
    export import ClientResetConfig = internal.ClientResetConfig;
    export import ClientResetDiscardUnsyncedChangesConfiguration = internal.ClientResetDiscardUnsyncedChangesConfiguration;
    export import ClientResetFallbackCallback = internal.ClientResetFallbackCallback;
    export import ClientResetManualConfiguration = internal.ClientResetManualConfiguration;
    export import ClientResetMode = internal.ClientResetMode;
    export import ClientResetRecoverOrDiscardUnsyncedChangesConfiguration = internal.ClientResetRecoverOrDiscardUnsyncedChangesConfiguration;
    export import ClientResetRecoverUnsyncedChangesConfiguration = internal.ClientResetRecoverUnsyncedChangesConfiguration;
    export import Collection = internal.Collection;
    export import CollectionChangeCallback = internal.CollectionChangeCallback;
    export import CollectionChangeSet = internal.CollectionChangeSet;
    export import CollectionPropertyTypeName = internal.CollectionPropertyTypeName;
    export import CompensatingWriteError = internal.CompensatingWriteError;
    export import CompensatingWriteInfo = internal.CompensatingWriteInfo;
    export import Configuration = internal.Configuration;
    export import ConfigurationWithoutSync = internal.ConfigurationWithoutSync;
    export import ConfigurationWithSync = internal.ConfigurationWithSync;
    export import ConnectionNotificationCallback = internal.ConnectionNotificationCallback;
    export import ConnectionState = internal.ConnectionState;
    export import Credentials = internal.Credentials;
    export import DefaultFunctionsFactory = internal.DefaultFunctionsFactory;
    export import DefaultUserProfileData = internal.DefaultUserProfileData;
    export import Dictionary = internal.Dictionary;
    export import DictionaryChangeCallback = internal.DictionaryChangeCallback;
    export import DictionaryChangeSet = internal.DictionaryChangeSet;
    export import ErrorCallback = internal.ErrorCallback;
    export import FlexibleSyncConfiguration = internal.FlexibleSyncConfiguration;
    export import GeoBox = internal.GeoBox;
    export import GeoCircle = internal.GeoCircle;
    export import GeoPoint = internal.GeoPoint;
    export import GeoPolygon = internal.GeoPolygon;
    export import GeoPosition = internal.GeoPosition;
    export import IndexDecorator = internal.IndexDecorator;
    export import IndexedType = internal.IndexedType;
    export import InitialSubscriptions = internal.InitialSubscriptions;
    export import List = internal.List;
    export import LocalAppConfiguration = internal.LocalAppConfiguration;
    export import Logger = internal.Logger;
    export import LoggerCallback = internal.LoggerCallback;
    export import MapToDecorator = internal.MapToDecorator;
    export import Metadata = internal.Metadata;
    export import MetadataMode = internal.MetadataMode;
    export import MigrationCallback = internal.MigrationCallback;
    export import MigrationOptions = internal.MigrationOptions;
    export import Mixed = internal.Types.Mixed;
    export import MongoDB = internal.MongoDB;
    export import MongoDBService = internal.MongoDBService;
    export import NumericLogLevel = internal.NumericLogLevel;
    export import ObjectChangeCallback = internal.ObjectChangeCallback;
    export import ObjectChangeSet = internal.ObjectChangeSet;
    export import ObjectSchema = internal.ObjectSchema;
    export import ObjectType = internal.ObjectType;
    export import OpenRealmBehaviorConfiguration = internal.OpenRealmBehaviorConfiguration;
    export import OpenRealmBehaviorType = internal.OpenRealmBehaviorType;
    export import OpenRealmTimeOutBehavior = internal.OpenRealmTimeOutBehavior;
    export import OrderedCollection = internal.OrderedCollection;
    export import PartitionSyncConfiguration = internal.PartitionSyncConfiguration;
    export import PrimaryKey = internal.PrimaryKey;
    export import PrimitivePropertyTypeName = internal.PrimitivePropertyTypeName;
    export import ProgressDirection = internal.ProgressDirection;
    export import ProgressMode = internal.ProgressMode;
    export import ProgressNotificationCallback = internal.ProgressNotificationCallback;
    export import ProgressRealmPromise = internal.ProgressRealmPromise;
    export import PropertiesTypes = internal.PropertiesTypes;
    export import PropertySchema = internal.PropertySchema;
    export import PropertySchemaParseError = internal.PropertySchemaParseError;
    export import PropertySchemaShorthand = internal.PropertySchemaShorthand;
    export import PropertySchemaStrict = internal.PropertySchemaStrict;
    export import PropertyTypeName = internal.PropertyTypeName;
    export import ProviderType = internal.ProviderType;
    export import ProxyType = internal.ProxyType;
    export import RealmEvent = internal.RealmEvent;
    export import RealmEventName = internal.RealmEventName;
    export import RealmListenerCallback = internal.RealmListenerCallback;
    export import RealmObjectConstructor = internal.RealmObjectConstructor;
    export import RelationshipPropertyTypeName = internal.RelationshipPropertyTypeName;
    export import Results = internal.Results;
    export import SchemaParseError = internal.SchemaParseError;
    export import SecretApiKey = internal.SecretApiKey;
    export import SessionState = internal.SessionState;
    export import SessionStopPolicy = internal.SessionStopPolicy;
    export import Set = internal.RealmSet;
    export import SortDescriptor = internal.SortDescriptor;
    export import SSLConfiguration = internal.SSLConfiguration;
    export import SSLVerifyCallback = internal.SSLVerifyCallback;
    export import SSLVerifyObject = internal.SSLVerifyObject;
    export import SubscriptionSetState = internal.SubscriptionSetState;
    export import SyncConfiguration = internal.SyncConfiguration;
    export import SyncError = internal.SyncError;
    export import SyncProxyConfig = internal.SyncProxyConfig;
    export import TypeAssertionError = internal.TypeAssertionError;
    export import Unmanaged = internal.Unmanaged;
    export import UpdateMode = internal.UpdateMode;
    export import User = internal.User;
    export import UserChangeCallback = internal.UserChangeCallback;
    export import UserIdentity = internal.UserIdentity;
    export import UserState = internal.UserState;
    export import WaitForSync = internal.WaitForSync;
    export import WatchOptionsFilter = internal.WatchOptionsFilter;
    export import WatchOptionsIds = internal.WatchOptionsIds;

    // Deprecated exports below
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.AppServicesFunction | AppServicesFunction} */
    export import RealmFunction = internal.AppServicesFunction;
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.CanonicalPropertySchema | CanonicalPropertySchema} */
    export import CanonicalObjectSchemaProperty = internal.CanonicalPropertySchema;
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.ClientResetRecoverUnsyncedChangesConfiguration | ClientResetRecoverUnsyncedChangesConfiguration} */
    export import ClientResetRecoveryConfiguration = internal.ClientResetRecoverUnsyncedChangesConfiguration;
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.PropertySchema | PropertySchema} */
    export import ObjectSchemaProperty = internal.PropertySchema;
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.RealmObjectConstructor | RealmObjectConstructor} */
    export import ObjectClass = internal.RealmObjectConstructor;
    /** @deprecated Will be removed in v13.0.0. Please use {@link internal.PropertyTypeName | PropertyTypeName} */
    export import PropertyType = internal.PropertyTypeName;
    /** @deprecated Use the another {@link internal.ClientResetMode | ClientResetMode} than {@link internal.ClientResetMode.Manual | ClientResetMode.Manual}. */
    export import ClientResetError = internal.ClientResetError;
    /** @deprecated See https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/ */
    export import PushClient = internal.PushClient;
  }
}
