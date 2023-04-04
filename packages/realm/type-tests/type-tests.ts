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

import { Realm as Realm2 } from "../src/index";

const realm = new Realm();
const realm2: Realm = new Realm();
const realm3 = new Realm2();
const app = new Realm.App("");
const app2 = new Realm2.App("");
const realm4: Realm2 = new Realm2();
declare const options: Realm2.App.Sync.SubscriptionOptions;
declare const options2: Realm.App.Sync.SubscriptionOptions;

// Calling statics is supported
Realm.deleteFile({});

// Mixing enums is supported
declare const state1: Realm.App.Sync.SubscriptionsState;
const state2: Realm2.App.Sync.SubscriptionsState = state1;
