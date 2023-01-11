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

// Following [the internal module pattern](https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de)

/** @internal */
export * from "./debug";

/** @internal */
export * from "./platform";

/** @internal */
export * as binding from "./binding";
export * from "./flags";
export * from "./bson";
export * from "./errors";
/** @internal */
export * from "./assert";
/** @internal */
export * from "./ranges";
/** @internal */
export * from "./Listeners";
/** @internal */
export * from "./JSONCacheMap";
/** @internal */
export * from "./TimeoutPromise";

/** @internal */
export * from "./PropertyHelpers";
/** @internal */
export * from "./PropertyMap";
/** @internal */
export * from "./ClassHelpers";
/** @internal */
export * from "./ClassMap";
/** @internal */
export * from "./TypeHelpers";

export * from "./PromiseHandle";

export * from "./Object";
export * from "./ObjectListeners";

export * from "./Collection";
export * from "./OrderedCollection";
export * from "./Results";
export * from "./List";
export * from "./Set";
export * from "./Dictionary";

export * from "./Types";

export * from "./app-services/SyncConfiguration";
export * from "./app-services/Credentials";
export * from "./app-services/User";
export * from "./app-services/NetworkTransport";
export * from "./app-services/SyncSession";
export * from "./app-services/ApiKeyAuthClient";
export * from "./app-services/EmailPasswordAuthClient";
export * from "./app-services/PushClient";
export * from "./app-services/MongoClient";
export * from "./app-services/FunctionsFactory";
export * from "./app-services/UserProfile";
export * from "./app-services/Sync";
export * from "./app-services/App";
export * from "./app-services/BaseSubscriptionSet";
export * from "./app-services/MutableSubscriptionSet";
export * from "./app-services/SubscriptionSet";
export * from "./app-services/Subscription";

export * from "./Realm";
export * from "./RealmListeners";
export * from "./Configuration";
export * from "./ProgressRealmPromise";

export * from "./InsertionModel";
export * from "./schema";
