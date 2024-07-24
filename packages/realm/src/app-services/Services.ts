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

import * as MongoDBNS from "./MongoDB";
import * as MongoDBCollectionNS from "./MongoDBCollection";
import * as PushClientNS from "./PushClient";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Services {
  export import MongoDB = MongoDBNS.MongoDB;
  export import MongoDBDatabase = MongoDBCollectionNS.MongoDBDatabase;
  /** @deprecated Please read {@link https://www.mongodb.com/docs/atlas/app-services/reference/push-notifications/} */
  export type Push = PushClientNS.PushClient;
}
