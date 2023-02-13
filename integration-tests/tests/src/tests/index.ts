////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import chaiAsPromised from "chai-as-promised";
import chai from "chai";

chai.use(chaiAsPromised);

import "./alias";
import "./mixed";
import "./array-buffer";
import "./realm-constructor";
import "./objects";
import "./sets";
import "./class-models";
import "./serialization";
import "./iterators";
import "./results";
import "./notifications";
import "./migrations";
import "./queries";
import "./dynamic-schema-updates";
import "./bson";
import "./dictionary";
import "./list";
import "./credentials/anonymous";
import "./linking-objects";
import "./sync/open";
import "./sync/mixed";
import "./sync/flexible";
import "./sync/asymmetric";
import "./sync/sync-as-local";
import "./sync/encryption";
import "./sync/app";
import "./sync/user";
import "./sync/dictionary";
import "./sync/uuid";
import "./sync/set";
import "./sync/realm";
import "./transaction";
import "./schema";
import "./types";
import "./sync/client-reset";
import "./sync/open-behavior";
