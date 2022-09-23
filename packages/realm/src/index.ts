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

export { UpdateMode } from "./Realm";
export type { Configuration } from "./Configuration";
export { App } from "./App";
export { Results } from "./Results";
export { Object } from "./Object";
export { List } from "./List";
export { Dictionary } from "./Dictionary";
export { Set } from "./Set";
export type { ObjectChangeSet, ObjectChangeCallback } from "./ObjectListeners";
export type { OrderedCollection, CollectionChangeSet, CollectionChangeCallback } from "./OrderedCollection";

export { BSON } from "./bson";

// Exporting default for backwards compatibility
import { Realm } from "./Realm";
export default Realm;
export { Realm };
