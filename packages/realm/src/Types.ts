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

import { BSON, Dictionary, List, RealmSet, Results } from "./internal";

const RealmDictionary = Dictionary;
type RealmDictionary<T> = Dictionary<T>;

const RealmList = List;
type RealmList<T> = List<T>;

const RealmResults = Results;
type RealmResults<T> = Results<T>;

const GlobalDate = Date;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Types {
  export type Bool = boolean;
  export type String = string;
  export type Int = number;
  export type Float = number;
  export type Double = number;

  export type Decimal128 = BSON.Decimal128;
  export const Decimal128 = BSON.Decimal128;

  export type ObjectId = BSON.ObjectId;
  export const ObjectId = BSON.ObjectId;

  export type UUID = BSON.UUID;
  export const UUID = BSON.UUID;

  export type Date = typeof GlobalDate;
  export const Date = GlobalDate;

  export type Data = ArrayBuffer;
  export const Data = ArrayBuffer;

  export type List<T> = RealmList<T>;
  export const List: typeof RealmList = RealmList;
  export type Set<T> = RealmSet<T>;
  export const Set: typeof RealmSet = RealmSet;
  export type Dictionary<T> = RealmDictionary<T>;
  export const Dictionary: typeof RealmDictionary = RealmDictionary;
  export type Mixed = unknown;
  export type LinkingObjects<ObjectTypeT, LinkingPropertyName> = RealmResults<ObjectTypeT>;
  export const LinkingObjects: typeof RealmResults = RealmResults;
}
