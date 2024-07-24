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

import * as ns from "./namespace";
import { Realm as RealmConstructor } from "./Realm";
import { safeGlobalThis } from "./safeGlobalThis";
import { flags } from "./flags";

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
    export import Realm = RealmConstructor;
    export import flags = ns.flags;

    export import Object = ns.RealmObject;
    export import App = ns.App;
    export import Auth = ns.Auth;
    export import BSON = ns.BSON;
    export import Types = ns.Types;
    export import Services = ns.Services;

    export import index = ns.index;
    export import mapTo = ns.mapTo;
    export import kmToRadians = ns.kmToRadians;
    export import miToRadians = ns.miToRadians;

    export import AnyCollection = ns.AnyCollection;
    export import AnyDictionary = ns.AnyDictionary;
    export import AnyList = ns.AnyList;
    export import AnyRealmObject = ns.AnyRealmObject;
    export import AnyResults = ns.AnyResults;
    export import AnyUser = ns.AnyUser;
    export import ApiKey = ns.ApiKey;
    export import AppChangeCallback = ns.AppChangeCallback;
    export import AssertionError = ns.AssertionError;
    export import AppConfiguration = ns.AppConfiguration;
    export import AppServicesFunction = ns.AppServicesFunction;
    export import BaseConfiguration = ns.BaseConfiguration;
    export import BaseObjectSchema = ns.BaseObjectSchema;
    export import BaseSyncConfiguration = ns.BaseSyncConfiguration;
    export import CanonicalGeoPoint = ns.CanonicalGeoPoint;
    export import CanonicalGeoPolygon = ns.CanonicalGeoPolygon;
    export import CanonicalObjectSchema = ns.CanonicalObjectSchema;
    export import CanonicalPropertiesTypes = ns.CanonicalPropertiesTypes;
    export import CanonicalPropertySchema = ns.CanonicalPropertySchema;
    export import ClientResetAfterCallback = ns.ClientResetAfterCallback;
    export import ClientResetBeforeCallback = ns.ClientResetBeforeCallback;
    export import ClientResetConfig = ns.ClientResetConfig;
    export import ClientResetDiscardUnsyncedChangesConfiguration = ns.ClientResetDiscardUnsyncedChangesConfiguration;
    export import ClientResetFallbackCallback = ns.ClientResetFallbackCallback;
    export import ClientResetManualConfiguration = ns.ClientResetManualConfiguration;
    export import ClientResetMode = ns.ClientResetMode;
    export import ClientResetRecoverOrDiscardUnsyncedChangesConfiguration = ns.ClientResetRecoverOrDiscardUnsyncedChangesConfiguration;
    export import ClientResetRecoverUnsyncedChangesConfiguration = ns.ClientResetRecoverUnsyncedChangesConfiguration;
    export import Collection = ns.Collection;
    export import CollectionChangeCallback = ns.CollectionChangeCallback;
    export import CollectionChangeSet = ns.CollectionChangeSet;
    export import CollectionPropertyTypeName = ns.CollectionPropertyTypeName;
    export import CompensatingWriteError = ns.CompensatingWriteError;
    export import CompensatingWriteInfo = ns.CompensatingWriteInfo;
    export import Configuration = ns.Configuration;
    export import ConfigurationWithoutSync = ns.ConfigurationWithoutSync;
    export import ConfigurationWithSync = ns.ConfigurationWithSync;
    export import ConnectionNotificationCallback = ns.ConnectionNotificationCallback;
    export import ConnectionState = ns.ConnectionState;
    export import Credentials = ns.Credentials;
    export import DefaultFunctionsFactory = ns.DefaultFunctionsFactory;
    export import DefaultUserProfileData = ns.DefaultUserProfileData;
    export import Dictionary = ns.Dictionary;
    export import DictionaryChangeCallback = ns.DictionaryChangeCallback;
    export import DictionaryChangeSet = ns.DictionaryChangeSet;
    export import ErrorCallback = ns.ErrorCallback;
    export import FlexibleSyncConfiguration = ns.FlexibleSyncConfiguration;
    export import GeoBox = ns.GeoBox;
    export import GeoCircle = ns.GeoCircle;
    export import GeoPoint = ns.GeoPoint;
    export import GeoPolygon = ns.GeoPolygon;
    export import GeoPosition = ns.GeoPosition;
    export import IndexDecorator = ns.IndexDecorator;
    export import IndexedType = ns.IndexedType;
    export import InitialSubscriptions = ns.InitialSubscriptions;
    export import List = ns.List;
    export import LocalAppConfiguration = ns.LocalAppConfiguration;
    export import Logger = ns.Logger;
    export import LoggerCallback = ns.LoggerCallback;
    export import MapToDecorator = ns.MapToDecorator;
    export import Metadata = ns.Metadata;
    export import MetadataMode = ns.MetadataMode;
    export import MigrationCallback = ns.MigrationCallback;
    export import MigrationOptions = ns.MigrationOptions;
    export import Mixed = ns.Types.Mixed;
    export import MongoDB = ns.MongoDB;
    export import MongoDBService = ns.MongoDBService;
    export import NumericLogLevel = ns.NumericLogLevel;
    export import ObjectChangeCallback = ns.ObjectChangeCallback;
    export import ObjectChangeSet = ns.ObjectChangeSet;
    export import ObjectSchema = ns.ObjectSchema;
    export import ObjectType = ns.ObjectType;
    export import OpenRealmBehaviorConfiguration = ns.OpenRealmBehaviorConfiguration;
    export import OpenRealmBehaviorType = ns.OpenRealmBehaviorType;
    export import OpenRealmTimeOutBehavior = ns.OpenRealmTimeOutBehavior;
    export import OrderedCollection = ns.OrderedCollection;
    export import PartitionSyncConfiguration = ns.PartitionSyncConfiguration;
    export import PrimaryKey = ns.PrimaryKey;
    export import PrimitivePropertyTypeName = ns.PrimitivePropertyTypeName;
    export import ProgressDirection = ns.ProgressDirection;
    export import ProgressMode = ns.ProgressMode;
    export import ProgressNotificationCallback = ns.ProgressNotificationCallback;
    export import ProgressRealmPromise = ns.ProgressRealmPromise;
    export import PropertiesTypes = ns.PropertiesTypes;
    export import PropertySchema = ns.PropertySchema;
    export import PropertySchemaParseError = ns.PropertySchemaParseError;
    export import PropertySchemaShorthand = ns.PropertySchemaShorthand;
    export import PropertySchemaStrict = ns.PropertySchemaStrict;
    export import PropertyTypeName = ns.PropertyTypeName;
    export import ProviderType = ns.ProviderType;
    export import ProxyType = ns.ProxyType;
    export import RealmEvent = ns.RealmEvent;
    export import RealmEventName = ns.RealmEventName;
    export import RealmListenerCallback = ns.RealmListenerCallback;
    export import RealmObjectConstructor = ns.RealmObjectConstructor;
    export import RelationshipPropertyTypeName = ns.RelationshipPropertyTypeName;
    export import Results = ns.Results;
    export import SchemaParseError = ns.SchemaParseError;
    export import SecretApiKey = ns.SecretApiKey;
    export import SessionState = ns.SessionState;
    export import SessionStopPolicy = ns.SessionStopPolicy;
    export import Set = ns.RealmSet;
    export import SortDescriptor = ns.SortDescriptor;
    export import SSLConfiguration = ns.SSLConfiguration;
    export import SSLVerifyCallback = ns.SSLVerifyCallback;
    export import SSLVerifyObject = ns.SSLVerifyObject;
    export import SubscriptionSetState = ns.SubscriptionSetState;
    export import SyncConfiguration = ns.SyncConfiguration;
    export import SyncError = ns.SyncError;
    export import SyncProxyConfig = ns.SyncProxyConfig;
    export import TypeAssertionError = ns.TypeAssertionError;
    export import Unmanaged = ns.Unmanaged;
    export import UpdateMode = ns.UpdateMode;
    export import User = ns.User;
    export import UserChangeCallback = ns.UserChangeCallback;
    export import UserIdentity = ns.UserIdentity;
    export import UserState = ns.UserState;
    export import WaitForSync = ns.WaitForSync;
    export import WatchOptionsFilter = ns.WatchOptionsFilter;
    export import WatchOptionsIds = ns.WatchOptionsIds;

    // Deprecated exports below
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.AppServicesFunction | AppServicesFunction} */
    export import RealmFunction = ns.AppServicesFunction;
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.CanonicalPropertySchema | CanonicalPropertySchema} */
    export import CanonicalObjectSchemaProperty = ns.CanonicalPropertySchema;
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.ClientResetRecoverUnsyncedChangesConfiguration | ClientResetRecoverUnsyncedChangesConfiguration} */
    export import ClientResetRecoveryConfiguration = ns.ClientResetRecoverUnsyncedChangesConfiguration;
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.PropertySchema | PropertySchema} */
    export import ObjectSchemaProperty = ns.PropertySchema;
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.RealmObjectConstructor | RealmObjectConstructor} */
    export import ObjectClass = ns.RealmObjectConstructor;
    /** @deprecated Will be removed in v13.0.0. Please use {@link ns.PropertyTypeName | PropertyTypeName} */
    export import PropertyType = ns.PropertyTypeName;
    /** @deprecated Use the another {@link ns.ClientResetMode | ClientResetMode} than {@link ns.ClientResetMode.Manual | ClientResetMode.Manual}. */
    export import ClientResetError = ns.ClientResetError;
    /** @deprecated See https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/ */
    export import PushClient = ns.PushClient;
  }
}
