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

// export { ObjectId, Decimal128, UUID } from "bson";
import * as bson from "bson";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BSON {
  export const ObjectId = bson.ObjectId;
  export type ObjectId = bson.ObjectId;
  export const Decimal128 = bson.Decimal128;
  export type Decimal128 = bson.Decimal128;
  export const UUID = bson.UUID;
  export type UUID = bson.UUID;
}
